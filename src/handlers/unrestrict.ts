import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { logToChannel } from './welcome';

export async function handleUnrestrict(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: 'Solo los administradores pueden usar este comando.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const user = interaction.options.getUser('usuario', true);
  const guild = interaction.guild!;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.reply({
      content: 'No se pudo encontrar al usuario en el servidor.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const silenciadoRole = guild.roles.cache.find(
    (r) => r.name === '🔇 Silenciado' || r.name === 'Silenciado'
  );
  const prisioneroRole = guild.roles.cache.find(
    (r) => r.name === '⛓️ Prisionero de la Fortaleza' || r.name === 'Prisionero de la Fortaleza'
  );

  const removedRoles: string[] = [];
  const errors: string[] = [];

  if (silenciadoRole && member.roles.cache.has(silenciadoRole.id)) {
    try {
      await member.roles.remove(silenciadoRole, `Restricción removida por ${interaction.user.tag}`);
      removedRoles.push(silenciadoRole.name);
    } catch {
      errors.push(silenciadoRole.name);
    }
  }

  if (prisioneroRole && member.roles.cache.has(prisioneroRole.id)) {
    try {
      await member.roles.remove(prisioneroRole, `Restricción removida por ${interaction.user.tag}`);
      removedRoles.push(prisioneroRole.name);
    } catch {
      errors.push(prisioneroRole.name);
    }
  }

  if (removedRoles.length === 0 && errors.length === 0) {
    await interaction.reply({
      content: `**${user.tag}** no tiene roles de restricción.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x27ae60)
    .setTitle('✅ Restricción removida')
    .addFields(
      { name: '👤 Usuario', value: `<@${user.id}> (${user.tag})`, inline: true },
      {
        name: '🔓 Roles removidos',
        value: removedRoles.length > 0 ? removedRoles.join(', ') : 'Ninguno',
        inline: false,
      },
      { name: '🛡️ Moderador', value: `<@${interaction.user.id}>`, inline: true }
    )
    .setTimestamp();

  if (errors.length > 0) {
    embed.addFields({
      name: '⚠️ Error al remover',
      value: errors.join(', '),
      inline: false,
    });
  }

  await interaction.reply({ embeds: [embed] });

  // Log
  await logToChannel(
    guild,
    `✅ Restricción removida de **${user.tag}** por ${interaction.user.tag}. Roles removidos: ${removedRoles.join(', ')}`,
    0x27ae60
  );

  // Clear warns
  const { clearWarns } = await import('../utils/warnings');
  clearWarns(user.id);
}