import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { getWarns } from '../utils/warnings';
import { getTempActions } from '../utils/tempActions';

export async function handleInfraction(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: 'Solo los administradores pueden usar este comando.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const user = interaction.options.getUser('usuario', true);
  const guild = interaction.guild!;

  const warns = getWarns(user.id);
  const tempActions = getTempActions().filter(
    (a) => a.userId === user.id && a.guildId === guild.id
  );

  const member = await guild.members.fetch(user.id).catch(() => null);
  const isMuted = member?.roles.cache.some(
    (r) => r.name === '🔇 Silenciado' || r.name === 'Silenciado'
  );
  const isPrisoner = member?.roles.cache.some(
    (r) => r.name === '⛓️ Prisionero de la Fortaleza' || r.name === 'Prisionero de la Fortaleza'
  );

  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle(`📋 Historial de infracciones — ${user.tag}`)
    .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 128 }));

  const statusLines: string[] = [];
  if (isMuted) statusLines.push('🔇 **Silenciado**');
  if (isPrisoner) statusLines.push('⛓️ **Prisionero**');
  const activeMute = tempActions.find((a) => a.type === 'mute');
  const activeBan = tempActions.find((a) => a.type === 'ban');
  if (activeMute) {
    const expires = Math.floor(activeMute.endTime / 1000);
    statusLines.push(`🔇 Silencio temporal — expira <t:${expires}:R>`);
  }
  if (activeBan) {
    statusLines.push(`🔨 Ban temporal — expira <t:${Math.floor(activeBan.endTime / 1000)}:R>`);
  }
  if (statusLines.length === 0) statusLines.push('✅ Sin restricciones activas');

  embed.addFields({
    name: 'Estado actual',
    value: statusLines.join('\n'),
    inline: false,
  });

  if (warns.length > 0) {
    const warnList = warns
      .map((w) => `**#${w.warnNumber}** — ${w.reason} (por ${w.moderatorTag})`)
      .join('\n');
    embed.addFields({
      name: `⚠️ Advertencias (${warns.length})`,
      value: warnList.substring(0, 1024),
      inline: false,
    });
  } else {
    embed.addFields({
      name: '⚠️ Advertencias',
      value: 'Sin advertencias',
      inline: false,
    });
  }

  if (tempActions.length > 0) {
    const actionList = tempActions
      .map((a) => {
        const type = a.type === 'mute' ? '🔇 Silencio' : '🔨 Ban';
        return `${type} — Razón: ${a.reason} (por ${a.moderatorTag})`;
      })
      .join('\n');
    embed.addFields({
      name: '⏱️ Acciones temporales activas',
      value: actionList.substring(0, 1024),
      inline: false,
    });
  }

  embed.setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}