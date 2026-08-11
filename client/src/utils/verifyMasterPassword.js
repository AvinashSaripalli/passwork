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

  if (local === false) {
    return false;
  }

  try {
    await api.post('/auth/verify-master-password', {
      masterPassword: enteredPassword,
    });
    await saveVerifier(enteredPassword, salt);
    return true;
  } catch {
    return false;
  }
}
