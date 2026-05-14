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
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configura los roles, canales y permisos del servidor de la Fortaleza')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('restrict')
    .setDescription('Silencia o prisiona a un usuario')
    .addUserOption((option) =>
      option.setName('usuario').setDescription('El usuario a restringir').setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('tipo')
        .setDescription('Tipo de restriccion')
        .setRequired(true)
        .addChoices(
          { name: '🔇 Silenciado', value: 'silenciado' },
          { name: '⛓️ Prisionero', value: 'prisionero' }
        )
    )
    .addStringOption((option) =>
      option.setName('razon').setDescription('Razon de la restriccion').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('unrestrict')
    .setDescription('Remueve la restriccion de un usuario')
    .addUserOption((option) =>
      option.setName('usuario').setDescription('El usuario a desrestringir').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Advierte a un usuario (3 advertencias = silencio automatico)')
    .addUserOption((option) =>
      option.setName('usuario').setDescription('El usuario a advertir').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('razon').setDescription('Razon de la advertencia').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('warns')
    .setDescription('Muestra el historial de advertencias de un usuario')
    .addUserOption((option) =>
      option.setName('usuario').setDescription('El usuario a consultar').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Muestra informacion detallada de un usuario')
    .addUserOption((option) =>
      option.setName('usuario').setDescription('El usuario a consultar').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Muestra informacion detallada de un rol')
    .addRoleOption((option) =>
      option.setName('rol').setDescription('El rol a consultar').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra la lista de comandos disponibles'),

  // Nuevos comandos
  new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Consulta la bola 8 magica de la Fortaleza')
    .addStringOption((option) =>
      option.setName('pregunta').setDescription('Tu pregunta para la bola 8').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('encuesta')
    .setDescription('Crea una encuesta con reacciones')
    .addStringOption((option) =>
      option.setName('pregunta').setDescription('La pregunta de la encuesta').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('opcion1').setDescription('Primera opcion (dejar vacio para Si/No)').setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('opcion2').setDescription('Segunda opcion').setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('opcion3').setDescription('Tercera opcion').setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('opcion4').setDescription('Cuarta opcion').setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('opcion5').setDescription('Quinta opcion').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('tempmute')
    .setDescription('Silencia temporalmente a un usuario')
    .addUserOption((option) =>
      option.setName('usuario').setDescription('El usuario a silenciar').setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('tiempo')
        .setDescription('Duracion (ej: 30m, 1h, 2h, 1d)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('razon').setDescription('Razon del silencio').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('tempban')
    .setDescription('Banea temporalmente a un usuario')
    .addUserOption((option) =>
      option.setName('usuario').setDescription('El usuario a banear').setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('tiempo')
        .setDescription('Duracion (ej: 1h, 1d, 1w)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('razon').setDescription('Razon del ban').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('limpiar')
    .setDescription('Borra N mensajes del canal')
    .addIntegerOption((option) =>
      option
        .setName('cantidad')
        .setDescription('Numero de mensajes a borrar (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('infraction')
    .setDescription('Muestra el historial completo de infracciones de un usuario')
    .addUserOption((option) =>
      option.setName('usuario').setDescription('El usuario a consultar').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('verdadoreto')
    .setDescription('Juega verdad o reto con tematica medieval'),

  new SlashCommandBuilder()
    .setName('nivel')
    .setDescription('Muestra tu nivel o el de otro usuario')
    .addUserOption((option) =>
      option.setName('usuario').setDescription('El usuario a consultar').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('ranking-niveles')
    .setDescription('Muestra el top 10 de miembros con mas nivel'),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Registrando comandos slash...');
    console.log(`Client ID: ${CLIENT_ID}`);
    console.log(`Guild ID: ${GUILD_ID}`);

    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });

    console.log(`Comandos slash registrados exitosamente (${commands.length} comandos):`);
    for (const cmd of commands) {
      console.log(`  /${cmd.name} - ${cmd.description}`);
    }
  } catch (error) {
    console.error('Error al registrar comandos:', error);
  }

  process.exit(0);
})();