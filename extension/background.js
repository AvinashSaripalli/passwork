const DEFAULT_URL = 'https://knbitrix.duckdns.org';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'VAULTIX_LOG' || !msg.passwordId) return;

  (async () => {
    try {
      const sync = await chrome.storage.sync.get('baseUrl');
      const local = await chrome.storage.local.get('token');
      const baseUrl = (sync.baseUrl || DEFAULT_URL).replace(/\/+$/, '');

      if (!local.token) {
        sendResponse({ ok: false, reason: 'not-signed-in' });
        return;
      }

      const res = await fetch(
        `${baseUrl}/api/v1/passwords/${msg.passwordId}/copy-log`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${local.token}` },
        }
      );
      sendResponse({ ok: res.ok });
    } catch {
      sendResponse({ ok: false });
    }
  })();

  return true;
});
