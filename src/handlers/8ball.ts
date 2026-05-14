import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { BALL8_RESPONSES, BALL8_COLORS } from '../config/8ball';

export async function handle8ball(interaction: ChatInputCommandInteraction) {
  const question = interaction.options.getString('pregunta', true);

  const response = BALL8_RESPONSES[Math.floor(Math.random() * BALL8_RESPONSES.length)];
  const color = BALL8_COLORS[response.type];

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('🔮 Bola 8 de la Fortaleza')
    .addFields(
      { name: '❓ Pregunta', value: question, inline: false },
      { name: '🔮 Respuesta', value: response.text, inline: false }
    )
    .setFooter({ text: 'La Fortaleza de Duzgul — Bola 8 Mágica' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}