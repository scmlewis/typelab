export function backupFileName(date = new Date()): string {
  return `typelab-backup-${isoDate(date)}.json`;
}

export function csvFileName(date = new Date()): string {
  return `typelab-history-${isoDate(date)}.csv`;
}

export function downloadText(
  filename: string,
  contents: string,
  type = 'application/json;charset=utf-8',
): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.click();
  URL.revokeObjectURL(url);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
