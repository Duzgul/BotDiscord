import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import {
  getUserLevel,
  addXp,
  getTopUsers,
  getLevelTitle,
  getXpForNextLevel,
  getXpForCurrentLevel,
  XP_PER_MESSAGE,
  XP_COOLDOWN,
} from '../utils/leveling';

export async function handleNivel(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('usuario') || interaction.user;
  const guild = interaction.guild!;

  const data = getUserLevel(user.id);
  const currentLevelXp = getXpForCurrentLevel(data.level);
  const nextLevelXp = getXpForNextLevel(data.level);
  const xpInLevel = data.xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const progressPercent = Math.floor((xpInLevel / xpNeeded) * 100);
  const title = getLevelTitle(data.level);

  const progressBar = generateProgressBar(progressPercent);

  const member = await guild.members.fetch(user.id).catch(() => null);

  const embed = new EmbedBuilder()
    .setColor(member?.roles.highest.color || 0x5865f2)
    .setTitle(`⚔️ Nivel de ${member?.displayName || user.username}`)
    .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 256 }))
    .addFields(
      { name: '📊 Nivel', value: `${data.level}`, inline: true },
      { name: '🏆 Título', value: title, inline: true },
      { name: '✨ XP Total', value: `${data.xp}`, inline: true },
      { name: '💬 Mensajes', value: `${data.messages}`, inline: true },
      {
        name: '📈 Progreso al siguiente nivel',
        value: `${progressBar} ${progressPercent}%\n${xpInLevel}/${xpNeeded} XP`,
        inline: false,
      }
    )
    .setFooter({ text: `${XP_PER_MESSAGE} XP por mensaje | Cooldown: ${XP_COOLDOWN / 1000}s` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

export async function handleRanking(interaction: ChatInputCommandInteraction) {
  const topUsers = getTopUsers(10);
  const guild = interaction.guild!;

  if (topUsers.length === 0) {
    await interaction.reply({
      content: 'Aún no hay datos de niveles. ¡Envía mensajes para empezar a ganar XP!',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const lines = await Promise.all(
    topUsers.map(async (data, index) => {
      const member = await guild.members.fetch(data.userId).catch(() => null);
      const name = member?.displayName || data.userId;
      const title = getLevelTitle(data.level);
      const medals = ['🥇', '🥈', '🥉'];
      const medal = index < 3 ? medals[index] : `${index + 1}.`;

      return `${medal} **${name}** — Nivel ${data.level} (${title}) — ${data.xp} XP`;
    })
  );

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle('🏆 Ranking de Niveles — La Fortaleza de Duzgul')
    .setDescription(lines.join('\n'))
    .setFooter({ text: 'La Fortaleza de Duzgul' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

function generateProgressBar(percent: number): string {
  const filled = Math.floor(percent / 10);
  const empty = 10 - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}

export { XP_PER_MESSAGE, XP_COOLDOWN };