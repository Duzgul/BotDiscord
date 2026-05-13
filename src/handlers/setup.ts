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
} from 'discord.js';
import { ROLES_CONFIG, ROLE_HIERARCHY, SELF_ASSIGNABLE_HIERARCHY } from '../config/roles';
import {
  SELF_ASSIGNABLE_CATEGORIES,
  SELF_ASSIGNABLE_PERMISSIONS,
  HIERARCHICAL_ROLE_NAMES,
} from '../config/selfAssignable';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    await interaction.editReply(
      'El bot no tiene permiso **Gestionar Roles**. Agrégalo en la configuración del servidor.'
    );
    return;
  }

  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.editReply(
      'El bot no tiene permiso **Gestionar Canales**. Agrégalo en la configuración del servidor.'
    );
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
    log('**[1/5] Creando/actualizando roles jerárquicos...**');
    const createdRoles = new Map<string, Role>();

    for (const roleConfig of ROLES_CONFIG) {
      const existingRole = guild.roles.cache.find((r) => r.name === roleConfig.name);

      if (existingRole) {
        log(`♻️ Actualizando: **${roleConfig.name}**`);
        await existingRole.edit({
          colors: { primaryColor: roleConfig.color },
          permissions: roleConfig.permissions,
          hoist: roleConfig.hoist,
          mentionable: roleConfig.mentionable,
          unicodeEmoji: roleConfig.emoji,
          reason: 'Actualización automática (Fortaleza Bot)',
        });
        createdRoles.set(roleConfig.name, existingRole);
      } else {
        log(`✨ Creando: **${roleConfig.name}** ${roleConfig.emoji}`);
        const newRole = await guild.roles.create({
          name: roleConfig.name,
          colors: { primaryColor: roleConfig.color },
          permissions: roleConfig.permissions,
          hoist: roleConfig.hoist,
          mentionable: roleConfig.mentionable,
          unicodeEmoji: roleConfig.emoji,
          reason: 'Creación automática (Fortaleza Bot)',
        });
        createdRoles.set(roleConfig.name, newRole);
      }

      await delay(500);
    }

    log(`✅ ${createdRoles.size} roles jerárquicos procesados`);

    // ========================================
    // PASO 2: Crear roles autoelegibles
    // ========================================
    log('\n**[2/5] Creando roles autoelegibles...**');
    let newRolesCount = 0;

    for (const category of SELF_ASSIGNABLE_CATEGORIES) {
      for (const roleConfig of category.roles) {
        if (HIERARCHICAL_ROLE_NAMES.includes(roleConfig.name)) {
          const existingRole = guild.roles.cache.find((r) => r.name === roleConfig.name);
          if (existingRole) {
            createdRoles.set(roleConfig.name, existingRole);
            log(`♻️ Ya existe (jerárquico): **${roleConfig.name}**`);
          }
          continue;
        }

        const existingRole = guild.roles.cache.find((r) => r.name === roleConfig.name);

        if (existingRole) {
          createdRoles.set(roleConfig.name, existingRole);
          log(`♻️ Ya existe: **${roleConfig.name}**`);
        } else {
          log(`✨ Creando: **${roleConfig.name}** ${roleConfig.emoji}`);
          const newRole = await guild.roles.create({
            name: roleConfig.name,
            colors: { primaryColor: roleConfig.color },
            permissions: SELF_ASSIGNABLE_PERMISSIONS,
            hoist: false,
            mentionable: roleConfig.mentionable,
            unicodeEmoji: roleConfig.emoji,
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
    log('\n**[3/5] Configurando jerarquía de roles...**');

    await guild.roles.fetch();
    const botHighestPos = botMember.roles.highest.position;

    const allExistingBelow = guild.roles.cache
      .filter(
        (r) =>
          r.id !== guild.id &&
          !SELF_ASSIGNABLE_HIERARCHY.includes(r.name) &&
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

    await guild.roles.fetch();
    for (const name of SELF_ASSIGNABLE_HIERARCHY) {
      const role = createdRoles.get(name);
      if (role) {
        const freshRole = guild.roles.cache.get(role.id);
        if (freshRole) {
          log(`  ${name} → posición ${freshRole.position}`);
        }
      }
    }

    // ========================================
    // PASO 4: Configurar permisos de canales
    // ========================================
    log('\n**[4/5] Configurando permisos de canales...**');

    const channels = guild.channels.cache.filter(
      (c) =>
        c.type === ChannelType.GuildText ||
        c.type === ChannelType.GuildVoice ||
        c.type === ChannelType.GuildAnnouncement ||
        c.type === ChannelType.GuildStageVoice ||
        c.type === ChannelType.GuildCategory
    );

    const silenciadoRole = createdRoles.get('Silenciado');
    if (silenciadoRole) {
      log('🔇 Configurando **Silenciado** en canales...');
      let channelCount = 0;

      for (const channel of channels.values()) {
        if ('permissionOverwrites' in channel) {
          try {
            await channel.permissionOverwrites.create(
              silenciadoRole.id,
              {
                SendMessages: false,
                Speak: false,
                AddReactions: false,
              },
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

    const prisioneroRole = createdRoles.get('Prisionero de la Fortaleza');
    if (prisioneroRole) {
      log('⛓️ Configurando **Prisionero de la Fortaleza** en canales...');
      let channelCount = 0;

      for (const channel of channels.values()) {
        if ('permissionOverwrites' in channel) {
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
    // PASO 5: Publicar menús de roles autoelegibles
    // ========================================
    log('\n**[5/5] Publicando menús de roles autoelegibles...**');

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

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🏰 La Fortaleza de Duzgul — Roles Autoelegibles')
      .setDescription(
        '¡Bienvenido! Selecciona los roles que te interesen usando los menús de abajo.\n\n' +
          '• **🎭 Intereses**: Roles para encontrar personas con gustos similares\n' +
          '• **🔔 Notificaciones**: Roles para recibir avisos específicos\n\n' +
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
        (r) => `${r.emoji} **${r.name}** → ${r.description}`
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

    log('✅ Menús de roles publicados en #' + rolesChannel.name);

    // ========================================
    // Resumen final
    // ========================================
    log('\n**🎉 ¡Configuración completada exitosamente!**');
    log(`- ${createdRoles.size} roles procesados`);
    log(`- Jerarquía configurada`);
    log(`- Permisos de canales configurados`);
    log(`- Canal de apelaciones configurado`);
    log(`- Menús autoelegibles publicados en #${rolesChannel.name}`);

    await interaction.editReply({
      content:
        '✅ **Configuración completada**\n\n' +
        `- Roles jerárquicos: creados/actualizados con emojis y permisos\n` +
        `- Roles autoelegibles: creados con permisos básicos\n` +
        `- Jerarquía: configurada\n` +
        `- Silenciado/Prisionero: permisos de canales configurados\n` +
        `- Canal #apelaciones: configurado\n` +
        `- Canal #${rolesChannel.name}: menús autoelegibles publicados\n\n` +
        `Los usuarios pueden elegir sus roles en el canal #${rolesChannel.name} usando los menús desplegables.`,
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
      {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      },
      { reason: 'Canal de apelaciones (Fortaleza Bot)' }
    );
    await apelacionesChannel.permissionOverwrites.create(
      guild.id,
      { ViewChannel: false },
      { reason: 'Canal de apelaciones — Restringido (Fortaleza Bot)' }
    );
    await apelacionesChannel.permissionOverwrites.create(
      botMember.roles.highest.id,
      {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        ManageMessages: true,
      },
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
            {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true,
            },
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
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: botMember.roles.highest.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
        ],
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
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
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