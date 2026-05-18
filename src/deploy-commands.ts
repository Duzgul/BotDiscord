import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !GUILD_ID) {
  console.error('TOKEN y GUILD_ID son requeridos en el archivo .env');
  process.exit(1);
}

const CLIENT_ID = Buffer.from(TOKEN.split('.')[0], 'base64').toString();

const commands = [
  // === ADMIN ===
  new SlashCommandBuilder().setName('setup').setDescription('Configura los roles, canales y permisos del servidor').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('restrict').setDescription('Silencia o prisiona a un usuario').addUserOption(o => o.setName('usuario').setDescription('El usuario a restringir').setRequired(true)).addStringOption(o => o.setName('tipo').setDescription('Tipo de restriccion').setRequired(true).addChoices({ name: '🔇 Silenciado', value: 'silenciado' }, { name: '⛓️ Prisionero', value: 'prisionero' })).addStringOption(o => o.setName('razon').setDescription('Razon').setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('unrestrict').setDescription('Remueve la restriccion de un usuario').addUserOption(o => o.setName('usuario').setDescription('El usuario').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('warn').setDescription('Advierte a un usuario (3 warns = silencio automatico)').addUserOption(o => o.setName('usuario').setDescription('El usuario').setRequired(true)).addStringOption(o => o.setName('razon').setDescription('Razon').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('warns').setDescription('Historial de advertencias').addUserOption(o => o.setName('usuario').setDescription('El usuario').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('tempmute').setDescription('Silencia temporalmente').addUserOption(o => o.setName('usuario').setDescription('El usuario').setRequired(true)).addStringOption(o => o.setName('tiempo').setDescription('Duracion (30m, 1h, 2h, 1d)').setRequired(true)).addStringOption(o => o.setName('razon').setDescription('Razon').setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('tempban').setDescription('Banea temporalmente').addUserOption(o => o.setName('usuario').setDescription('El usuario').setRequired(true)).addStringOption(o => o.setName('tiempo').setDescription('Duracion (1h, 1d, 1w)').setRequired(true)).addStringOption(o => o.setName('razon').setDescription('Razon').setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('limpiar').setDescription('Borra mensajes del canal').addIntegerOption(o => o.setName('cantidad').setDescription('1-100').setRequired(true).setMinValue(1).setMaxValue(100)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder().setName('infraction').setDescription('Historial completo de infracciones').addUserOption(o => o.setName('usuario').setDescription('El usuario').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // === BACKUP ===
  new SlashCommandBuilder().setName('backup-crear').setDescription('Crea un backup de roles y permisos').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('backup-listar').setDescription('Lista los backups disponibles').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('backup-restaurar').setDescription('Restaura un backup').addStringOption(o => o.setName('id').setDescription('ID del backup').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('backup-eliminar').setDescription('Elimina un backup').addStringOption(o => o.setName('id').setDescription('ID del backup').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // === INFO ===
  new SlashCommandBuilder().setName('userinfo').setDescription('Info de un usuario').addUserOption(o => o.setName('usuario').setDescription('El usuario').setRequired(false)),
  new SlashCommandBuilder().setName('roleinfo').setDescription('Info de un rol').addRoleOption(o => o.setName('rol').setDescription('El rol').setRequired(true)),
  new SlashCommandBuilder().setName('help').setDescription('Lista de comandos'),

  // === FUN ===
  new SlashCommandBuilder().setName('8ball').setDescription('Bola 8 magica de la Fortaleza').addStringOption(o => o.setName('pregunta').setDescription('Tu pregunta').setRequired(true)),
  new SlashCommandBuilder().setName('encuesta').setDescription('Crea una encuesta').addStringOption(o => o.setName('pregunta').setDescription('La pregunta').setRequired(true)).addStringOption(o => o.setName('opcion1').setDescription('Opcion 1').setRequired(false)).addStringOption(o => o.setName('opcion2').setDescription('Opcion 2').setRequired(false)).addStringOption(o => o.setName('opcion3').setDescription('Opcion 3').setRequired(false)).addStringOption(o => o.setName('opcion4').setDescription('Opcion 4').setRequired(false)).addStringOption(o => o.setName('opcion5').setDescription('Opcion 5').setRequired(false)),
  new SlashCommandBuilder().setName('verdadoreto').setDescription('Verdad o reto medieval'),

  // === LEVELS ===
  new SlashCommandBuilder().setName('nivel').setDescription('Tu nivel o el de otro usuario').addUserOption(o => o.setName('usuario').setDescription('El usuario').setRequired(false)),
  new SlashCommandBuilder().setName('ranking-niveles').setDescription('Top 10 de miembros con mas nivel'),

  // === PROFILE ===
  new SlashCommandBuilder().setName('perfil').setDescription('Tu perfil o el de otro usuario').addUserOption(o => o.setName('usuario').setDescription('El usuario').setRequired(false)),

  // === BIRTHDAYS ===
  new SlashCommandBuilder().setName('cumpleaños-registrar').setDescription('Registra tu cumpleaños').addIntegerOption(o => o.setName('dia').setDescription('Dia (1-31)').setRequired(true).setMinValue(1).setMaxValue(31)).addIntegerOption(o => o.setName('mes').setDescription('Mes (1-12)').setRequired(true).setMinValue(1).setMaxValue(12)),
  new SlashCommandBuilder().setName('cumpleaños-ver').setDescription('Ve el cumpleaños de alguien').addUserOption(o => o.setName('usuario').setDescription('El usuario').setRequired(false)),
  new SlashCommandBuilder().setName('cumpleaños-listar').setDescription('Lista de cumpleaños').addIntegerOption(o => o.setName('mes').setDescription('Mes (1-12)').setRequired(false).setMinValue(1).setMaxValue(12)),
  new SlashCommandBuilder().setName('cumpleaños-eliminar').setDescription('Elimina tu cumpleaños'),

  // === SUGGESTIONS ===
  new SlashCommandBuilder().setName('sugerir').setDescription('Crea una sugerencia').addStringOption(o => o.setName('texto').setDescription('Tu sugerencia').setRequired(true)),
  new SlashCommandBuilder().setName('sugerir-aprobar').setDescription('Aprueba una sugerencia').addStringOption(o => o.setName('id').setDescription('ID de la sugerencia').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('sugerir-rechazar').setDescription('Rechaza una sugerencia').addStringOption(o => o.setName('id').setDescription('ID de la sugerencia').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // === TICKETS ===
  new SlashCommandBuilder().setName('ticket-crear').setDescription('Abre un ticket de soporte').addStringOption(o => o.setName('motivo').setDescription('Motivo del ticket').setRequired(true)),
  new SlashCommandBuilder().setName('ticket-cerrar').setDescription('Cierra el ticket actual'),
  new SlashCommandBuilder().setName('ticket-listar').setDescription('Lista tickets abiertos').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // === MUSIC ===
  new SlashCommandBuilder().setName('música').setDescription('Comandos de música')
    .addSubcommand(sc => sc.setName('reproducir').setDescription('Reproduce una canción de YouTube').addStringOption(o => o.setName('canción').setDescription('Nombre o URL de YouTube').setRequired(true)))
    .addSubcommand(sc => sc.setName('detener').setDescription('Detiene la música y desconecta al bot'))
    .addSubcommand(sc => sc.setName('saltar').setDescription('Salta a la siguiente canción'))
    .addSubcommand(sc => sc.setName('pausar').setDescription('Pausa la canción actual'))
    .addSubcommand(sc => sc.setName('reanudar').setDescription('Reanuda la canción pausada'))
    .addSubcommand(sc => sc.setName('cola').setDescription('Muestra la cola de reproducción')),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Registrando comandos slash...');
    console.log(`Client ID: ${CLIENT_ID}`);
    console.log(`Guild ID: ${GUILD_ID}`);

    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log(`Comandos slash registrados exitosamente (${commands.length} comandos):`);
    for (const cmd of commands) {
      console.log(`  /${cmd.name}`);
    }
  } catch (error) {
    console.error('Error al registrar comandos:', error);
  }

  process.exit(0);
})();