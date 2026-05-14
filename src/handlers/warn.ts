import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { addWarn, getWarns } from '../utils/warnings';
import { logToChannel } from './welcome';

export async function handleWarn(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: 'Solo los administradores pueden usar este comando.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const user = interaction.options.getUser('usuario', true);
  const reason = interaction.options.getString('razon', true);
  const guild = interaction.guild!;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.reply({
      content: 'No se pudo encontrar al usuario en el servidor.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check hierarchy
  if (member.roles.highest.position >= (interaction.member as any).roles.highest.position) {
    await interaction.reply({
      content: 'No puedes advertir a alguien con un rol igual o superior al tuyo.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const currentWarns = getWarns(user.id);
  const warnNumber = currentWarns.length + 1;

  addWarn(user.id, {
    reason,
    moderatorId: interaction.user.id,
    moderatorTag: interaction.user.tag,
    date: new Date().toISOString(),
    warnNumber,
  });

  const embed = new EmbedBuilder()
    .setColor(warnNumber >= 3 ? 0xe74c3c : 0xf39c12)
    .setTitle(`⚠️ Advertencia #${warnNumber}`)
    .addFields(
      { name: '👤 Usuario', value: `<@${user.id}> (${user.tag})`, inline: true },
      { name: '📝 Razón', value: reason, inline: false },
      { name: '🛡️ Moderador', value: `<@${interaction.user.id}>`, inline: true },
      { name: '📊 Total advertencias', value: `${warnNumber}/3`, inline: true }
    )
    .setTimestamp();

  if (warnNumber >= 3) {
    embed.addFields({
      name: '🔇 Auto-silenciado',
      value: 'Este usuario ha alcanzado 3 advertencias y ha sido silenciado automáticamente.',
      inline: false,
    });
  }

  await interaction.reply({ embeds: [embed] });

  // Log
  await logToChannel(
    guild,
    `⚠️ **${user.tag}** fue advertido por ${interaction.user.tag}. Advertencia #${warnNumber}. Razón: ${reason}`,
    warnNumber >= 3 ? 0xe74c3c : 0xf39c12
  );

  // Auto-silence after 3 warns
  if (warnNumber >= 3) {
    const silenciadoRole = guild.roles.cache.find(
      (r) => r.name === '🔇 Silenciado' || r.name === 'Silenciado'
    );

    if (silenciadoRole) {
      try {
        await member.roles.add(
          silenciadoRole,
          `Auto-silenciado: ${warnNumber} advertencias (Fortaleza Bot)`
        );
        await logToChannel(
          guild,
          `🔇 **${user.tag}** fue auto-silenciado por alcanzar ${warnNumber} advertencias.`,
          0xe74c3c
        );
      } catch (err) {
        console.error('No se pudo auto-silenciar al usuario:', err);
      }
    }
  }
}

export async function handleWarns(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: 'Solo los administradores pueden usar este comando.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const user = interaction.options.getUser('usuario', true);
  const warns = getWarns(user.id);

  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle(`⚠️ Advertencias de ${user.tag}`)
    .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 128 }));

  if (warns.length === 0) {
    embed.setDescription('Este usuario no tiene advertencias.');
  } else {
    const warnList = warns
      .map(
        (w, i) =>
          `**#${w.warnNumber}** — ${w.reason}\n` +
          `   🛡️ ${w.moderatorTag} • <t:${Math.floor(new Date(w.date).getTime() / 1000)}:R>`
      )
      .join('\n\n');

    embed.setDescription(warnList.substring(0, 4096));
    embed.addFields({
      name: '📊 Total',
      value: `${warns.length}/3`,
      inline: true,
    });
  }

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}