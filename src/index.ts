import { Client, GatewayIntentBits, CommandInteraction, StringSelectMenuInteraction, MessageFlags } from 'discord.js';
import dotenv from 'dotenv';
import { handleSetup } from './handlers/setup';
import { handleSelectMenu } from './handlers/selectMenu';

dotenv.config();

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error('No se encontró TOKEN en el archivo .env');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once('clientReady', () => {
  console.log(`Bot conectado como ${client.user?.tag}`);
  console.log('Usa /setup para configurar los roles del servidor');
  console.log('Los usuarios pueden usar los menuses de roles en el canal #roles');
  console.log('Bot corriendo permanentemente. Ctrl+C para detener.');
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'setup') {
        await handleSetup(interaction);
      }
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction);
    }
  } catch (error) {
    console.error('Error al manejar interaccion:', error);

    const errorMessage = 'Ocurrio un error al procesar tu solicitud.';

    if (
      interaction instanceof CommandInteraction ||
      interaction instanceof StringSelectMenuInteraction
    ) {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: errorMessage }).catch(() => {});
      } else {
        await interaction
          .reply({ content: errorMessage, flags: MessageFlags.Ephemeral })
          .catch(() => {});
      }
    }
  }
});

client.on('error', (error) => {
  console.error('Error de conexión:', error);
});

client.on('warn', (warning) => {
  console.warn('Aviso:', warning);
});

console.log('Conectando a Discord...');
client.login(TOKEN);