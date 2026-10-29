/**
 * Copy without assuming the async Clipboard API is allowed. If the browser
 * refuses it, fall back to selecting a temporary textarea so the action still
 * works on older or locked-down browsers.
 */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText !== undefined) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the selection-based copy.
  }

  try {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const field = document.createElement('textarea');

    try {
      field.value = value;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.top = '0';
      field.style.opacity = '0';
      document.body.append(field);
      field.select();

      return document.execCommand('copy');
    } finally {
      field.remove();
      active?.focus();
    }
  } catch {
    return false;
  }
}
