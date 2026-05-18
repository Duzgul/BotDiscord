import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
  Role,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType,
  Guild,
  MessageFlags,
  PermissionOverwriteOptions,
} from 'discord.js';
import { ROLES_CONFIG, ROLE_HIERARCHY, SELF_ASSIGNABLE_HIERARCHY } from '../config/roles';
import {
  SELF_ASSIGNABLE_CATEGORIES,
  SELF_ASSIGNABLE_PERMISSIONS,
  HIERARCHICAL_ROLE_NAMES,
} from '../config/selfAssignable';
import { WELCOME_CONFIG } from '../config/welcome';
import { saveReactionMessages } from '../utils/warnings';
import { createMemberCountChannel } from './memberCount';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function findRoleByName(guild: Guild, name: string, emoji: string): Role | undefined {
  const displayName = `${emoji} ${name}`;
  return guild.roles.cache.find((r) => r.name === displayName || r.name === name);
}

export async function handleSetup(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: 'Solo los administradores pueden usar este comando.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply('Este comando solo funciona en servidores.');
    return;
  }

  await guild.members.fetch();
  const botMember = guild.members.me!;
  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.editReply('El bot no tiene permiso **Gestionar Roles**.');
    return;
  }
  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.editReply('El bot no tiene permiso **Gestionar Canales**.');
    return;
  }

  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(msg);
  };

  try {
    // ========================================
    // PASO 1: Crear/actualizar roles jerárquicos
    // ========================================
    log('**[1/9] Creando/actualizando roles jerárquicos...**');
    const createdRoles = new Map<string, Role>();

    for (const roleConfig of ROLES_CONFIG) {
      const displayName = `${roleConfig.emoji} ${roleConfig.name}`;
      const existingRole = findRoleByName(guild, roleConfig.name, roleConfig.emoji);

      if (existingRole) {
        log(`♻️ Actualizando: **${displayName}**`);
        await existingRole.edit({
          name: displayName,
          colors: { primaryColor: roleConfig.color },
          permissions: roleConfig.permissions,
          hoist: roleConfig.hoist,
          mentionable: roleConfig.mentionable,
          reason: 'Actualización automática (Fortaleza Bot)',
        });
        createdRoles.set(roleConfig.name, existingRole);
      } else {
        log(`✨ Creando: **${displayName}**`);
        const newRole = await guild.roles.create({
          name: displayName,
          colors: { primaryColor: roleConfig.color },
          permissions: roleConfig.permissions,
          hoist: roleConfig.hoist,
          mentionable: roleConfig.mentionable,
          reason: 'Creación automática (Fortaleza Bot)',
        });
        createdRoles.set(roleConfig.name, newRole);
      }
      await delay(500);
    }
    log(`✅ ${createdRoles.size} roles jerárquicos procesados`);

    // ========================================
    // PASO 2: Crear roles autoelegibles + Novato
    // ========================================
    log('\n**[2/9] Creando roles autoelegibles...**');
    let newRolesCount = 0;

    for (const category of SELF_ASSIGNABLE_CATEGORIES) {
      for (const roleConfig of category.roles) {
        const displayName = `${roleConfig.emoji} ${roleConfig.name}`;

        if (HIERARCHICAL_ROLE_NAMES.includes(roleConfig.name)) {
          const existingRole = findRoleByName(guild, roleConfig.name, roleConfig.emoji);
          if (existingRole) {
            await existingRole.edit({
              name: displayName,
              reason: 'Actualización automática (Fortaleza Bot)',
            });
            createdRoles.set(roleConfig.name, existingRole);
            log(`♻️ Actualizado (jerárquico): **${displayName}**`);
          }
          continue;
        }

        const existingRole = findRoleByName(guild, roleConfig.name, roleConfig.emoji);

        if (existingRole) {
          await existingRole.edit({
            name: displayName,
            reason: `Actualización autoelegible (Fortaleza Bot)`,
          });
          createdRoles.set(roleConfig.name, existingRole);
          log(`♻️ Actualizado: **${displayName}**`);
        } else {
          log(`✨ Creando: **${displayName}**`);
          const newRole = await guild.roles.create({
            name: displayName,
            colors: { primaryColor: roleConfig.color },
            permissions: SELF_ASSIGNABLE_PERMISSIONS,
            hoist: false,
            mentionable: roleConfig.mentionable,
            reason: `Creación autoelegible - ${category.name} (Fortaleza Bot)`,
          });
          createdRoles.set(roleConfig.name, newRole);
          newRolesCount++;
        }
        await delay(500);
      }
    }
    log(`✅ ${newRolesCount} roles autoelegibles nuevos creados`);

    // ========================================
    // PASO 3: Configurar jerarquía
    // ========================================
    log('\n**[3/9] Configurando jerarquía de roles...**');

    await guild.roles.fetch();
    const botHighestPos = botMember.roles.highest.position;

    const allExistingBelow = guild.roles.cache
      .filter(
        (r) =>
          r.id !== guild.id &&
          !SELF_ASSIGNABLE_HIERARCHY.includes(r.name) &&
          !SELF_ASSIGNABLE_HIERARCHY.some((name) => {
            const allConfigs = [...ROLES_CONFIG, ...SELF_ASSIGNABLE_CATEGORIES.flatMap((c) => c.roles)];
            const cfg = allConfigs.find((rc) => rc.name === name);
            return cfg && r.name === `${cfg.emoji} ${cfg.name}`;
          }) &&
          r.position < botHighestPos
      )
      .sort((a, b) => b.position - a.position);

    const positionUpdates: { role: string; position: number }[] = [];
    let currentPos = botHighestPos - 1;

    for (const name of SELF_ASSIGNABLE_HIERARCHY) {
      const role = createdRoles.get(name);
      if (role) {
        positionUpdates.push({ role: role.id, position: currentPos });
        currentPos--;
      }
    }

    for (const r of allExistingBelow.values()) {
      if (currentPos > 0) {
        positionUpdates.push({ role: r.id, position: currentPos });
        currentPos--;
      }
    }

    try {
      await guild.roles.setPositions(positionUpdates);
      log('✅ Jerarquía configurada correctamente');
    } catch (err: any) {
      log(`⚠️ No se pudo configurar la jerarquía: ${err.message}`);
      log('💡 Asegúrate de que el rol del bot esté POR ENCIMA de todos los roles.');
    }

    // ========================================
    // PASO 4: Canales (#bienvenida, #logs, permisos)
    // ========================================
    log('\n**[4/9] Configurando canales...**');

    // --- #bienvenida ---
    let bienvenidaChannel = guild.channels.cache.find(
      (c) => c.name === WELCOME_CONFIG.channelName && c.type === ChannelType.GuildText
    ) as TextChannel | undefined;

    if (!bienvenidaChannel) {
      log('📝 Creando canal #bienvenida...');
      bienvenidaChannel = await guild.channels.create({
        name: WELCOME_CONFIG.channelName,
        type: ChannelType.GuildText,
        topic: '🏰 Bienvenidas y despedidas de La Fortaleza de Duzgul',
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.SendMessages],
          },
          {
            id: botMember.roles.highest.id,
            allow: [
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.AttachFiles,
            ],
          },
        ],
        reason: 'Canal de bienvenida (Fortaleza Bot)',
      });
      log('  ✅ Canal #bienvenida creado');
    } else {
      log('♻️ Canal #bienvenida ya existe');
    }

    // --- #logs ---
    let logsChannel = guild.channels.cache.find(
      (c) => c.name === 'logs' && c.type === ChannelType.GuildText
    ) as TextChannel | undefined;

    if (!logsChannel) {
      log('📝 Creando canal #logs...');
      const adminRoles = ROLES_CONFIG.filter(
        (r) =>
          r.type === 'normal' &&
          r.permissions.some(
            (p) =>
              p === PermissionFlagsBits.Administrator ||
              p === PermissionFlagsBits.ManageGuild ||
              p === PermissionFlagsBits.BanMembers
          )
      );

      const logOverwrites: { id: string; allow?: bigint[]; deny?: bigint[] }[] = [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: botMember.roles.highest.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
      ];

      for (const adminRoleConfig of adminRoles) {
        const role = createdRoles.get(adminRoleConfig.name);
        if (role) {
          logOverwrites.push({
            id: role.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
          });
        }
      }

      logsChannel = await guild.channels.create({
        name: 'logs',
        type: ChannelType.GuildText,
        topic: '📋 Registro de acciones del servidor',
        permissionOverwrites: logOverwrites as any,
        reason: 'Canal de logs (Fortaleza Bot)',
      });
      log('  ✅ Canal #logs creado');
    } else {
      log('♻️ Canal #logs ya existe');
    }

    // --- Silenciado en canales ---
    const silenciadoRole = createdRoles.get('Silenciado');
    if (silenciadoRole) {
      log('🔇 Configurando **Silenciado** en canales...');
      const channels = guild.channels.cache.filter(
        (c) =>
          c.type === ChannelType.GuildText ||
          c.type === ChannelType.GuildVoice ||
          c.type === ChannelType.GuildAnnouncement ||
          c.type === ChannelType.GuildStageVoice ||
          c.type === ChannelType.GuildCategory
      );
      let channelCount = 0;
      for (const channel of channels.values()) {
        if ('permissionOverwrites' in channel) {
          if (channel.name === 'apelaciones') continue;
          try {
            await channel.permissionOverwrites.create(
              silenciadoRole.id,
              { SendMessages: false, Speak: false, AddReactions: false },
              { reason: 'Silencio automático (Fortaleza Bot)' }
            );
            channelCount++;
            await delay(200);
          } catch (err: any) {
            log(`  ⚠️ No se pudo configurar en #${channel.name}: ${err.message}`);
          }
        }
      }
      log(`  ✅ Silenciado configurado en ${channelCount} canales`);
    }

    // --- Prisionero en canales ---
    const prisioneroRole = createdRoles.get('Prisionero de la Fortaleza');
    if (prisioneroRole) {
      log('⛓️ Configurando **Prisionero de la Fortaleza** en canales...');
      const channels = guild.channels.cache.filter(
        (c) =>
          c.type === ChannelType.GuildText ||
          c.type === ChannelType.GuildVoice ||
          c.type === ChannelType.GuildAnnouncement ||
          c.type === ChannelType.GuildStageVoice ||
          c.type === ChannelType.GuildCategory
      );
      let channelCount = 0;
      for (const channel of channels.values()) {
        if ('permissionOverwrites' in channel) {
          if (channel.name === 'apelaciones') continue;
          try {
            await channel.permissionOverwrites.create(
              prisioneroRole.id,
              { ViewChannel: false },
              { reason: 'Restricción automática (Fortaleza Bot)' }
            );
            channelCount++;
            await delay(200);
          } catch (err: any) {
            log(`  ⚠️ No se pudo configurar en #${channel.name}: ${err.message}`);
          }
        }
      }
      log(`  ✅ Prisionero restringido en ${channelCount} canales`);

      log('📋 Configurando canal de apelaciones...');
      await setupApelacionesChannel(guild, prisioneroRole, createdRoles, botMember, log);
    }

    // ========================================
    // PASO 7: Publicar menús de roles autoelegibles
    // ========================================
    log('\n**[7/9] Publicando menús de roles autoelegibles...**');

    let rolesChannel = guild.channels.cache.find(
      (c) => c.name.toLowerCase() === 'roles' && c.type === ChannelType.GuildText
    ) as TextChannel | undefined;

    if (!rolesChannel) {
      log('📝 Creando canal #roles...');
      rolesChannel = await guild.channels.create({
        name: 'roles',
        type: ChannelType.GuildText,
        topic: '🎭 Elige tus roles aquí. Selecciona los que te interesen.',
        reason: 'Canal de roles autoelegibles (Fortaleza Bot)',
      });
    }

    await rolesChannel.bulkDelete(50, true).catch(() => {});

    const rolesMention = `<#${rolesChannel.id}>`;

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🏰 La Fortaleza de Duzgul — Roles Autoelegibles')
      .setDescription(
        '¡Bienvenido! Selecciona los roles que te interesen usando los menús de abajo.\n\n' +
          '• **🎭 Intereses**: Roles para encontrar personas con gustos similares\n' +
          '• **🔔 Notificaciones**: Roles para recibir avisos específicos\n' +
          '• **🆕 Estado**: Roles que se asignan automáticamente\n\n' +
          'Puedes cambiar tus roles en cualquier momento usando los menús de abajo.'
      )
      .setFooter({ text: 'Fortaleza Bot — Usa los menús desplegables para elegir tus roles' });

    await rolesChannel.send({ embeds: [welcomeEmbed] });

    for (const category of SELF_ASSIGNABLE_CATEGORIES) {
      const categoryEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${category.emoji} ${category.name}`)
        .setDescription(category.description);

      const roleListLines = category.roles.map(
        (r) => `${r.emoji} **${r.name}** — ${r.description}`
      );
      categoryEmbed.addFields({
        name: 'Roles disponibles',
        value: roleListLines.join('\n'),
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`selfassign_${category.id}`)
        .setPlaceholder(`Selecciona tus ${category.name.toLowerCase()}...`)
        .setMinValues(0)
        .setMaxValues(category.roles.length)
        .addOptions(
          category.roles.map((role) => ({
            label: role.name,
            description: role.description,
            value: role.name,
            emoji: role.emoji,
          }))
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

      await rolesChannel.send({
        embeds: [categoryEmbed],
        components: [row],
      });
      await delay(500);
    }

    // Reaction roles for notifications
    const notifCategory = SELF_ASSIGNABLE_CATEGORIES.find((c) => c.id === 'notifications');
    const reactionEmojiMap: Record<string, string> = {};

    if (notifCategory) {
      const reactionEmbed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('🔔 Roles de Notificaciones — Reacciona para recibir avisos')
        .setDescription(
          'Reacciona con el emoji correspondiente para recibir notificaciones. Quita la reacción para dejar de recibirlas.\n\n' +
            notifCategory.roles.map((r) => `${r.emoji} = ${r.name}`).join('\n')
        );

      const reactionMsg = await rolesChannel.send({ embeds: [reactionEmbed] });

      for (const roleConfig of notifCategory.roles) {
        await reactionMsg.react(roleConfig.emoji).catch(() => {});
        reactionEmojiMap[roleConfig.emoji] = `📢 ${roleConfig.name}`;
        await delay(300);
      }

      saveReactionMessages([
        {
          guildId: guild.id,
          channelId: reactionMsg.channel.id,
          messageId: reactionMsg.id,
          emojiRoleMap: reactionEmojiMap,
        },
      ]);
      log('  ✅ Mensaje de reacciones para notificaciones publicado');
    }

    log('✅ Menús de roles publicados en #' + rolesChannel.name);

    // ========================================
    // PASO 5: Canales adicionales (#sugerencias, tickets, member count)
    // ========================================
    log('\n**[5/9] Configurando canales adicionales...**');

    // #sugerencias
    let sugerenciasChannel = guild.channels.cache.find(
      (c) => c.name === 'sugerencias' && c.type === ChannelType.GuildText
    ) as TextChannel | undefined;

    if (!sugerenciasChannel) {
      log('📝 Creando canal #sugerencias...');
      sugerenciasChannel = await guild.channels.create({
        name: 'sugerencias',
        type: ChannelType.GuildText,
        topic: '💡 Comparte tus sugerencias y vota las de otros',
        reason: 'Canal de sugerencias (Fortaleza Bot)',
      });
      log('  ✅ Canal #sugerencias creado');
    } else {
      log('♻️ Canal #sugerencias ya existe');
    }

    // Tickets category
    const ticketsCat = guild.channels.cache.find(
      (c) => c.name.toLowerCase() === 'tickets' && c.type === ChannelType.GuildCategory
    );
    if (!ticketsCat) {
      log('📝 Creando categoría Tickets...');
      await guild.channels.create({
        name: 'Tickets',
        type: ChannelType.GuildCategory,
        reason: 'Categoría para tickets de soporte (Fortaleza Bot)',
      });
      log('  ✅ Categoría Tickets creada');
    } else {
      log('♻️ Categoría Tickets ya existe');
    }

    // Member count channel
    log('📊 Configurando contador de miembros...');
    const memberCountResult = await createMemberCountChannel(guild);
    log(`  ${memberCountResult}`);

    // ========================================
    // PASO 5b: Categoría Contenidos (#cumpleaños, #música)
    // ========================================
    log('\n**[5b/9] Configurando categoría Contenidos...**');

    let contenidosCat = guild.channels.cache.find(
      (c) => c.name.toLowerCase() === 'contenidos' && c.type === ChannelType.GuildCategory
    );

    if (!contenidosCat) {
      log('📝 Creando categoría Contenidos...');
      contenidosCat = await guild.channels.create({
        name: 'Contenidos',
        type: ChannelType.GuildCategory,
        reason: 'Categoría para canales de contenido (Fortaleza Bot)',
      });
      log('  ✅ Categoría Contenidos creada');
    } else {
      log('♻️ Categoría Contenidos ya existe');
    }

    // #cumpleaños
    let cumpleanosChannel = guild.channels.cache.find(
      (c) => c.name === 'cumpleaños' && c.type === ChannelType.GuildText
    ) as TextChannel | undefined;

    if (!cumpleanosChannel) {
      log('📝 Creando canal #cumpleaños...');
      cumpleanosChannel = await guild.channels.create({
        name: 'cumpleaños',
        type: ChannelType.GuildText,
        topic: '🎂 Registra tu cumpleaños y recibe felicitaciones',
        parent: contenidosCat.id,
        reason: 'Canal de cumpleaños (Fortaleza Bot)',
      });
      log('  ✅ Canal #cumpleaños creado');
    } else {
      log('♻️ Canal #cumpleaños ya existe');
      if (contenidosCat && cumpleanosChannel.parentId !== contenidosCat.id) {
        await cumpleanosChannel.setParent(contenidosCat.id, { reason: 'Movido a categoría Contenidos (Fortaleza Bot)' }).catch(() => {});
      }
    }

    // Pinned help message in #cumpleaños
    const existingPinned = await cumpleanosChannel.messages.fetchPinned().catch(() => null);
    const hasBirthdayInfo = existingPinned?.some(m => m.author.id === guild.client.user?.id && m.content.includes('cumpleaños-registrar'));

    if (!hasBirthdayInfo) {
      const birthdayInfoEmbed = new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle('🎂 Comandos de Cumpleaños — La Fortaleza de Duzgul')
        .setDescription(
          '¡Registra tu cumpleaños para recibir una felicitación especial ese día!\n\n' +
          'A continuación, los comandos disponibles:'
        )
        .addFields(
          {
            name: '📝 `/cumpleaños-registrar`',
            value: 'Registra tu fecha de cumpleaños. Recibes día y mes como parámetros.\nEjemplo: `/cumpleaños-registrar dia:15 mes:6` para el 15 de junio.',
            inline: false,
          },
          {
            name: '🔍 `/cumpleaños-ver`',
            value: 'Consulta el cumpleaños de un usuario (o el tuyo si no especificas).\nEjemplo: `/cumpleaños-ver usuario:@alguien`',
            inline: false,
          },
          {
            name: '📋 `/cumpleaños-listar`',
            value: 'Lista todos los cumpleaños registrados. Puedes filtrar por mes.\nEjemplo: `/cumpleaños-listar mes:6`',
            inline: false,
          },
          {
            name: '❌ `/cumpleaños-eliminar`',
            value: 'Elimina tu cumpleaños registrado.',
            inline: false,
          }
        )
        .setFooter({ text: 'Las felicitaciones se publican automáticamente en este canal el día del cumpleaños.' });

      const birthdayMsg = await cumpleanosChannel.send({ embeds: [birthdayInfoEmbed] });
      await birthdayMsg.pin().catch(() => {});
      log('  📌 Mensaje de ayuda de cumpleaños fijado');
    }

    // #música
    let musicaChannel = guild.channels.cache.find(
      (c) => c.name === 'música' && c.type === ChannelType.GuildText
    ) as TextChannel | undefined;

    if (!musicaChannel) {
      log('📝 Creando canal #música...');
      musicaChannel = await guild.channels.create({
        name: 'música',
        type: ChannelType.GuildText,
        topic: '🎵 Música del bot — Usa /música reproducir para escuchar',
        parent: contenidosCat.id,
        reason: 'Canal de música (Fortaleza Bot)',
      });
      log('  ✅ Canal #música creado');
    } else {
      log('♻️ Canal #música ya existe');
      if (contenidosCat && musicaChannel.parentId !== contenidosCat.id) {
        await musicaChannel.setParent(contenidosCat.id, { reason: 'Movido a categoría Contenidos (Fortaleza Bot)' }).catch(() => {});
      }
    }

    // Pinned help message in #música
    const existingMusicPinned = await musicaChannel.messages.fetchPinned().catch(() => null);
    const hasMusicInfo = existingMusicPinned?.some(m => m.author.id === guild.client.user?.id && m.content.includes('música'));

    if (!hasMusicInfo) {
      const musicInfoEmbed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🎵 Comandos de Música — La Fortaleza de Duzgul')
        .setDescription(
          '¡Escucha música en tu canal de voz! Los mensajes de reproducción se publican aquí.\n\n' +
          'A continuación, los comandos disponibles:'
        )
        .addFields(
          {
            name: '🎶 `/música reproducir`',
            value: 'Reproduce una canción de YouTube usando su nombre o URL.\nEjemplo: `/música reproducir canción:Never Gonna Give You Up`\nDebes estar en un canal de voz para usar este comando.',
            inline: false,
          },
          {
            name: '⏹️ `/música detener`',
            value: 'Detiene la reproducción, limpia la cola y desconecta al bot del canal de voz.',
            inline: false,
          },
          {
            name: '⏭️ `/música saltar`',
            value: 'Salta a la siguiente canción en la cola.',
            inline: false,
          },
          {
            name: '⏸️ `/música pausar`',
            value: 'Pausa la canción actual.',
            inline: false,
          },
          {
            name: '▶️ `/música reanudar`',
            value: 'Reanuda la canción pausada.',
            inline: false,
          },
          {
            name: '📋 `/música cola`',
            value: 'Muestra la cola de reproducción actual y la canción en curso.',
            inline: false,
          }
        )
        .setFooter({ text: 'Los mensajes de "Ahora suena" se publican en este canal.' });

      const musicMsg = await musicaChannel.send({ embeds: [musicInfoEmbed] });
      await musicMsg.pin().catch(() => {});
      log('  📌 Mensaje de ayuda de música fijado');
    }

    log('✅ Categoría Contenidos configurada (#cumpleaños, #música)');

    // ========================================
    // PASO 6: Verificación final
    // ========================================
    log('\n**[6/9] Verificación...**');

    await guild.roles.fetch();
    for (const name of SELF_ASSIGNABLE_HIERARCHY) {
      const role = createdRoles.get(name);
      if (role) {
        const freshRole = guild.roles.cache.get(role.id);
        const allConfigs = [...ROLES_CONFIG, ...SELF_ASSIGNABLE_CATEGORIES.flatMap((c) => c.roles)];
        const cfg = allConfigs.find((rc) => rc.name === name);
        const displayStr = cfg ? `${cfg.emoji} ${name}` : name;
        if (freshRole) {
          log(`  ${displayStr} → posición ${freshRole.position}`);
        }
      }
    }

    // ========================================
    // PASO 8: Resumen final
    // ========================================
    log('\n**[9/9] Resumen**');
    log(`- ${createdRoles.size} roles procesados`);
    log('- Jerarquía configurada');
    log('- Permisos de canales configurados (Silenciado/Prisionero)');
    log('- Canal #apelaciones configurado');
log('- Canal #bienvenida configurado');
    log('- Canal #logs configurado (solo admins)');
    log('- Canal #sugerencias configurado');
    log('- Categoría Tickets configurada');
    log('- Contador de miembros configurado');
    log('- Canal #cumpleaños configurado (con instrucciones)');
    log('- Canal #música configurado (con instrucciones)');
    log('- Categoría Contenidos configurada');
    log(`- Canal #${rolesChannel.name}: menús autoelegibles + reacciones`);
    log('- Reacciones para notificaciones configuradas');

    await interaction.editReply({
      content:
        '✅ **Configuración completada**\n\n' +
        `- Roles jerárquicos: creados/actualizados\n` +
        `- Roles autoelegibles: creados\n` +
        `- 🆕 Novato: auto-asignado a nuevos miembros\n` +
        `- Jerarquía: configurada\n` +
        `- Silenciado/Prisionero: permisos configurados\n` +
        `- Canal #apelaciones: configurado\n` +
        `- Canal #bienvenida: configurado\n` +
        `- Canal #logs: configurado (solo admins)\n` +
        `- Canal #sugerencias: configurado\n` +
        `- Categoría Tickets: configurada\n` +
        `- Contador de miembros: configurado\n` +
        `- Canal #cumpleaños: configurado (con instrucciones)\n` +
        `- Canal #música: configurado (con instrucciones)\n` +
        `- Categoría Contenidos: configurada\n` +
        `- Canal #${rolesChannel.name}: menús + reacciones\n\n` +
        `Los usuarios pueden elegir sus roles en #${rolesChannel.name}.\n` +
        `Los nuevos miembros recibirán automáticamente el rol 🆕 Novato y un mensaje de bienvenida en #bienvenida.\n` +
        `Los usuarios pueden crear tickets de soporte con /ticket crear.\n` +
        `Las sugerencias se publican en #sugerencias con /sugerir.\n` +
        `Usa /música reproducir para escuchar música (debes estar en un canal de voz).\n` +
        `Los cumpleaños se registran con /cumpleaños-registrar y se felicitan en #cumpleaños.`,
    });
  } catch (error) {
    console.error('Error durante setup:', error);
    await interaction.editReply(
      `❌ Ocurrió un error durante la configuración:\n\`\`\`${error}\`\`\``
    );
  }
}

async function setupApelacionesChannel(
  guild: Guild,
  prisioneroRole: Role,
  createdRoles: Map<string, Role>,
  botMember: any,
  log: (msg: string) => void
) {
  let apelacionesChannel = guild.channels.cache.find(
    (c) => c.name === 'apelaciones' && c.type === ChannelType.GuildText
  ) as TextChannel | undefined;

  if (apelacionesChannel) {
    log('♻️ Canal #apelaciones ya existe — Actualizando permisos...');
    await apelacionesChannel.permissionOverwrites.create(
      prisioneroRole.id,
      { ViewChannel: true, SendMessages: true, ReadMessageHistory: true },
      { reason: 'Canal de apelaciones (Fortaleza Bot)' }
    );
    await apelacionesChannel.permissionOverwrites.create(
      guild.id,
      { ViewChannel: false },
      { reason: 'Canal de apelaciones — Restringido (Fortaleza Bot)' }
    );
    await apelacionesChannel.permissionOverwrites.create(
      botMember.roles.highest.id,
      { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, ManageMessages: true },
      { reason: 'Canal de apelaciones — Bot (Fortaleza Bot)' }
    );

    for (const roleConfig of ROLES_CONFIG) {
      if (
        roleConfig.type === 'normal' &&
        roleConfig.permissions.some(
          (p) =>
            p === PermissionFlagsBits.Administrator ||
            p === PermissionFlagsBits.ManageGuild ||
            p === PermissionFlagsBits.BanMembers
        )
      ) {
        const role = createdRoles.get(roleConfig.name);
        if (role) {
          await apelacionesChannel.permissionOverwrites.create(
            role.id,
            { ViewChannel: true, SendMessages: true, ReadMessageHistory: true },
            { reason: 'Canal de apelaciones — Admin (Fortaleza Bot)' }
          );
        }
      }
    }
    log('  ✅ Permisos de #apelaciones actualizados');
  } else {
    log('📝 Creando canal #apelaciones...');

    const adminOverwrites: any[] = [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: prisioneroRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: botMember.roles.highest.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
      },
    ];

    for (const roleConfig of ROLES_CONFIG) {
      if (
        roleConfig.type === 'normal' &&
        roleConfig.permissions.some(
          (p) =>
            p === PermissionFlagsBits.Administrator ||
            p === PermissionFlagsBits.ManageGuild ||
            p === PermissionFlagsBits.BanMembers
        )
      ) {
        const role = createdRoles.get(roleConfig.name);
        if (role) {
          adminOverwrites.push({
            id: role.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
          });
        }
      }
    }

    apelacionesChannel = await guild.channels.create({
      name: 'apelaciones',
      type: ChannelType.GuildText,
      topic: 'Canal de apelaciones para Prisioneros de la Fortaleza',
      permissionOverwrites: adminOverwrites,
      reason: 'Canal de apelaciones (Fortaleza Bot)',
    });

    log('  ✅ Canal #apelaciones creado con permisos configurados');
  }
}