import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const TEMP_ACTIONS_FILE = path.join(DATA_DIR, 'tempActions.json');

export interface TempAction {
  type: 'mute' | 'ban';
  userId: string;
  userTag: string;
  guildId: string;
  moderatorId: string;
  moderatorTag: string;
  reason: string;
  startTime: number;
  duration: number;
  endTime: number;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getTempActions(): TempAction[] {
  ensureDataDir();
  if (!fs.existsSync(TEMP_ACTIONS_FILE)) return [];
  const data = JSON.parse(fs.readFileSync(TEMP_ACTIONS_FILE, 'utf-8'));
  return data.filter((a: TempAction) => a.endTime > Date.now());
}

export function addTempAction(action: TempAction): void {
  ensureDataDir();
  let actions: TempAction[] = [];
  if (fs.existsSync(TEMP_ACTIONS_FILE)) {
    actions = JSON.parse(fs.readFileSync(TEMP_ACTIONS_FILE, 'utf-8'));
  }
  actions = actions.filter((a: TempAction) => a.endTime > Date.now());
  actions.push(action);
  fs.writeFileSync(TEMP_ACTIONS_FILE, JSON.stringify(actions, null, 2));
}

export function removeTempAction(userId: string, type: 'mute' | 'ban'): void {
  ensureDataDir();
  let actions: TempAction[] = [];
  if (fs.existsSync(TEMP_ACTIONS_FILE)) {
    actions = JSON.parse(fs.readFileSync(TEMP_ACTIONS_FILE, 'utf-8'));
  }
  actions = actions.filter((a: TempAction) => !(a.userId === userId && a.type === type));
  fs.writeFileSync(TEMP_ACTIONS_FILE, JSON.stringify(actions, null, 2));
}

export function getActiveAction(userId: string, type: 'mute' | 'ban'): TempAction | undefined {
  const actions = getTempActions();
  return actions.find((a) => a.userId === userId && a.type === type);
}