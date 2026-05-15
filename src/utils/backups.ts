import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

export interface RoleBackup {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
  permissions: string[];
  position: number;
}

export interface ChannelBackup {
  id: string;
  name: string;
  type: number;
  topic: string | null;
  parentId: string | null;
  permissionOverwrites: {
    id: string;
    allow: string[];
    deny: string[];
  }[];
}

export interface GuildBackup {
  id: string;
  guildId: string;
  guildName: string;
  timestamp: string;
  createdBy: string;
  roles: RoleBackup[];
  channels: ChannelBackup[];
}

function ensureBackupsDir(guildId: string): string {
  const guildDir = path.join(BACKUPS_DIR, guildId);
  if (!fs.existsSync(guildDir)) {
    fs.mkdirSync(guildDir, { recursive: true });
  }
  return guildDir;
}

export function saveBackup(backup: GuildBackup): string {
  const guildDir = ensureBackupsDir(backup.guildId);
  const filename = `backup_${backup.timestamp.replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(guildDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
  return backup.id;
}

export function getBackups(guildId: string): GuildBackup[] {
  const guildDir = path.join(BACKUPS_DIR, guildId);
  if (!fs.existsSync(guildDir)) return [];

  const files = fs.readdirSync(guildDir).filter((f) => f.endsWith('.json'));
  return files
    .map((f) => {
      const content = fs.readFileSync(path.join(guildDir, f), 'utf-8');
      return JSON.parse(content) as GuildBackup;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getBackupById(guildId: string, backupId: string): GuildBackup | null {
  const backups = getBackups(guildId);
  return backups.find((b) => b.id === backupId) || null;
}

export function deleteBackup(guildId: string, backupId: string): boolean {
  const guildDir = path.join(BACKUPS_DIR, guildId);
  if (!fs.existsSync(guildDir)) return false;

  const files = fs.readdirSync(guildDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(guildDir, file), 'utf-8');
    const backup = JSON.parse(content) as GuildBackup;
    if (backup.id === backupId) {
      fs.unlinkSync(path.join(guildDir, file));
      return true;
    }
  }
  return false;
}