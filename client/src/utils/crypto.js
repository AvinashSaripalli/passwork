const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getSaltBytes(salt) {
  return encoder.encode(salt || 'vault-salt');
}

export function isEncryptedFormat(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed.iv) && Array.isArray(parsed.content);
  } catch {
    return false;
  }
}

export async function encryptText(text, masterPassword, salt) {
  if (!text) return '';

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: getSaltBytes(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(text)
  );

  return JSON.stringify({
    iv: Array.from(iv),
    content: Array.from(new Uint8Array(encrypted)),
  });
}

export async function decryptText(encryptedText, masterPassword, salt) {
  if (!encryptedText) return '';

  const parsed = JSON.parse(encryptedText);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: getSaltBytes(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(parsed.iv),
    },
    key,
    new Uint8Array(parsed.content)
  );

  return decoder.decode(decrypted);
}

export async function safeDecryptText(encryptedText, masterPassword, salt) {
  if (!encryptedText) return '';

  try {
    const parsed = JSON.parse(encryptedText);

    if (!parsed.iv || !parsed.content) {
      return encryptedText;
    }

    return await decryptText(encryptedText, masterPassword, salt);
  } catch {
    return encryptedText;
  }
}

export const MASTER_VERIFIER_MARKER = 'vaultix-master-verifier';

export const MASTER_VERIFIER_STORAGE_KEY = 'masterPasswordVerifier';

export async function createMasterPasswordVerifier(masterPassword, salt) {
  return encryptText(MASTER_VERIFIER_MARKER, masterPassword, salt);
}

export async function verifyMasterPasswordLocally(
  enteredPassword,
  salt,
  { verifier, samples = [] } = {}
) {
  if (verifier) {
    try {
      const plain = await decryptText(verifier, enteredPassword, salt);
      return plain === MASTER_VERIFIER_MARKER;
    } catch {
      return false;
    }
  }

  let hasCandidates = false;

  for (const sample of samples) {
    if (!sample) continue;

    const encrypted = typeof sample === 'string' ? sample : sample.encrypted;
    const sampleSalt = typeof sample === 'string' ? salt : sample.salt || salt;

    if (!isEncryptedFormat(encrypted)) continue;

    hasCandidates = true;

    try {
      await decryptText(encrypted, enteredPassword, sampleSalt);
      return true;
    } catch {
      // try the next sample
    }
  }

  return hasCandidates ? false : null;
}