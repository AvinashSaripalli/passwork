const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getSaltBytes(salt) {
  return encoder.encode(salt || 'vault-salt');
}

async function deriveKey(masterPassword, salt, usages) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: getSaltBytes(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usages
  );
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

export async function decryptText(encryptedText, masterPassword, salt) {
  if (!encryptedText) return '';
  const parsed = JSON.parse(encryptedText);
  const key = await deriveKey(masterPassword, salt, ['decrypt']);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(parsed.iv) },
    key,
    new Uint8Array(parsed.content)
  );
  return decoder.decode(plain);
}

export async function safeDecryptText(encryptedText, masterPassword, salt) {
  if (!isEncryptedFormat(encryptedText)) return encryptedText || '';
  try {
    return await decryptText(encryptedText, masterPassword, salt);
  } catch {
    return '';
  }
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

export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return { publicKeyJwk, privateKeyJwk };
}

async function getDeriveKeyForPrivateKey(masterPassword, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: getSaltBytes(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPrivateKey(privateKeyJwk, masterPassword, salt) {
  const aesKey = await getDeriveKeyForPrivateKey(masterPassword, salt);
  const privateKeyData = encoder.encode(JSON.stringify(privateKeyJwk));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    privateKeyData
  );
  return JSON.stringify({
    iv: Array.from(iv),
    content: Array.from(new Uint8Array(encrypted)),
  });
}

export async function decryptPrivateKey(encryptedPrivateKeyStr, masterPassword, salt) {
  const aesKey = await getDeriveKeyForPrivateKey(masterPassword, salt);
  const parsed = JSON.parse(encryptedPrivateKeyStr);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(parsed.iv) },
    aesKey,
    new Uint8Array(parsed.content)
  );
  return JSON.parse(decoder.decode(decrypted));
}

async function importPublicKey(publicKeyJwk) {
  return crypto.subtle.importKey(
    'jwk',
    publicKeyJwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );
}

async function importPrivateKey(privateKeyJwk) {
  return crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );
}

export async function rsaEncrypt(plaintext, publicKeyJwk) {
  const publicKey = await importPublicKey(publicKeyJwk);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    encoder.encode(plaintext)
  );
  return JSON.stringify(Array.from(new Uint8Array(encrypted)));
}

export async function rsaDecrypt(ciphertextStr, privateKeyJwk) {
  const privateKey = await importPrivateKey(privateKeyJwk);
  const ciphertext = new Uint8Array(JSON.parse(ciphertextStr));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    ciphertext
  );
  return decoder.decode(decrypted);
}

export async function reWrapItemKey(encryptedItemKeyStr, oldPrivateKeyJwk, newPublicKeyJwk) {
  const aesKeyJson = await rsaDecrypt(encryptedItemKeyStr, oldPrivateKeyJwk);
  return rsaEncrypt(aesKeyJson, newPublicKeyJwk);
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
    new DataView(timeBuffer).setBigUint64(0, BigInt(timeStep), false);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: { name: 'SHA-1' } },
      false,
      ['sign']
    );

    const signature = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, timeBuffer));
    const offset = signature[signature.length - 1] & 0xf;
    const code =
      ((signature[offset] & 0x7f) << 24) |
      ((signature[offset + 1] & 0xff) << 16) |
      ((signature[offset + 2] & 0xff) << 8) |
      (signature[offset + 3] & 0xff);

    return { code: (code % 1000000).toString().padStart(6, '0'), secondsRemaining };
  } catch {
    return null;
  }
}
