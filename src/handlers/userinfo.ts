import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';

export async function handleUserinfo(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('usuario') || interaction.user;
  const guild = interaction.guild!;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.reply({
      content: 'No se pudo encontrar al usuario en el servidor.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const roles = member.roles.cache
    .filter((r) => r.id !== guild.id)
    .sort((a, b) => b.position - a.position)
    .map((r) => r.name)
    .join(', ');

  const highestRole = member.roles.highest;
  const isBot = member.user.bot;

  const embed = new EmbedBuilder()
    .setColor(highestRole.color || 0x5865f2)
    .setTitle(`👤 Información de ${member.displayName}`)
    .setThumbnail(member.displayAvatarURL({ extension: 'png', size: 256 }))
    .addFields(
      { name: '🏷️ Nombre', value: member.user.tag, inline: true },
      { name: '🆔 ID', value: user.id, inline: true },
      { name: '🤖 Bot', value: isBot ? 'Sí' : 'No', inline: true },
      {
        name: '📅 Se unió',
        value: member.joinedAt
          ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>\n(<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>)`
          : 'Desconocido',
        inline: false,
      },
      {
        name: '📆 Cuenta creada',
        value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>)`,
        inline: false,
      },
      { name: '👑 Rol más alto', value: highestRole.name, inline: true },
      {
        name: `🎭 Roles (${member.roles.cache.filter((r) => r.id !== guild.id).size})`,
        value: roles || 'Sin roles',
        inline: false,
      }
    )
    .setFooter({ text: `La Fortaleza de Duzgul` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}