import { ChatInputCommandInteraction, Role, EmbedBuilder, MessageFlags } from 'discord.js';

export async function handleRoleinfo(interaction: ChatInputCommandInteraction) {
  const role = interaction.options.getRole('rol') as Role;
  const guild = interaction.guild!;

  const members = guild.members.cache.filter((m) => m.roles.cache.has(role.id));
  const memberList =
    members.size > 20
      ? members
          .first(20)
          .map((m) => m.displayName)
          .join(', ') + ` y ${members.size - 20} más...`
      : members.map((m) => m.displayName).join(', ') || 'Ningún miembro';

  const permissions = role.permissions.toArray();
  const permList =
    permissions.length > 0
      ? permissions.map((p) => `\`${p}\``).join(', ')
      : 'Sin permisos';

  const isHierarchical = [
    '👑 Señor de la Fortaleza',
    '🛡️ Guardianes de la Fortaleza',
    '🏗️ Constructores',
    '⚔️ Héroe de la Fortaleza',
    '🔨 Forjador de Leyendas',
    '🎮 Guardián del Juego',
    '📜 Cronista de Historias',
    '🙏 Defensor de la Fe',
    '🔇 Silenciado',
    '⛓️ Prisionero de la Fortaleza',
  ].includes(role.name);

  const isSelfAssignable = [
    '🎮 Guardián del Juego',
    '⚔️ Guerrero Competitivo',
    '🏹 Aventurero RPG',
    '🧱 Constructor del Reino',
    '📖 Cronista de Historias',
    '✨ Narrador de Leyendas',
    '🙏 Defensor de la Fe',
    '🔥 Vocero de Fe',
    '📢 Anuncios de la Fortaleza',
    '🎉 Eventos y Torneos',
    '🎥 Directos y Streams',
    '📰 Nuevas Historias',
    '🆕 Novato',
  ].includes(role.name);

  const embed = new EmbedBuilder()
    .setColor(role.color || 0x5865f2)
    .setTitle(`🎭 Información del rol ${role.name}`)
    .addFields(
      { name: '🆔 ID', value: role.id, inline: true },
      { name: '🎨 Color', value: role.hexColor, inline: true },
      { name: '📍 Posición', value: `${role.position}`, inline: true },
      { name: '👥 Miembros', value: `${members.size}`, inline: true },
      {
        name: '📌 Visible por separado',
        value: role.hoist ? 'Sí' : 'No',
        inline: true,
      },
      { name: '🔊 Mencionable', value: role.mentionable ? 'Sí' : 'No', inline: true },
      {
        name: '📋 Tipo',
        value: isHierarchical ? '👑 Jerárquico' : isSelfAssignable ? '🎭 Autoelegible' : '🔹 Personalizado',
        inline: true,
      },
      { name: `👤 Miembros con este rol`, value: memberList.substring(0, 1024), inline: false },
      { name: `🔑 Permisos (${permissions.length})`, value: permList.substring(0, 1024), inline: false }
    )
    .setTimestamp();

  if (role.icon) {
    embed.setThumbnail(role.iconURL()!);
  }

  await interaction.reply({ embeds: [embed] });
}