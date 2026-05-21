const editPasswordCache = new Map();

export function setCompanyPasswordEditCache(passwordId, data) {
  editPasswordCache.set(passwordId, data);
}

export function getCompanyPasswordEditCache(passwordId) {
  return editPasswordCache.get(passwordId) || null;
}

export function clearCompanyPasswordEditCache(passwordId) {
  editPasswordCache.delete(passwordId);
}