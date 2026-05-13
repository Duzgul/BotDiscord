import { PermissionFlagsBits } from 'discord.js';

export interface RoleDefinition {
  name: string;
  emoji: string;
  color: number;
  colorHex: string;
  permissions: bigint[];
  hoist: boolean;
  mentionable: boolean;
  type: 'normal' | 'muted' | 'prisoner';
}

export const ROLES_CONFIG: RoleDefinition[] = [
  {
    name: 'Señor de la Fortaleza',
    emoji: '👑',
    color: 0xffd700,
    colorHex: '#FFD700',
    permissions: [PermissionFlagsBits.Administrator],
    hoist: true,
    mentionable: true,
    type: 'normal',
  },
  {
    name: 'Guardianes de la Fortaleza',
    emoji: '🛡️',
    color: 0xdc143c,
    colorHex: '#DC143C',
    permissions: [
      PermissionFlagsBits.ManageGuild,
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ViewAuditLog,
      PermissionFlagsBits.MuteMembers,
      PermissionFlagsBits.MoveMembers,
    ],
    hoist: true,
    mentionable: true,
    type: 'normal',
  },
  {
    name: 'Constructores',
    emoji: '🏗️',
    color: 0xe67e22,
    colorHex: '#E67E22',
    permissions: [
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageMessages,
    ],
    hoist: true,
    mentionable: false,
    type: 'normal',
  },
  {
    name: 'Héroe de la Fortaleza',
    emoji: '⚔️',
    color: 0x3498db,
    colorHex: '#3498DB',
    permissions: [
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.AddReactions,
    ],
    hoist: true,
    mentionable: true,
    type: 'normal',
  },
  {
    name: 'Forjador de Leyendas',
    emoji: '🔨',
    color: 0x9b59b6,
    colorHex: '#9B59B6',
    permissions: [
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.AddReactions,
    ],
    hoist: true,
    mentionable: true,
    type: 'normal',
  },
  {
    name: 'Guardián del Juego',
    emoji: '🎮',
    color: 0x27ae60,
    colorHex: '#27AE60',
    permissions: [
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
    ],
    hoist: true,
    mentionable: false,
    type: 'normal',
  },
  {
    name: 'Cronista de Historias',
    emoji: '📜',
    color: 0x16a085,
    colorHex: '#16A085',
    permissions: [
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
    ],
    hoist: true,
    mentionable: false,
    type: 'normal',
  },
  {
    name: 'Defensor de la Fe',
    emoji: '🙏',
    color: 0x2980b9,
    colorHex: '#2980B9',
    permissions: [
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
    ],
    hoist: true,
    mentionable: false,
    type: 'normal',
  },
  {
    name: 'Silenciado',
    emoji: '🔇',
    color: 0x7f8c8d,
    colorHex: '#7F8C8D',
    permissions: [],
    hoist: false,
    mentionable: false,
    type: 'muted',
  },
  {
    name: 'Prisionero de la Fortaleza',
    emoji: '⛓️',
    color: 0x2c3e50,
    colorHex: '#2C3E50',
    permissions: [],
    hoist: false,
    mentionable: false,
    type: 'prisoner',
  },
];

export const ROLE_HIERARCHY: string[] = [
  'Señor de la Fortaleza',
  'Guardianes de la Fortaleza',
  'Constructores',
  'Héroe de la Fortaleza',
  'Forjador de Leyendas',
  'Guardián del Juego',
  'Cronista de Historias',
  'Defensor de la Fe',
  'Silenciado',
  'Prisionero de la Fortaleza',
];

export const SELF_ASSIGNABLE_HIERARCHY = [
  ...ROLE_HIERARCHY,
  'Guerrero Competitivo',
  'Aventurero RPG',
  'Constructor del Reino',
  'Narrador de Leyendas',
  'Vocero de Fe',
  'Anuncios de la Fortaleza',
  'Eventos y Torneos',
  'Directos y Streams',
  'Nuevas Historias',
];