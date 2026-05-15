import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const BIRTHDAYS_FILE = path.join(DATA_DIR, 'birthdays.json');

export interface BirthdayEntry {
  userId: string;
  day: number;
  month: number;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readBirthdays(): Record<string, BirthdayEntry> {
  ensureDataDir();
  if (!fs.existsSync(BIRTHDAYS_FILE)) return {};
  return JSON.parse(fs.readFileSync(BIRTHDAYS_FILE, 'utf-8'));
}

function writeBirthdays(data: Record<string, BirthdayEntry>): void {
  ensureDataDir();
  fs.writeFileSync(BIRTHDAYS_FILE, JSON.stringify(data, null, 2));
}

export function registerBirthday(userId: string, day: number, month: number): BirthdayEntry {
  const birthdays = readBirthdays();
  birthdays[userId] = { userId, day, month };
  writeBirthdays(birthdays);
  return birthdays[userId];
}

export function removeBirthday(userId: string): void {
  const birthdays = readBirthdays();
  delete birthdays[userId];
  writeBirthdays(birthdays);
}

export function getBirthday(userId: string): BirthdayEntry | null {
  const birthdays = readBirthdays();
  return birthdays[userId] || null;
}

export function getBirthdaysByMonth(month: number): BirthdayEntry[] {
  const birthdays = readBirthdays();
  return Object.values(birthdays).filter((b) => b.month === month);
}

export function getTodayBirthdays(): BirthdayEntry[] {
  const now = new Date();
  return getBirthdaysByMonth(now.getMonth() + 1).filter(
    (b) => b.day === now.getDate()
  );
}

export function getAllBirthdays(): BirthdayEntry[] {
  return Object.values(readBirthdays());
}

export function formatBirthday(day: number, month: number): string {
  const months = [
    '', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return `${day} de ${months[month]}`;
}