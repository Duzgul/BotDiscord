import {
  Client,
  GatewayIntentBits,
  Partials,
  CommandInteraction,
  StringSelectMenuInteraction,
  MessageFlags,
} from 'discord.js';
import dotenv from 'dotenv';
import { handleSetup } from './handlers/setup';
import { handleSelectMenu } from './handlers/selectMenu';
import { handleWelcome, logToChannel } from './handlers/welcome';
import { handleFarewell } from './handlers/farewell';
import { handleRestrict } from './handlers/restrict';
import { handleUnrestrict } from './handlers/unrestrict';
import { handleWarn, handleWarns } from './handlers/warn';
import { handleUserinfo } from './handlers/userinfo';
import { handleRoleinfo } from './handlers/roleinfo';
import { handleHelp } from './handlers/help';
import { handleReactionAdd, handleReactionRemove } from './handlers/reactionRoles';

dotenv.config();

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN) {
  console.error('No se encontró TOKEN en el archivo .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once('clientReady', () => {
  console.log(`Bot conectado como ${client.user?.tag}`);
  console.log('Usa /setup para configurar los roles del servidor');
  console.log('Los usuarios pueden usar los menus de roles en el canal #roles');
  console.log('Bot corriendo permanentemente. Ctrl+C para detener.');
});

client.on('guildMemberAdd', async (member) => {
  if (member.partial) return;
  try {
    await handleWelcome(member);
  } catch (err) {
    console.error('Error en bienvenida:', err);
  }
});

client.on('guildMemberRemove', async (member) => {
  if (member.partial) return;
  try {
    await handleFarewell(member);
  } catch (err) {
    console.error('Error en despedida:', err);
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  try {
    if (reaction.partial) await reaction.fetch().catch(() => {});
    if (reaction.message.partial) await reaction.message.fetch().catch(() => {});
    await handleReactionAdd(reaction as any, user as any);
  } catch (err) {
    console.error('Error en reaction add:', err);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  try {
    if (reaction.partial) await reaction.fetch().catch(() => {});
    if (reaction.message.partial) await reaction.message.fetch().catch(() => {});
    await handleReactionRemove(reaction as any, user as any);
  } catch (err) {
    console.error('Error en reaction remove:', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      switch (interaction.commandName) {
        case 'setup':
          await handleSetup(interaction);
          break;
        case 'restrict':
          await handleRestrict(interaction);
          break;
        case 'unrestrict':
          await handleUnrestrict(interaction);
          break;
        case 'warn':
          await handleWarn(interaction);
          break;
        case 'warns':
          await handleWarns(interaction);
          break;
        case 'userinfo':
          await handleUserinfo(interaction);
          break;
        case 'roleinfo':
          await handleRoleinfo(interaction);
          break;
        case 'help':
          await handleHelp(interaction);
          break;
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
  console.error('Error de conexion:', error);
});

client.on('warn', (warning) => {
  console.warn('Aviso:', warning);
});

console.log('Conectando a Discord...');
client.login(TOKEN);