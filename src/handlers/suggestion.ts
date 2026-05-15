import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, TextChannel, PermissionFlagsBits } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SUGGESTIONS_FILE = path.join(DATA_DIR, 'suggestions.json');

interface Suggestion {
  id: string;
  userId: string;
  userTag: string;
  text: string;
  status: 'pending' | 'approved' | 'rejected';
  messageId?: string;
  channelId?: string;
  timestamp: string;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readSuggestions(): Suggestion[] {
  ensureDataDir();
  if (!fs.existsSync(SUGGESTIONS_FILE)) return [];
  return JSON.parse(fs.readFileSync(SUGGESTIONS_FILE, 'utf-8'));
}

function writeSuggestions(suggestions: Suggestion[]): void {
  ensureDataDir();
  fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(suggestions, null, 2));
}

export async function handleSuggestionCreate(interaction: ChatInputCommandInteraction) {
  const text = interaction.options.getString('texto', true);
  const guild = interaction.guild!;

  let channel = guild.channels.cache.find(
    (c) => c.name === 'sugerencias' && c.isTextBased()
  ) as TextChannel | undefined;

  if (!channel) {
    await interaction.reply({
      content: 'El canal #sugerencias no existe. Pide a un administrador que ejecute `/setup`.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const suggestionId = `sug_${Date.now()}`;
  const suggestions = readSuggestions();

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('💡 Nueva sugerencia')
    .setDescription(text)
    .addFields(
      { name: '👤 Propuesto por', value: `<@${interaction.user.id}>`, inline: true },
      { name: '🆔 ID', value: suggestionId, inline: true }
    )
    .setFooter({ text: 'Reacciona con 👍 o 👎 para votar' })
    .setTimestamp();

  const message = await channel.send({ embeds: [embed] });
  await message.react('👍');
  await message.react('👎');

  suggestions.push({
    id: suggestionId,
    userId: interaction.user.id,
    userTag: interaction.user.tag,
    text,
    status: 'pending',
    messageId: message.id,
    channelId: channel.id,
    timestamp: new Date().toISOString(),
  });
  writeSuggestions(suggestions);

  await interaction.reply({
    content: `✅ Tu sugerencia ha sido publicada en ${channel.toString()}.`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleSuggestionApprove(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: 'Solo los administradores pueden aprobar sugerencias.', flags: MessageFlags.Ephemeral });
    return;
  }

  const suggestionId = interaction.options.getString('id', true);
  const suggestions = readSuggestions();
  const suggestion = suggestions.find((s) => s.id === suggestionId);

  if (!suggestion) {
    await interaction.reply({ content: 'Sugerencia no encontrada.', flags: MessageFlags.Ephemeral });
    return;
  }

  suggestion.status = 'approved';
  writeSuggestions(suggestions);

  if (suggestion.messageId && suggestion.channelId) {
    const channel = interaction.guild!.channels.cache.get(suggestion.channelId) as TextChannel | undefined;
    if (channel) {
      const message = await channel.messages.fetch(suggestion.messageId).catch(() => null);
      if (message) {
        const oldEmbed = message.embeds[0];
        const newEmbed = EmbedBuilder.from(oldEmbed)
          .setColor(0x27ae60)
          .setTitle('✅ Sugerencia aprobada')
          .setFooter({ text: 'Aprobada por administración' });
        await message.edit({ embeds: [newEmbed] });
      }
    }
  }

  await interaction.reply({ content: `✅ Sugerencia \`${suggestionId}\` aprobada.`, flags: MessageFlags.Ephemeral });
}

export async function handleSuggestionReject(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: 'Solo los administradores pueden rechazar sugerencias.', flags: MessageFlags.Ephemeral });
    return;
  }

  const suggestionId = interaction.options.getString('id', true);
  const suggestions = readSuggestions();
  const suggestion = suggestions.find((s) => s.id === suggestionId);

  if (!suggestion) {
    await interaction.reply({ content: 'Sugerencia no encontrada.', flags: MessageFlags.Ephemeral });
    return;
  }

  suggestion.status = 'rejected';
  writeSuggestions(suggestions);

  if (suggestion.messageId && suggestion.channelId) {
    const channel = interaction.guild!.channels.cache.get(suggestion.channelId) as TextChannel | undefined;
    if (channel) {
      const message = await channel.messages.fetch(suggestion.messageId).catch(() => null);
      if (message) {
        const oldEmbed = message.embeds[0];
        const newEmbed = EmbedBuilder.from(oldEmbed)
          .setColor(0xe74c3c)
          .setTitle('❌ Sugerencia rechazada')
          .setFooter({ text: 'Rechazada por administración' });
        await message.edit({ embeds: [newEmbed] });
      }
    }
  }

  await interaction.reply({ content: `❌ Sugerencia \`${suggestionId}\` rechazada.`, flags: MessageFlags.Ephemeral });
}