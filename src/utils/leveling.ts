import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const LEVELS_FILE = path.join(DATA_DIR, 'levels.json');

export interface UserLevel {
  userId: string;
  xp: number;
  level: number;
  messages: number;
}

export const XP_PER_MESSAGE = 5;
export const XP_COOLDOWN = 60000;

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800,
  4700, 5700, 6800, 8000, 9500, 11000, 13000, 15500, 18000, 21000,
];

const LEVEL_TITLES: Record<number, string> = {
  0: '🆕 Novato',
  1: '🏕️ Explorador',
  2: '⚔️ Escudero',
  3: '🛡️ Guerrero',
  4: '🏹 Arquero',
  5: '🏰 Caballero',
  6: '⚔️ Veterano',
  7: '🗡️ Comandante',
  8: '👑 Capitán',
  9: '🏆 Comandante Supremo',
  10: '🌟 Leyenda',
  11: '⭐ Leyenda Épica',
  12: '💫 Leyenda Mítica',
  13: '🔥 Maestro Supremo',
  14: '🌟 Campeón Eterno',
  15: '👑 Soberano',
  16: '💎 Guardián Inmortal',
  17: '🔸 Señor de la Guerra',
  18: ' ⚜️ Parangón',
  19: '🔱 Divino',
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getUserLevel(userId: string): UserLevel {
  ensureDataDir();
  let levels: Record<string, UserLevel> = {};
  if (fs.existsSync(LEVELS_FILE)) {
    levels = JSON.parse(fs.readFileSync(LEVELS_FILE, 'utf-8'));
  }
  return levels[userId] || { userId, xp: 0, level: 0, messages: 0 };
}

export function addXp(userId: string, amount: number): UserLevel {
  ensureDataDir();
  let levels: Record<string, UserLevel> = {};
  if (fs.existsSync(LEVELS_FILE)) {
    levels = JSON.parse(fs.readFileSync(LEVELS_FILE, 'utf-8'));
  }

  if (!levels[userId]) {
    levels[userId] = { userId, xp: 0, level: 0, messages: 0 };
  }

  levels[userId].xp += amount;
  levels[userId].messages += 1;

  const newLevel = calculateLevel(levels[userId].xp);
  if (newLevel > levels[userId].level) {
    levels[userId].level = newLevel;
  }

  fs.writeFileSync(LEVELS_FILE, JSON.stringify(levels, null, 2));
  return levels[userId];
}

export function calculateLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i;
  }
  return 0;
}

export function getXpForNextLevel(level: number): number {
  if (level + 1 < LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[level + 1];
  }
  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}

export function getXpForCurrentLevel(level: number): number {
  if (level < LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[level];
  }
  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}

export function getLevelTitle(level: number): string {
  return LEVEL_TITLES[level] || `Nivel ${level}`;
}

export function getTopUsers(limit: number = 10): UserLevel[] {
  ensureDataDir();
  let levels: Record<string, UserLevel> = {};
  if (fs.existsSync(LEVELS_FILE)) {
    levels = JSON.parse(fs.readFileSync(LEVELS_FILE, 'utf-8'));
  }
  return Object.values(levels)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}

export { LEVEL_THRESHOLDS, LEVEL_TITLES };