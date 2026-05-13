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
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Registrando comandos slash...');
    console.log(`Client ID: ${CLIENT_ID}`);
    console.log(`Guild ID: ${GUILD_ID}`);

    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });

    console.log('✅ Comandos slash registrados exitosamente.');
    console.log('El comando /setup ya está disponible en tu servidor.');
  } catch (error) {
    console.error('Error al registrar comandos:', error);
  }

  process.exit(0);
})();