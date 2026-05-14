import { MessageReaction, User, TextChannel } from 'discord.js';
import { getReactionMessages } from '../utils/warnings';

export async function handleReactionAdd(reaction: MessageReaction, user: User) {
  if (user.bot) return;

  try {
    if (reaction.partial) {
      await reaction.fetch();
    }
    if (reaction.message.partial) {
      await reaction.message.fetch();
    }
  } catch {
    return;
  }

  const guild = reaction.message.guild;
  if (!guild) return;

  const reactionMessages = getReactionMessages();
  const tracked = reactionMessages.find(
    (m) =>
      m.channelId === reaction.message.channelId &&
      m.messageId === reaction.message.id
  );

  if (!tracked) return;

  const roleName = tracked.emojiRoleMap[reaction.emoji.name || ''];
  if (!roleName) return;

  const role = guild.roles.cache.find(
    (r) => r.name === roleName && !r.name.startsWith('🔇') && !r.name.startsWith('⛓️')
  );

  if (!role) return;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  try {
    await member.roles.add(role, `Autoasignación por reacción (Fortaleza Bot)`);
  } catch (err) {
    console.error(`No se pudo asignar rol ${role.name} a ${user.tag}:`, err);
  }
}

export async function handleReactionRemove(reaction: MessageReaction, user: User) {
  if (user.bot) return;

  try {
    if (reaction.partial) {
      await reaction.fetch();
    }
    if (reaction.message.partial) {
      await reaction.message.fetch();
    }
  } catch {
    return;
  }

  const guild = reaction.message.guild;
  if (!guild) return;

  const reactionMessages = getReactionMessages();
  const tracked = reactionMessages.find(
    (m) =>
      m.channelId === reaction.message.channelId &&
      m.messageId === reaction.message.id
  );

  if (!tracked) return;

  const roleName = tracked.emojiRoleMap[reaction.emoji.name || ''];
  if (!roleName) return;

  const role = guild.roles.cache.find((r) => r.name === roleName);

  if (!role) return;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  try {
    await member.roles.remove(role, `Desasignación por reacción (Fortaleza Bot)`);
  } catch (err) {
    console.error(`No se pudo remover rol ${role.name} de ${user.tag}:`, err);
  }
}