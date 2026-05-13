import { StringSelectMenuInteraction, MessageFlags } from 'discord.js';
import { SELF_ASSIGNABLE_CATEGORIES } from '../config/selfAssignable';

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
    const role = guild.roles.cache.find((r) => r.name === roleName);
    if (!role) {
      errors.push(roleName);
      continue;
    }

    if (!member.roles.cache.has(role.id)) {
      try {
        await member.roles.add(role, `Autoasignación — ${category.name} (Fortaleza Bot)`);
        added.push(roleName);
      } catch {
        errors.push(roleName);
      }
    }
  }

  for (const roleName of deselectedNames) {
    const role = guild.roles.cache.find((r) => r.name === roleName);
    if (!role) continue;

    if (member.roles.cache.has(role.id)) {
      try {
        await member.roles.remove(role, `Desasignación — ${category.name} (Fortaleza Bot)`);
        removed.push(roleName);
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
    lines.push(`⚠️ **Error con:** ${errors.join(', ')} (el bot no tiene permisos suficientes)`);
  }

  await interaction.reply({
    content: `${category.emoji} **${category.name}**\n\n${lines.join('\n')}`,
    flags: MessageFlags.Ephemeral,
  });
}