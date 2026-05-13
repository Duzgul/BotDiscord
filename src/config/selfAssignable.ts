import { PermissionFlagsBits } from 'discord.js';

export interface SelfAssignableRole {
  name: string;
  emoji: string;
  description: string;
  color: number;
  mentionable: boolean;
}

export interface SelfAssignableCategory {
  id: string;
  name: string;
  emoji: string;
  description: string;
  roles: SelfAssignableRole[];
}

export const SELF_ASSIGNABLE_CATEGORIES: SelfAssignableCategory[] = [
  {
    id: 'interests',
    name: 'Roles de Intereses',
    emoji: '🎭',
    description: 'Encuentra personas con gustos similares.',
    roles: [
      {
        name: 'Guardián del Juego',
        emoji: '🎮',
        description: 'Videojuegos en general',
        color: 0x27ae60,
        mentionable: false,
      },
      {
        name: 'Guerrero Competitivo',
        emoji: '⚔️',
        description: 'Juegos PvP / ranked / shooters',
        color: 0xe74c3c,
        mentionable: false,
      },
      {
        name: 'Aventurero RPG',
        emoji: '🏹',
        description: 'RPGs, MMORPGs, mundos abiertos',
        color: 0x2ecc71,
        mentionable: false,
      },
      {
        name: 'Constructor del Reino',
        emoji: '🧱',
        description: 'Minecraft, Terraria, sandbox',
        color: 0xf39c12,
        mentionable: false,
      },
      {
        name: 'Cronista de Historias',
        emoji: '📖',
        description: 'Wattpad, escritura, lectura',
        color: 0x16a085,
        mentionable: false,
      },
      {
        name: 'Narrador de Leyendas',
        emoji: '✨',
        description: 'Lore, worldbuilding, fantasía',
        color: 0xf1c40f,
        mentionable: false,
      },
      {
        name: 'Defensor de la Fe',
        emoji: '🙏',
        description: 'Devocionales y estudios bíblicos',
        color: 0x2980b9,
        mentionable: false,
      },
      {
        name: 'Vocero de Fe',
        emoji: '🔥',
        description: 'Notificaciones del blog y reflexiones',
        color: 0xe67e22,
        mentionable: false,
      },
    ],
  },
  {
    id: 'notifications',
    name: 'Roles de Notificaciones',
    emoji: '🔔',
    description: 'Recibe notificaciones de lo que te interesa. ¡Muy útiles para evitar spam!',
    roles: [
      {
        name: 'Anuncios de la Fortaleza',
        emoji: '📢',
        description: 'Ping para noticias importantes',
        color: 0xffd700,
        mentionable: true,
      },
      {
        name: 'Eventos y Torneos',
        emoji: '🎉',
        description: 'Avisos de actividades',
        color: 0x9b59b6,
        mentionable: true,
      },
      {
        name: 'Directos y Streams',
        emoji: '🎥',
        description: 'Si algún día haces streams',
        color: 0x3498db,
        mentionable: true,
      },
      {
        name: 'Nuevas Historias',
        emoji: '📰',
        description: 'Avisos de Wattpad/blog',
        color: 0x1abc9c,
        mentionable: true,
      },
    ],
  },
];

export const SELF_ASSIGNABLE_PERMISSIONS: bigint[] = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.Speak,
  PermissionFlagsBits.AddReactions,
];

export const HIERARCHICAL_ROLE_NAMES: string[] = [
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