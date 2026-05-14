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
      option.setName('usuario').setDescription('El usuario a consultar (tu mismo si no se especifica)').setRequired(false)
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

    console.log('Comandos slash registrados exitosamente:');
    for (const cmd of commands) {
      console.log(`  /${cmd.name} - ${cmd.description}`);
    }
  } catch (error) {
    console.error('Error al registrar comandos:', error);
  }

  process.exit(0);
})();