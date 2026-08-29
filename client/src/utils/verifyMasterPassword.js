import api from '../services/api';
import {
  createMasterPasswordVerifier,
  verifyMasterPasswordLocally,
  MASTER_VERIFIER_STORAGE_KEY,
} from './crypto';

async function saveVerifier(masterPassword, salt) {
  try {
    const verifier = await createMasterPasswordVerifier(masterPassword, salt);
    sessionStorage.setItem(MASTER_VERIFIER_STORAGE_KEY, verifier);
  } catch {
    // unable to persist the verifier - local fallback still applies
  }
}

export async function verifyMasterPassword(
  enteredPassword,
  salt,
  { verifier, samples = [] } = {}
) {
  const effectiveVerifier =
    verifier === undefined
      ? sessionStorage.getItem(MASTER_VERIFIER_STORAGE_KEY)
      : verifier;

  const local = await verifyMasterPasswordLocally(enteredPassword, salt, {
    verifier: effectiveVerifier,
    samples,
  });

  if (local === true) {
    if (!effectiveVerifier) {
      await saveVerifier(enteredPassword, salt);
    }
    return true;
  }

  // A sample-based "false" is NOT definitive: owned items encrypted with
  // per-item AES keys can never validate locally. Only trust a negative
  // result when the cryptographic verifier exists.
  if (local === false && effectiveVerifier) {
    return false;
  }

  try {
    // This endpoint returns 401 when the entered master password is wrong —
    // NOT because the session token expired. Mark it so the axios interceptor
    // does not attempt a token refresh or force a logout on that 401.
    await api.post(
      '/auth/verify-master-password',
      { masterPassword: enteredPassword },
      { skipAuthRefresh: true }
    );
    await saveVerifier(enteredPassword, salt);
    return true;
  } catch {
    return false;
  }
}
