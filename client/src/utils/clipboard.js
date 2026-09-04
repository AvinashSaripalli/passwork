import { showToast } from './toast';

const CLEAR_DELAY_KEY = 'vaultix_clipboard_clear_delay';
const DEFAULT_CLEAR_DELAY = 15 * 1000;

let clearTimer = null;

function getClearDelay() {
  try {
    const stored = parseInt(localStorage.getItem(CLEAR_DELAY_KEY), 10);
    return !isNaN(stored) && stored > 0 ? stored * 1000 : DEFAULT_CLEAR_DELAY;
  } catch {
    return DEFAULT_CLEAR_DELAY;
  }
}

function clearClipboard() {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }

  window.removeEventListener('blur', clearClipboard);

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText('').catch(() => {});
  }
}

function scheduleClear() {
  if (clearTimer) clearTimeout(clearTimer);

  clearTimer = setTimeout(clearClipboard, getClearDelay());
  window.addEventListener('blur', clearClipboard);
}

function fallbackCopy(value, message) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast(message);
    scheduleClear();
  } catch {
    showToast('Copy failed', 'error');
  }
}

export function secureCopyText(value, message) {
  if (!value) return;

  const delaySecs = Math.round(getClearDelay() / 1000);
  const defaultMsg = `Copied — clipboard clears in ${delaySecs}s`;
  const finalMessage = message || defaultMsg;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        showToast(finalMessage);
        scheduleClear();
      })
      .catch(() => {
        fallbackCopy(value, finalMessage);
      });
  } else {
    fallbackCopy(value, finalMessage);
  }
}
