import { Guild } from 'discord.js';

const MEMBER_COUNT_PREFIX = '👥 Miembros:';

export async function updateMemberCount(guild: Guild): Promise<void> {
  const channel = guild.channels.cache.find(
    (c) => c.name.startsWith(MEMBER_COUNT_PREFIX) && c.isVoiceBased()
  );

  if (!channel) return;

  try {
    await channel.setName(`${MEMBER_COUNT_PREFIX} ${guild.memberCount}`);
  } catch (err) {
    console.error('Error updating member count:', err);
  }
}

export async function createMemberCountChannel(guild: Guild): Promise<string | null> {
  const existing = guild.channels.cache.find(
    (c) => c.name.startsWith(MEMBER_COUNT_PREFIX) && c.isVoiceBased()
  );

  if (existing) {
    try {
      await existing.setName(`${MEMBER_COUNT_PREFIX} ${guild.memberCount}`);
    } catch {}
    return `♻️ Canal de miembros ya existe: ${existing.name}`;
  }

  try {
    const channel = await guild.channels.create({
      name: `${MEMBER_COUNT_PREFIX} ${guild.memberCount}`,
      type: 2,
      permissionOverwrites: [
        { id: guild.id, deny: ['Connect'] },
      ],
      reason: 'Canal de contador de miembros (Fortaleza Bot)',
    });

    return `✅ Canal de miembros creado: ${channel.name}`;
  } catch (err: any) {
    return `⚠️ No se pudo crear el canal de miembros: ${err.message}`;
  }
}