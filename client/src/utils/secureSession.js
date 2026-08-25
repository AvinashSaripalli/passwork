/**
 * In-memory store for sensitive session data.
 * Master password is never persisted. The verified flag is persisted
 * in sessionStorage so it survives page refresh but not tab close.
 */

const MASTER_VERIFIED_KEY = 'vaultix-master-verified';

const store = {
  masterPassword: null,
  adminMasterPassword: null,
  rsaPrivateKey: null,
  masterVerified: (() => {
    try {
      return sessionStorage.getItem(MASTER_VERIFIED_KEY) === 'true';
    } catch {
      return false;
    }
  })(),
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

export function getRsaPrivateKey() {
  return store.rsaPrivateKey;
}

export function setRsaPrivateKey(value) {
  store.rsaPrivateKey = value || null;
}

export function isMasterVerified() {
  return store.masterVerified;
}

export function setMasterVerifiedFlag(value) {
  store.masterVerified = !!value;
  try {
    if (value) {
      sessionStorage.setItem(MASTER_VERIFIED_KEY, 'true');
    } else {
      sessionStorage.removeItem(MASTER_VERIFIED_KEY);
    }
  } catch {
    // storage unavailable
  }
}

export function clearSecureSession() {
  store.masterPassword = null;
  store.adminMasterPassword = null;
  store.rsaPrivateKey = null;
  store.masterVerified = false;
  try {
    sessionStorage.removeItem(MASTER_VERIFIED_KEY);
  } catch {
    // ignore
  }
}

export function clearVerifierOnly() {
  try {
    sessionStorage.removeItem('masterPasswordVerifier');
  } catch {
    // ignore
  }
}
