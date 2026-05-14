import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { logToChannel } from './welcome';

export async function handleClear(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({
      content: 'No tienes permiso para gestionar mensajes.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const amount = interaction.options.getInteger('cantidad', true);

  if (amount < 1 || amount > 100) {
    await interaction.reply({
      content: 'La cantidad debe ser entre 1 y 100.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = interaction.channel;
  if (!channel || !channel.isTextBased() || !('bulkDelete' in channel)) {
    await interaction.reply({
      content: 'Este comando solo funciona en canales de texto.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const messages = await channel.messages.fetch({ limit: amount });
    const filtered = messages.filter((msg) => {
      const diff = Date.now() - msg.createdTimestamp;
      return diff < 14 * 24 * 60 * 60 * 1000;
    });

    if (filtered.size === 0) {
      await interaction.reply({
        content: 'No hay mensajes eliminables (los mensajes deben ser menores a 14 días).',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const deleted = await channel.bulkDelete(filtered, true);

    await interaction.reply({
      content: `✅ Se eliminaron **${deleted.size}** mensajes.`,
      flags: MessageFlags.Ephemeral,
    });

    await logToChannel(
      interaction.guild!,
      `🧹 **${interaction.user.tag}** eliminó ${deleted.size} mensajes en <#${channel.id}>`,
      0x3498db
    );
  } catch (err: any) {
    await interaction.reply({
      content: `Error al eliminar mensajes: ${err.message}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}