import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { saveBackup, getBackups, getBackupById, deleteBackup, GuildBackup, RoleBackup, ChannelBackup } from '../utils/backups';

export async function handleBackupCreate(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: 'Solo los administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const guild = interaction.guild!;

  const roles: RoleBackup[] = guild.roles.cache
    .filter((r) => r.id !== guild.id)
    .sort((a, b) => b.position - a.position)
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      mentionable: r.mentionable,
      permissions: r.permissions.toArray(),
      position: r.position,
    }));

  const channels: ChannelBackup[] = [...guild.channels.cache.values()]
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type as number,
      topic: 'topic' in c ? (c as any).topic : null,
      parentId: c.parentId,
      permissionOverwrites: 'permissionOverwrites' in c
        ? c.permissionOverwrites.cache.map((po) => ({
            id: po.id,
            allow: po.allow.toArray(),
            deny: po.deny.toArray(),
          }))
        : [],
    }));

  const backup: GuildBackup = {
    id: `backup_${Date.now()}`,
    guildId: guild.id,
    guildName: guild.name,
    timestamp: new Date().toISOString(),
    createdBy: interaction.user.tag,
    roles,
    channels,
  };

  saveBackup(backup);

  const embed = new EmbedBuilder()
    .setColor(0x27ae60)
    .setTitle('✅ Backup creado')
    .addFields(
      { name: '🆔 ID', value: backup.id, inline: true },
      { name: '🎭 Roles', value: `${roles.length}`, inline: true },
      { name: '📺 Canales', value: `${channels.length}`, inline: true },
      { name: '📅 Fecha', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      { name: '🛡️ Creado por', value: interaction.user.tag, inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

export async function handleBackupList(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: 'Solo los administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
    return;
  }

  const backups = getBackups(interaction.guild!.id);

  if (backups.length === 0) {
    await interaction.reply({ content: 'No hay backups disponibles. Usa `/backup crear` para crear uno.', flags: MessageFlags.Ephemeral });
    return;
  }

  const list = backups.slice(0, 10).map((b, i) =>
    `**${i + 1}.** \`${b.id}\` — ${b.roles.length} roles, ${b.channels.length} canales — <t:${Math.floor(new Date(b.timestamp).getTime() / 1000)}:R>`
  ).join('\n');

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('📋 Backups disponibles')
    .setDescription(list)
    .setFooter({ text: `Mostrando ${Math.min(10, backups.length)} de ${backups.length} backups` });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

export async function handleBackupRestore(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: 'Solo los administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
    return;
  }

  const backupId = interaction.options.getString('id', true);
  const guild = interaction.guild!;

  const backup = getBackupById(guild.id, backupId);
  if (!backup) {
    await interaction.reply({ content: 'Backup no encontrado. Usa `/backup listar` para ver los disponibles.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let restored = 0;
  let created = 0;

  for (const roleData of backup.roles) {
    const existing = guild.roles.cache.find((r) => r.name === roleData.name);
    if (existing) {
      try {
        await existing.edit({
          color: roleData.color,
          hoist: roleData.hoist,
          mentionable: roleData.mentionable,
          permissions: roleData.permissions as any,
        });
        restored++;
      } catch {}
    } else {
      try {
        await guild.roles.create({
          name: roleData.name,
          color: roleData.color,
          hoist: roleData.hoist,
          mentionable: roleData.mentionable,
          permissions: roleData.permissions as any,
        });
        created++;
      } catch {}
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0x27ae60)
    .setTitle('✅ Backup restaurado parcialmente')
    .setDescription('Los roles fueron restaurados. Los canales y permisos necesitan restauración manual debido a limitaciones de Discord.')
    .addFields(
      { name: '🎭 Roles restaurados', value: `${restored}`, inline: true },
      { name: '✨ Roles creados', value: `${created}`, inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

export async function handleBackupDelete(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: 'Solo los administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
    return;
  }

  const backupId = interaction.options.getString('id', true);
  const deleted = deleteBackup(interaction.guild!.id, backupId);

  if (deleted) {
    await interaction.reply({ content: `✅ Backup \`${backupId}\` eliminado.`, flags: MessageFlags.Ephemeral });
  } else {
    await interaction.reply({ content: 'Backup no encontrado.', flags: MessageFlags.Ephemeral });
  }
}