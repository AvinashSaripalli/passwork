const TTL = 5 * 60 * 1000;

const editPasswordCache = new Map();

export function setCompanyPasswordEditCache(passwordId, data) {
  const entry = { data, expiresAt: Date.now() + TTL };
  editPasswordCache.set(passwordId, entry);
}

export function getCompanyPasswordEditCache(passwordId) {
  const entry = editPasswordCache.get(passwordId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    editPasswordCache.delete(passwordId);
    return null;
  }
  return entry.data || null;
}

export function clearCompanyPasswordEditCache(passwordId) {
  editPasswordCache.delete(passwordId);
}
