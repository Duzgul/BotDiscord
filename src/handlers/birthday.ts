import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, TextChannel } from 'discord.js';
import { registerBirthday, removeBirthday, getBirthday, getBirthdaysByMonth, getAllBirthdays, formatBirthday } from '../utils/birthdays';
import { updateProfile } from '../utils/profiles';

export async function handleBirthdayRegister(interaction: ChatInputCommandInteraction) {
  const day = interaction.options.getInteger('dia', true);
  const month = interaction.options.getInteger('mes', true);

  if (month < 1 || month > 12) {
    await interaction.reply({ content: 'El mes debe ser entre 1 y 12.', flags: MessageFlags.Ephemeral });
    return;
  }

  const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > maxDays[month - 1]) {
    await interaction.reply({ content: `El día debe ser entre 1 y ${maxDays[month - 1]} para el mes ${month}.`, flags: MessageFlags.Ephemeral });
    return;
  }

  registerBirthday(interaction.user.id, day, month);
  updateProfile(interaction.user.id, { birthday: `${day}/${month}` });

  const embed = new EmbedBuilder()
    .setColor(0xff69b4)
    .setTitle('🎂 Cumpleaños registrado')
    .setDescription(`Tu cumpleaños ha sido registrado: **${formatBirthday(day, month)}**\n\n¡Recibirás una felicitación especial ese día!`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

export async function handleBirthdayView(interaction: ChatInputCommandInteraction) {
  const user = interaction.options.getUser('usuario') || interaction.user;
  const entry = getBirthday(user.id);

  if (!entry) {
    await interaction.reply({
      content: `${user.id === interaction.user.id ? 'No has registrado tu cumpleaños.' : `${user.tag} no ha registrado su cumpleaños.`} Usa \`/cumpleaños registrar\` para registrarlo.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xff69b4)
    .setTitle(`🎂 Cumpleaños de ${user.tag}`)
    .setDescription(`**${formatBirthday(entry.day, entry.month)}**`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

export async function handleBirthdayList(interaction: ChatInputCommandInteraction) {
  const month = interaction.options.getInteger('mes');
  const entries = month ? getBirthdaysByMonth(month) : getAllBirthdays();

  if (entries.length === 0) {
    await interaction.reply({
      content: month ? `No hay cumpleaños registrados para el mes ${month}.` : 'No hay cumpleaños registrados aún.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guild = interaction.guild!;
  const sorted = entries.sort((a, b) => a.month === b.month ? a.day - b.day : a.month - b.month);

  const list = await Promise.all(
    sorted.map(async (entry) => {
      const member = await guild.members.fetch(entry.userId).catch(() => null);
      const name = member?.displayName || entry.userId;
      return `${entry.day.toString().padStart(2, '0')}/${entry.month.toString().padStart(2, '0')} — **${name}**`;
    })
  );

  const embed = new EmbedBuilder()
    .setColor(0xff69b4)
    .setTitle(month ? `🎂 Cumpleaños del mes ${month}` : '🎂 Todos los cumpleaños')
    .setDescription(list.join('\n'))
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

export async function handleBirthdayRemove(interaction: ChatInputCommandInteraction) {
  const entry = getBirthday(interaction.user.id);

  if (!entry) {
    await interaction.reply({ content: 'No tienes un cumpleaños registrado.', flags: MessageFlags.Ephemeral });
    return;
  }

  removeBirthday(interaction.user.id);
  updateProfile(interaction.user.id, { birthday: null });

  await interaction.reply({ content: '🎂 Tu cumpleaños ha sido eliminado.', flags: MessageFlags.Ephemeral });
}

export async function checkBirthdays(client: any): Promise<void> {
  const today = getTodayBirthdaysFromAll();
  if (today.length === 0) return;

  for (const guild of client.guilds.cache.values()) {
    const channel = guild.channels.cache.find(
      (c: any) => (c.name === 'bienvenida' || c.name === 'cumpleaños') && c.isTextBased()
    ) as TextChannel | undefined;

    if (!channel) continue;

    for (const entry of today) {
      const member = await guild.members.fetch(entry.userId).catch(() => null);
      if (!member) continue;

      const embed = new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle('🎂 ¡Feliz Cumpleaños!')
        .setDescription(`¡Feliz cumpleaños **${member.displayName}**! 🎉\n\nLa Fortaleza de Duzgul te desea un excelente día!`)
        .setThumbnail(member.displayAvatarURL({ extension: 'png', size: 256 }))
        .setTimestamp();

      await channel.send({ content: `<@${entry.userId}>`, embeds: [embed] }).catch(() => {});
    }
  }
}

function getTodayBirthdaysFromAll() {
  const { getTodayBirthdays } = require('../utils/birthdays');
  return getTodayBirthdays();
}