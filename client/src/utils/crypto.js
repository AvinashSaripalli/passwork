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

export async function encryptFields(fields, masterPassword, salt) {
  if (!fields) return '';
  const keys = Object.keys(fields).filter((key) => fields[key]);
  if (keys.length === 0) return '';
  return encryptText(JSON.stringify(fields), masterPassword, salt);
}

export async function decryptFields(encryptedFields, masterPassword, salt) {
  if (!encryptedFields) return null;

  try {
    const decrypted = await decryptText(encryptedFields, masterPassword, salt);
    return decrypted ? JSON.parse(decrypted) : null;
  } catch {
    return null;
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

function base32ToBytes(base32) {
  if (!base32) return new Uint8Array();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = base32.toUpperCase().replace(/=+$/, '').replace(/[\s-]/g, '');
  let bits = '';
  for (let i = 0; i < cleaned.length; i++) {
    const val = alphabet.indexOf(cleaned[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

export async function generateTOTP(secret, stepSeconds = 30) {
  if (!secret || typeof secret !== 'string') return null;
  try {
    const keyBytes = base32ToBytes(secret);
    if (keyBytes.length === 0) return null;
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = Math.floor(epoch / stepSeconds);
    const secondsRemaining = stepSeconds - (epoch % stepSeconds);

    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setBigUint64(0, BigInt(timeStep), false);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: { name: 'SHA-1' } },
      false,
      ['sign']
    );

    const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, timeBuffer);
    const signatureBytes = new Uint8Array(signature);
    const offset = signatureBytes[signatureBytes.length - 1] & 0xf;
    const code =
      ((signatureBytes[offset] & 0x7f) << 24) |
      ((signatureBytes[offset + 1] & 0xff) << 16) |
      ((signatureBytes[offset + 2] & 0xff) << 8) |
      (signatureBytes[offset + 3] & 0xff);

    const otp = (code % 1000000).toString().padStart(6, '0');
    return { code: otp, secondsRemaining };
  } catch {
    return null;
  }
}