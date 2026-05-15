import { StringSelectMenuInteraction, MessageFlags } from 'discord.js';
import { SELF_ASSIGNABLE_CATEGORIES, HIERARCHICAL_ROLE_NAMES } from '../config/selfAssignable';
import { ROLES_CONFIG } from '../config/roles';

function findRoleByName(guild: StringSelectMenuInteraction['guild'], plainName: string, emoji: string) {
  if (!guild) return undefined;

  const allConfigs = [...ROLES_CONFIG, ...SELF_ASSIGNABLE_CATEGORIES.flatMap((c) => c.roles)];
  const possibleNames: string[] = [plainName];

  for (const cfg of allConfigs) {
    if (cfg.name === plainName) {
      possibleNames.push(`${cfg.emoji} ${cfg.name}`);
    }
  }
  possibleNames.push(`${emoji} ${plainName}`);

  return guild.roles.cache.find((r) => possibleNames.includes(r.name));
}

export async function handleSelectMenu(interaction: StringSelectMenuInteraction) {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content: 'Este comando solo funciona en servidores.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const customId = interaction.customId;

  if (!customId.startsWith('selfassign_')) return;

  const categoryId = customId.replace('selfassign_', '');
  const category = SELF_ASSIGNABLE_CATEGORIES.find((c) => c.id === categoryId);

  if (!category) {
    await interaction.reply({
      content: 'Categoría de roles no encontrada.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const selectedNames = interaction.values;
  const allRoleNames = category.roles.map((r) => r.name);
  const deselectedNames = allRoleNames.filter((name) => !selectedNames.includes(name));

  const guild = interaction.guild;
  const member = await guild.members.fetch(interaction.user.id);

  const added: string[] = [];
  const removed: string[] = [];
  const errors: string[] = [];

  for (const roleName of selectedNames) {
    const roleConfig = category.roles.find((r) => r.name === roleName);
    const emoji = roleConfig?.emoji ?? '';
    const role = findRoleByName(guild, roleName, emoji);
    if (!role) {
      errors.push(roleName);
      continue;
    }

    if (!member.roles.cache.has(role.id)) {
      try {
        await member.roles.add(role, `Autoasignación — ${category.name} (Fortaleza Bot)`);
        added.push(`${emoji} ${roleName}`);
      } catch {
        errors.push(roleName);
      }
    }
  }

  for (const roleName of deselectedNames) {
    const roleConfig = category.roles.find((r) => r.name === roleName);
    const emoji = roleConfig?.emoji ?? '';
    const role = findRoleByName(guild, roleName, emoji);
    if (!role) continue;

    if (member.roles.cache.has(role.id)) {
      try {
        await member.roles.remove(role, `Desasignación — ${category.name} (Fortaleza Bot)`);
        removed.push(`${emoji} ${roleName}`);
      } catch {
        errors.push(roleName);
      }
    }
  }

  const lines: string[] = [];

  if (added.length > 0) {
    lines.push(`✅ **Roles añadidos:** ${added.join(', ')}`);
  }
  if (removed.length > 0) {
    lines.push(`❌ **Roles removidos:** ${removed.join(', ')}`);
  }
  if (added.length === 0 && removed.length === 0) {
    lines.push('📝 No se realizaron cambios en tus roles.');
  }
  if (errors.length > 0) {
    lines.push(`⚠️ **Error con:** ${errors.join(', ')} (no se encontró el rol en el servidor)`);
  }

  await interaction.reply({
    content: `${category.emoji} **${category.name}**\n\n${lines.join('\n')}`,
    flags: MessageFlags.Ephemeral,
  });
}