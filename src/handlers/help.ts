import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export async function handleHelp(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle('🏰 Fortaleza Bot — Comandos')
    .setDescription('Lista de todos los comandos disponibles del bot.')
    .addFields(
      {
        name: '🛡️ Administración',
        value:
          '`/setup` — Configura los roles, canales y permisos del servidor\n' +
          '`/restrict <usuario> <tipo> [razón]` — Silencia o prisiona a un usuario\n' +
          '`/unrestrict <usuario>` — Remueve la restricción de un usuario\n' +
          '`/warn <usuario> <razón>` — Advierte a un usuario (3 advertencias = silencio automático)\n' +
          '`/warns <usuario>` — Muestra el historial de advertencias de un usuario',
        inline: false,
      },
      {
        name: 'ℹ️ Información',
        value:
          '`/userinfo [usuario]` — Muestra información detallada de un usuario\n' +
          '`/roleinfo <rol>` — Muestra información detallada de un rol',
        inline: false,
      },
      {
        name: '🎭 Roles Autoelegibles',
        value:
          'Usa los menús desplegables en el canal **#roles** para elegir tus roles de intereses y notificaciones.\n' +
          'También puedes reaccionar a los emojis en los mensajes de roles de notificación.',
        inline: false,
      },
      {
        name: '🆕 Automático',
        value:
          '• Los nuevos miembros reciben automáticamente el rol **🆕 Novato**\n' +
          '• Las bienvenidas se envían al canal **#bienvenida**\n' +
          '• Las despedidas se registran en **#bienvenida**\n' +
          '• Las acciones de moderación se registran en **#logs**',
        inline: false,
      }
    )
    .setFooter({ text: 'Fortaleza Bot — La Fortaleza de Duzgul' });

  await interaction.reply({ embeds: [embed] });
}