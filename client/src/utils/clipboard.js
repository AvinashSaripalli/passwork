import { showToast } from './toast';

const CLEAR_DELAY = 15 * 1000;

let clearTimer = null;

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

  clearTimer = setTimeout(clearClipboard, CLEAR_DELAY);
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

export function secureCopyText(value, message = 'Copied — clipboard clears in 15s') {
  if (!value) return;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        showToast(message);
        scheduleClear();
      })
      .catch(() => {
        fallbackCopy(value, message);
      });
  } else {
    fallbackCopy(value, message);
  }
}
