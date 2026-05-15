import {
  ChatInputCommandInteraction,
  TextChannel,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');

interface Ticket {
  id: string;
  userId: string;
  channelId: string;
  reason: string;
  status: 'open' | 'closed';
  createdAt: string;
  guildId: string;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readTickets(): Ticket[] {
  ensureDataDir();
  if (!fs.existsSync(TICKETS_FILE)) return [];
  return JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf-8'));
}

function writeTickets(tickets: Ticket[]): void {
  ensureDataDir();
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
}

export async function handleTicketCreate(interaction: ChatInputCommandInteraction) {
  const reason = interaction.options.getString('motivo', true);
  const guild = interaction.guild!;

  const existing = readTickets().find(
    (t) => t.userId === interaction.user.id && t.status === 'open' && t.guildId === guild.id
  );
  if (existing) {
    const channel = guild.channels.cache.get(existing.channelId) as TextChannel | undefined;
    if (channel) {
      await interaction.reply({
        content: `Ya tienes un ticket abierto: ${channel.toString()}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  let category = guild.channels.cache.find(
    (c) => c.name.toLowerCase() === 'tickets' && c.type === ChannelType.GuildCategory
  );

  if (!category) {
    category = await guild.channels.create({
      name: 'Tickets',
      type: ChannelType.GuildCategory,
      reason: 'Categoría para tickets de soporte (Fortaleza Bot)',
    });
  }

  const ticketId = `ticket_${Date.now()}`;
  const channelName = `ticket-${interaction.user.username.substring(0, 20)}`;

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    ],
    reason: `Ticket de soporte para ${interaction.user.tag} (Fortaleza Bot)`,
  });

  const adminRoles = guild.roles.cache.filter(
    (r) => r.permissions.has(PermissionFlagsBits.Administrator) && r.id !== guild.id
  );
  for (const [, role] of adminRoles) {
    await ticketChannel.permissionOverwrites.create(role.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });
  }

  const botMember = guild.members.me!;
  await ticketChannel.permissionOverwrites.create(botMember.roles.highest.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    ManageMessages: true,
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎫 Ticket de Soporte')
    .setDescription(`Bienvenido ${interaction.user.toString()}, un administrador te atenderá pronto.\n\n**Motivo:** ${reason}`)
    .addFields(
      { name: '🆔 ID', value: ticketId, inline: true },
      { name: '👤 Usuario', value: interaction.user.toString(), inline: true }
    )
    .setFooter({ text: 'Usa /ticket cerrar en este canal para cerrar el ticket.' })
    .setTimestamp();

  await ticketChannel.send({ embeds: [embed] });

  const tickets = readTickets();
  tickets.push({
    id: ticketId,
    userId: interaction.user.id,
    channelId: ticketChannel.id,
    reason,
    status: 'open',
    createdAt: new Date().toISOString(),
    guildId: guild.id,
  } as any);
  writeTickets(tickets);

  await interaction.reply({
    content: `✅ Tu ticket ha sido creado: ${ticketChannel.toString()}`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleTicketClose(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild!;
  const channel = interaction.channel as TextChannel;

  const tickets = readTickets();
  const ticket = tickets.find((t) => t.channelId === channel.id && t.status === 'open');

  if (!ticket) {
    await interaction.reply({
      content: 'Este comando solo se puede usar en un canal de ticket.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  ticket.status = 'closed';
  writeTickets(tickets);

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('🔒 Ticket cerrado')
    .setDescription('Este ticket ha sido cerrado. El canal será eliminado en 5 segundos.')
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  setTimeout(async () => {
    await channel.delete().catch(() => {});
  }, 5000);
}

export async function handleTicketList(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: 'Solo los administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
    return;
  }

  const tickets = readTickets().filter((t) => t.status === 'open');
  const guild = interaction.guild!;

  if (tickets.length === 0) {
    await interaction.reply({ content: 'No hay tickets abiertos.', flags: MessageFlags.Ephemeral });
    return;
  }

  const list = tickets.map((t) => {
    const ch = guild.channels.cache.get(t.channelId);
    return `• \`${t.id}\` — <@${t.userId}> — ${ch ? ch.toString() : 'canal eliminado'} — <t:${Math.floor(new Date(t.createdAt).getTime() / 1000)}:R>`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎫 Tickets abiertos')
    .setDescription(list.substring(0, 4096));

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}