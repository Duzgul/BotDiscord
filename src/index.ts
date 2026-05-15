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
import { handle8ball } from './handlers/8ball';
import { handlePoll } from './handlers/poll';
import { handleTempmute } from './handlers/tempmute';
import { handleTempban } from './handlers/tempban';
import { handleClear } from './handlers/clear';
import { handleInfraction } from './handlers/infraction';
import { handleTruthOrDare } from './handlers/truthOrDare';
import { handleNivel, handleRanking, XP_PER_MESSAGE, XP_COOLDOWN } from './handlers/level';
import { addXp, calculateLevel, getLevelTitle, getUserLevel } from './utils/leveling';
import { getTempActions, removeTempAction } from './utils/tempActions';
import { handleProfile } from './handlers/profile';
import { handleBirthdayRegister, handleBirthdayView, handleBirthdayList, handleBirthdayRemove, checkBirthdays } from './handlers/birthday';
import { handleBackupCreate, handleBackupList, handleBackupRestore, handleBackupDelete } from './handlers/backup';
import { handleSuggestionCreate, handleSuggestionApprove, handleSuggestionReject } from './handlers/suggestion';
import { handleTicketCreate, handleTicketClose, handleTicketList } from './handlers/ticket';
import { updateMemberCount } from './handlers/memberCount';
import { addVoiceTime, setVoiceJoin } from './utils/profiles';

dotenv.config();

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error('No se encontró TOKEN en el archivo .env');
  process.exit(1);
}

const xpCooldowns = new Map<string, number>();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once('clientReady', () => {
  console.log(`Bot conectado como ${client.user?.tag}`);
  console.log('Usa /setup para configurar los roles del servidor');
  console.log('Bot corriendo permanentemente. Ctrl+C para detener.');

  checkTempActions();
  setInterval(checkTempActions, 60000);

  setInterval(() => {
    checkBirthdays(client).catch((err) => console.error('Error checking birthdays:', err));
  }, 60 * 60 * 1000);
  checkBirthdays(client).catch(() => {});
});

client.on('guildMemberAdd', async (member) => {
  if (member.partial) return;
  try { await handleWelcome(member); } catch (err) { console.error('Error en bienvenida:', err); }
  try { updateMemberCount(member.guild); } catch (err) { console.error('Error updating member count:', err); }
});

client.on('guildMemberRemove', async (member) => {
  if (member.partial) return;
  try { await handleFarewell(member); } catch (err) { console.error('Error en despedida:', err); }
  try { updateMemberCount(member.guild); } catch (err) { console.error('Error updating member count:', err); }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const now = Date.now();
  const lastXp = xpCooldowns.get(message.author.id) || 0;
  if (now - lastXp < XP_COOLDOWN) return;
  xpCooldowns.set(message.author.id, now);

  try {
    const previousData = getUserLevel(message.author.id);
    const previousLevel = calculateLevel(previousData.xp);
    const data = addXp(message.author.id, XP_PER_MESSAGE);

    if (data.level > previousLevel) {
      const title = getLevelTitle(data.level);
      const { EmbedBuilder } = await import('discord.js');
      const levelUpEmbed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle('🎉 ¡Subiste de nivel!')
        .setDescription(
          `¡Felicitaciones **${message.member?.displayName || message.author.username}**!\n\n` +
            `Has alcanzado el **Nivel ${data.level}** — ${title}\n` +
            `XP: ${data.xp}`
        )
        .setFooter({ text: 'La Fortaleza de Duzgul — Sistema de niveles' })
        .setTimestamp();

      const levelMsg = await message.channel.send({ embeds: [levelUpEmbed] });
      setTimeout(() => levelMsg.delete().catch(() => {}), 10000);
    }
  } catch {
    // Silently fail XP addition
  }
});

// Voice state tracking
client.on('voiceStateUpdate', async (oldState, newState) => {
  const userId = newState.id || oldState.id;

  if (!oldState.channelId && newState.channelId) {
    setVoiceJoin(userId, Date.now());
  } else if (oldState.channelId && !newState.channelId) {
    const joinTs = getVoiceJoinTimestamp(userId);
    if (joinTs) {
      const timeInVoice = Math.floor((Date.now() - joinTs) / 1000);
      if (timeInVoice > 1) addVoiceTime(userId, timeInVoice);
      setVoiceJoin(userId, null);
    }
  }
});

function getVoiceJoinTimestamp(userId: string): number | null {
  const { getProfile } = require('./utils/profiles');
  return getProfile(userId).voiceJoinTimestamp;
}

client.on('messageReactionAdd', async (reaction, user) => {
  try {
    if (reaction.partial) await reaction.fetch().catch(() => {});
    if (reaction.message.partial) await reaction.message.fetch().catch(() => {});
    await handleReactionAdd(reaction as any, user as any);
  } catch (err) { console.error('Error en reaction add:', err); }
});

client.on('messageReactionRemove', async (reaction, user) => {
  try {
    if (reaction.partial) await reaction.fetch().catch(() => {});
    if (reaction.message.partial) await reaction.message.fetch().catch(() => {});
    await handleReactionRemove(reaction as any, user as any);
  } catch (err) { console.error('Error en reaction remove:', err); }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      switch (interaction.commandName) {
        case 'setup': await handleSetup(interaction); break;
        case 'restrict': await handleRestrict(interaction); break;
        case 'unrestrict': await handleUnrestrict(interaction); break;
        case 'warn': await handleWarn(interaction); break;
        case 'warns': await handleWarns(interaction); break;
        case 'userinfo': await handleUserinfo(interaction); break;
        case 'roleinfo': await handleRoleinfo(interaction); break;
        case 'help': await handleHelp(interaction); break;
        case '8ball': await handle8ball(interaction); break;
        case 'encuesta': await handlePoll(interaction); break;
        case 'tempmute': await handleTempmute(interaction); break;
        case 'tempban': await handleTempban(interaction); break;
        case 'limpiar': await handleClear(interaction); break;
        case 'infraction': await handleInfraction(interaction); break;
        case 'verdadoreto': await handleTruthOrDare(interaction); break;
        case 'nivel': await handleNivel(interaction); break;
        case 'ranking-niveles': await handleRanking(interaction); break;
        case 'perfil': await handleProfile(interaction); break;
        case 'cumpleaños-registrar': await handleBirthdayRegister(interaction); break;
        case 'cumpleaños-ver': await handleBirthdayView(interaction); break;
        case 'cumpleaños-listar': await handleBirthdayList(interaction); break;
        case 'cumpleaños-eliminar': await handleBirthdayRemove(interaction); break;
        case 'backup-crear': await handleBackupCreate(interaction); break;
        case 'backup-listar': await handleBackupList(interaction); break;
        case 'backup-restaurar': await handleBackupRestore(interaction); break;
        case 'backup-eliminar': await handleBackupDelete(interaction); break;
        case 'sugerir': await handleSuggestionCreate(interaction); break;
        case 'sugerir-aprobar': await handleSuggestionApprove(interaction); break;
        case 'sugerir-rechazar': await handleSuggestionReject(interaction); break;
        case 'ticket-crear': await handleTicketCreate(interaction); break;
        case 'ticket-cerrar': await handleTicketClose(interaction); break;
        case 'ticket-listar': await handleTicketList(interaction); break;
      }
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction);
    }
  } catch (error) {
    console.error('Error al manejar interaccion:', error);
    const errorMessage = 'Ocurrio un error al procesar tu solicitud.';
    if (interaction instanceof CommandInteraction || interaction instanceof StringSelectMenuInteraction) {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: errorMessage }).catch(() => {});
      } else {
        await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  }
});

async function checkTempActions() {
  const actions = getTempActions();
  const now = Date.now();

  for (const action of actions) {
    if (action.endTime <= now) {
      const guild = client.guilds.cache.get(action.guildId);
      if (!guild) continue;

      try {
        if (action.type === 'mute') {
          const member = await guild.members.fetch(action.userId).catch(() => null);
          if (member) {
            const silenciadoRole = guild.roles.cache.find(
              (r) => r.name === '🔇 Silenciado' || r.name === 'Silenciado'
            );
            if (silenciadoRole && member.roles.cache.has(silenciadoRole.id)) {
              await member.roles.remove(silenciadoRole, `Silencio temporal expirado (Fortaleza Bot)`);
            }
          }
          removeTempAction(action.userId, 'mute');
          await logToChannel(guild, `🔇 Silencio temporal expirado para **${action.userTag}**.`, 0x27ae60);
        } else if (action.type === 'ban') {
          await guild.members.unban(action.userId, `Ban temporal expirado (Fortaleza Bot)`);
          removeTempAction(action.userId, 'ban');
          await logToChannel(guild, `🔨 Ban temporal expirado para **${action.userTag}**.`, 0x27ae60);
        }
      } catch (err) {
        console.error(`Error al procesar accion temporal para ${action.userTag}:`, err);
      }
    }
  }
}

client.on('error', (error) => {
  console.error('Error de conexion:', error);
});

client.on('warn', (warning) => {
  console.warn('Aviso:', warning);
});

console.log('Conectando a Discord...');
client.login(TOKEN);