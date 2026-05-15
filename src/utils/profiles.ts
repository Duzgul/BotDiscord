import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');

export interface UserProfile {
  userId: string;
  voiceTimeSeconds: number;
  voiceJoinTimestamp: number | null;
  messages: number;
  birthday: string | null; // DD/MM format
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readProfiles(): Record<string, UserProfile> {
  ensureDataDir();
  if (!fs.existsSync(PROFILES_FILE)) return {};
  return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8'));
}

function writeProfiles(data: Record<string, UserProfile>): void {
  ensureDataDir();
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(data, null, 2));
}

export function getProfile(userId: string): UserProfile {
  const profiles = readProfiles();
  return profiles[userId] || {
    userId,
    voiceTimeSeconds: 0,
    voiceJoinTimestamp: null,
    messages: 0,
    birthday: null,
  };
}

export function updateProfile(userId: string, updates: Partial<UserProfile>): UserProfile {
  const profiles = readProfiles();
  if (!profiles[userId]) {
    profiles[userId] = { userId, voiceTimeSeconds: 0, voiceJoinTimestamp: null, messages: 0, birthday: null };
  }
  profiles[userId] = { ...profiles[userId], ...updates };
  writeProfiles(profiles);
  return profiles[userId];
}

export function addVoiceTime(userId: string, seconds: number): void {
  const profile = getProfile(userId);
  profile.voiceTimeSeconds += seconds;
  updateProfile(userId, { voiceTimeSeconds: profile.voiceTimeSeconds });
}

export function setVoiceJoin(userId: string, timestamp: number | null): void {
  updateProfile(userId, { voiceJoinTimestamp: timestamp });
}

export function getVoiceJoinTimestamp(userId: string): number | null {
  return getProfile(userId).voiceJoinTimestamp;
}

export function formatVoiceTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}