import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const WARNS_FILE = path.join(DATA_DIR, 'warns.json');
const REACTIONS_FILE = path.join(DATA_DIR, 'reactionMessages.json');

export interface WarnEntry {
  reason: string;
  moderatorId: string;
  moderatorTag: string;
  date: string;
  warnNumber: number;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getWarns(userId: string): WarnEntry[] {
  ensureDataDir();
  if (!fs.existsSync(WARNS_FILE)) return [];
  const data = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf-8'));
  return data[userId] || [];
}

export function addWarn(userId: string, entry: WarnEntry): WarnEntry[] {
  ensureDataDir();
  let data: Record<string, WarnEntry[]> = {};
  if (fs.existsSync(WARNS_FILE)) {
    data = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf-8'));
  }
  if (!data[userId]) data[userId] = [];
  data[userId].push(entry);
  fs.writeFileSync(WARNS_FILE, JSON.stringify(data, null, 2));
  return data[userId];
}

export function clearWarns(userId: string): void {
  ensureDataDir();
  let data: Record<string, WarnEntry[]> = {};
  if (fs.existsSync(WARNS_FILE)) {
    data = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf-8'));
  }
  delete data[userId];
  fs.writeFileSync(WARNS_FILE, JSON.stringify(data, null, 2));
}

export interface ReactionMessage {
  channelId: string;
  messageId: string;
  guildId: string;
  emojiRoleMap: Record<string, string>;
}

export function getReactionMessages(): ReactionMessage[] {
  ensureDataDir();
  if (!fs.existsSync(REACTIONS_FILE)) return [];
  return JSON.parse(fs.readFileSync(REACTIONS_FILE, 'utf-8'));
}

export function saveReactionMessages(messages: ReactionMessage[]): void {
  ensureDataDir();
  fs.writeFileSync(REACTIONS_FILE, JSON.stringify(messages, null, 2));
}