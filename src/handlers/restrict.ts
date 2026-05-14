import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { logToChannel } from './welcome';

export async function handleRestrict(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: 'Solo los administradores pueden usar este comando.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const user = interaction.options.getUser('usuario', true);
  const type = interaction.options.getString('tipo', true) as 'silenciado' | 'prisionero';
  const reason = interaction.options.getString('razon') || 'No especificada';
  const guild = interaction.guild!;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.reply({
      content: 'No se pudo encontrar al usuario en el servidor.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const roleEmoji = type === 'silenciado' ? '🔇' : '⛓️';
  const roleName =
    type === 'silenciado' ? '🔇 Silenciado' : '⛓️ Prisionero de la Fortaleza';

  const role = guild.roles.cache.find(
    (r) => r.name === roleName || r.name === type
  );

  if (!role) {
    await interaction.reply({
      content: `No se encontró el rol **${roleName}**. Ejecuta \`/setup\` primero.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check if user already has the role
  if (member.roles.cache.has(role.id)) {
    await interaction.reply({
      content: `**${user.tag}** ya tiene el rol ${roleEmoji} **${role.name}**.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check hierarchy
  if (member.roles.highest.position >= (interaction.member as any).roles.highest.position) {
    await interaction.reply({
      content: 'No puedes restringir a alguien con un rol igual o superior al tuyo.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await member.roles.add(role, `Restringido por ${interaction.user.tag}: ${reason}`);

    const embed = new EmbedBuilder()
      .setColor(type === 'silenciado' ? 0x7f8c8d : 0x2c3e50)
      .setTitle(`${roleEmoji} Usuario restringido`)
      .addFields(
        { name: '👤 Usuario', value: `<@${user.id}> (${user.tag})`, inline: true },
        { name: '🎯 Tipo', value: role.name, inline: true },
        { name: '📝 Razón', value: reason, inline: false },
        { name: '🛡️ Moderador', value: `<@${interaction.user.id}>`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Log
    await logToChannel(
      guild,
      `${roleEmoji} **${user.tag}** fue restringido como **${role.name}** por ${interaction.user.tag}. Razón: ${reason}`,
      type === 'silenciado' ? 0x7f8c8d : 0x2c3e50
    );

    // If prisionero, notify in #apelaciones
    if (type === 'prisionero') {
      const apelacionesChannel = guild.channels.cache.find(
        (c) => c.name === 'apelaciones' && c.type === 0
      ) as TextChannel | undefined;

      if (apelacionesChannel) {
        const apelacionesEmbed = new EmbedBuilder()
          .setColor(0x2c3e50)
          .setTitle('⛓️ Notificación de restricción')
          .setDescription(
            `<@${user.id}>, has sido asignado como **Prisionero de la Fortaleza**.\n\n` +
              `Puedes usar este canal para apelar tu situación. Un administrador revisará tu caso.\n\n` +
              `**Razón:** ${reason}`
          )
          .setTimestamp();

        await apelacionesChannel.send({ embeds: [apelacionesEmbed] });
      }
    }
  } catch (err: any) {
    await interaction.reply({
      content: `Error al asignar el rol: ${err.message}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}