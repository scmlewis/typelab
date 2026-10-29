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
  downloadBlob(filename, new Blob([contents], { type }));
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Some engines still read the URL after click(); revoke on the next task.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
