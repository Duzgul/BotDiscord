import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { getUserLevel, getLevelTitle, getXpForCurrentLevel, getXpForNextLevel } from '../utils/leveling';
import { getProfile, formatVoiceTime } from '../utils/profiles';
import { getBirthday, formatBirthday } from '../utils/birthdays';

export async function handleProfile(interaction: ChatInputCommandInteraction) {
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

  const levelData = getUserLevel(user.id);
  const profile = getProfile(user.id);
  const birthday = getBirthday(user.id);

  const currentLevelXp = getXpForCurrentLevel(levelData.level);
  const nextLevelXp = getXpForNextLevel(levelData.level);
  const xpInLevel = levelData.xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const progressPercent = Math.floor((xpInLevel / xpNeeded) * 100);
  const title = getLevelTitle(levelData.level);

  const progressBar = '▓'.repeat(Math.floor(progressPercent / 10)) + '░'.repeat(10 - Math.floor(progressPercent / 10));

  const roleList = member.roles.cache
    .filter((r) => r.id !== guild.id)
    .sort((a, b) => b.position - a.position)
    .map((r) => r.name)
    .join(', ') || 'Sin roles';

  const fields: any[] = [
    { name: '📊 Nivel', value: `${levelData.level} — ${title}`, inline: true },
    { name: '✨ XP', value: `${levelData.xp}`, inline: true },
    { name: '💬 Mensajes', value: `${profile.messages + levelData.messages}`, inline: true },
    { name: '🎤 Tiempo en voz', value: formatVoiceTime(profile.voiceTimeSeconds), inline: true },
    {
      name: '📈 Progreso',
      value: `${progressBar} ${progressPercent}%\n${xpInLevel}/${xpNeeded} XP`,
      inline: false,
    },
    {
      name: `🎭 Roles (${member.roles.cache.filter((r) => r.id !== guild.id).size})`,
      value: roleList.substring(0, 1024),
      inline: false,
    },
  ];

  if (member.joinedAt) {
    fields.push({
      name: '📅 Se unió',
      value: `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>`,
      inline: false,
    });
  }

  if (birthday) {
    fields.push({
      name: '🎂 Cumpleaños',
      value: formatBirthday(birthday.day, birthday.month),
      inline: true,
    });
  }

  const embed = new EmbedBuilder()
    .setColor(member.roles.highest.color || 0x5865f2)
    .setTitle(`⚔️ Perfil de ${member.displayName}`)
    .setThumbnail(member.displayAvatarURL({ extension: 'png', size: 256 }))
    .addFields(fields)
    .setFooter({ text: 'La Fortaleza de Duzgul' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}