import { GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { WELCOME_CONFIG } from '../config/welcome';
import { logToChannel } from './welcome';

export async function handleFarewell(member: GuildMember) {
  if (member.user.bot) return;

  const guild = member.guild;
  const channel = guild.channels.cache.find(
    (c) => c.name === WELCOME_CONFIG.channelName && c.isTextBased()
  ) as TextChannel | undefined;

  if (!channel) return;

  const roleList =
    member.roles.cache
      .filter((r) => r.id !== guild.id)
      .map((r) => r.name)
      .join(', ') || 'Sin roles';

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle(WELCOME_CONFIG.messages.farewellTitle)
    .setThumbnail(member.user.displayAvatarURL({ extension: 'png', size: 256 }))
    .addFields(
      { name: '👤 Usuario', value: `**${member.user.tag}**`, inline: true },
      {
        name: '📅 Se unió el',
        value: member.joinedAt
          ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>`
          : 'Desconocido',
        inline: true,
      },
      { name: '🎭 Roles', value: roleList.substring(0, 1024), inline: false }
    )
    .setFooter({ text: `Ahora somos ${guild.memberCount} miembros` })
    .setTimestamp();

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Error enviando mensaje de despedida:', err);
  }

  await logToChannel(guild, `👋 **${member.user.tag}** salió del servidor.`, 0xe74c3c);
}