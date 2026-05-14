export function parseTime(timeStr: string): number | null {
  const match = timeStr.toLowerCase().match(/^(\d+)(s|m|h|d|w)$/);
  if (!match) return null;

  const amount = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's': return amount * 1000;
    case 'm': return amount * 60 * 1000;
    case 'h': return amount * 60 * 60 * 1000;
    case 'd': return amount * 24 * 60 * 60 * 1000;
    case 'w': return amount * 7 * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

export function formatTimeString(timeStr: string): string | null {
  const ms = parseTime(timeStr);
  if (!ms) return null;
  return formatTime(ms);
}