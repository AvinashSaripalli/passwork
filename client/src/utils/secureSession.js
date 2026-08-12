/**
 * In-memory store for sensitive session data.
 * Never persisted to localStorage/sessionStorage — cleared on tab close or lock.
 */

const store = {
  masterPassword: null,
  adminMasterPassword: null,
  masterVerified: false,
};

export function getMasterPassword() {
  return store.masterPassword;
}

export function setMasterPassword(value) {
  store.masterPassword = value || null;
}

export function getAdminMasterPassword() {
  return store.adminMasterPassword;
}

export function setAdminMasterPassword(value) {
  store.adminMasterPassword = value || null;
}

export function isMasterVerified() {
  return store.masterVerified;
}

export function setMasterVerifiedFlag(value) {
  store.masterVerified = !!value;
}

export function clearSecureSession() {
  store.masterPassword = null;
  store.adminMasterPassword = null;
  store.masterVerified = false;
}

export function clearVerifierOnly() {
  try {
    sessionStorage.removeItem('masterPasswordVerifier');
  } catch {
    // ignore
  }
}
