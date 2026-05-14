import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { addTempAction, getActiveAction } from '../utils/tempActions';
import { parseTime, formatTime } from '../utils/timeParser';
import { logToChannel } from './welcome';

export async function handleTempmute(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: 'Solo los administradores pueden usar este comando.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const user = interaction.options.getUser('usuario', true);
  const timeStr = interaction.options.getString('tiempo', true);
  const reason = interaction.options.getString('razon') || 'No especificada';
  const guild = interaction.guild!;

  const duration = parseTime(timeStr);
  if (!duration) {
    await interaction.reply({
      content:
        'Formato de tiempo inválido. Usa: `30m`, `1h`, `2h`, `1d`, `1w`\nEjemplos: `30m` = 30 minutos, `2h` = 2 horas, `1d` = 1 día',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (duration < 60000) {
    await interaction.reply({
      content: 'El tiempo mínimo es 1 minuto.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (duration > 30 * 24 * 60 * 60 * 1000) {
    await interaction.reply({
      content: 'El tiempo máximo es 30 días.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.reply({
      content: 'No se pudo encontrar al usuario en el servidor.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (member.roles.highest.position >= (interaction.member as any).roles.highest.position) {
    await interaction.reply({
      content: 'No puedes silenciar a alguien con un rol igual o superior al tuyo.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const existingAction = getActiveAction(user.id, 'mute');
  if (existingAction) {
    await interaction.reply({
      content: `**${user.tag}** ya está silenciado temporalmente. Expira <t:${Math.floor(existingAction.endTime / 1000)}:R>.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const silenciadoRole = guild.roles.cache.find(
    (r) => r.name === '🔇 Silenciado' || r.name === 'Silenciado'
  );

  if (!silenciadoRole) {
    await interaction.reply({
      content: 'No se encontró el rol 🔇 Silenciado. Ejecuta `/setup` primero.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const endTime = Date.now() + duration;

  try {
    await member.roles.add(silenciadoRole, `Silencio temporal por ${interaction.user.tag}: ${reason}`);

    addTempAction({
      type: 'mute',
      userId: user.id,
      userTag: user.tag,
      guildId: guild.id,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      reason,
      startTime: Date.now(),
      duration,
      endTime,
    });

    const embed = new EmbedBuilder()
      .setColor(0x7f8c8d)
      .setTitle('🔇 Silencio Temporal')
      .addFields(
        { name: '👤 Usuario', value: `<@${user.id}> (${user.tag})`, inline: true },
        { name: '⏱️ Duración', value: formatTime(duration), inline: true },
        { name: '📝 Razón', value: reason, inline: false },
        { name: '🛡️ Moderador', value: `<@${interaction.user.id}>`, inline: true },
        { name: '⏰ Expira', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await logToChannel(
      guild,
      `🔇 **${user.tag}** fue silenciado temporalmente por ${interaction.user.tag} durante ${formatTime(duration)}. Razón: ${reason}`,
      0x7f8c8d
    );
  } catch (err: any) {
    await interaction.reply({
      content: `Error al silenciar: ${err.message}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}