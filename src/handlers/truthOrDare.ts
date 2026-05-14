import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} from 'discord.js';
import { TRUTHS, DARES } from '../config/truthOrDare';

export async function handleTruthOrDare(interaction: ChatInputCommandInteraction) {
  const truthButton = new ButtonBuilder()
    .setCustomId('tod_truth')
    .setLabel('⚔️ Verdad')
    .setStyle(ButtonStyle.Primary);

  const dareButton = new ButtonBuilder()
    .setCustomId('tod_dare')
    .setLabel('🛡️ Reto')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(truthButton, dareButton);

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('🎭 Verdad o Reto — La Fortaleza')
    .setDescription(
      `${interaction.user}, ¿qué eliges?\n\n` +
        '⚔️ **Verdad** — Responde una pregunta honestamente\n' +
        '🛡️ **Reto** — Completa un desafío'
    )
    .setFooter({ text: 'La Fortaleza de Duzgul — Verdad o Reto Medieval' });

  await interaction.reply({ embeds: [embed], components: [row] });

  const message = await interaction.fetchReply();

  const filter = (i: any) => i.user.id === interaction.user.id;

  try {
    const buttonInteraction = await message.awaitMessageComponent({
      filter,
      componentType: ComponentType.Button,
      time: 60000,
    });

    const isTruth = buttonInteraction.customId === 'tod_truth';
    const pool = isTruth ? TRUTHS : DARES;
    const randomItem = pool[Math.floor(Math.random() * pool.length)];

    const resultEmbed = new EmbedBuilder()
      .setColor(isTruth ? 0x3498db : 0xe74c3c)
      .setTitle(isTruth ? '⚔️ Verdad' : '🛡️ Reto')
      .setDescription(`**${interaction.user}**, ${isTruth ? 'tu verdad es:' : 'tu reto es:'}\n\n${randomItem}`)
      .setFooter({ text: 'La Fortaleza de Duzgul — Verdad o Reto Medieval' });

    await buttonInteraction.update({ embeds: [resultEmbed], components: [] });
  } catch {
    const timeoutEmbed = new EmbedBuilder()
      .setColor(0x95a5a6)
      .setTitle('⏰ Tiempo agotado')
      .setDescription('No se seleccionó una opción a tiempo.');

    await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
  }
}