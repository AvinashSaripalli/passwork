const crypto = require('crypto');

const KDF_ITERATIONS = 600000;
const KDF_VERSION = 2;

// Mirror of the client-side PBKDF2-AES-GCM envelope used by
// client/src/utils/crypto.js (encryptPrivateKey/decryptPrivateKey). This lets
// the server decrypt a recovery-key escrow and re-encrypt the private key with
// a new master password, preserving the exact wire format the client expects.
//
// Format notes (must match the browser WebCrypto behaviour):
//  - The AES-GCM authentication tag is APPENDED to the ciphertext, so `content`
//    always holds [ciphertext || 16-byte tag]. This is what crypto.subtle
//    returns and what the client's encryptPrivateKey/decryptPrivateKey use.
function deriveKey(keyBytes, kdfSalt, iterations) {
  return crypto.pbkdf2Sync(keyBytes, kdfSalt, iterations || KDF_ITERATIONS, 32, 'sha256');
}

function encryptEnvelope(plaintext, password) {
  const kdfSalt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(Buffer.from(password, 'utf8'), kdfSalt);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // content = ciphertext || auth tag (matches client envelope format).
  const content = Buffer.concat([encrypted, tag]);

  return JSON.stringify({
    v: KDF_VERSION,
    kdf: 'PBKDF2',
    iterations: KDF_ITERATIONS,
    salt: Array.from(kdfSalt),
    iv: Array.from(iv),
    content: Array.from(content),
  });
}

function decryptEnvelope(envelope, password) {
  const parsed = typeof envelope === 'string' ? JSON.parse(envelope) : envelope;

  if (!parsed || !Array.isArray(parsed.salt) || !Array.isArray(parsed.iv) || !Array.isArray(parsed.content)) {
    throw new Error('INVALID_ENVELOPE');
  }

  const salt = Buffer.from(parsed.salt);
  const iv = Buffer.from(parsed.iv);
  let content = Buffer.from(parsed.content);
  const iterations = parsed.iterations || KDF_ITERATIONS;

  // Server-produced envelopes previously stored the tag separately; client
  // envelopes append it to content. Normalise by stripping the trailing
  // 16-byte auth tag from content.
  let tag;
  if (parsed.tag) {
    tag = Buffer.from(parsed.tag);
  } else {
    if (content.length < 16) throw new Error('INVALID_ENVELOPE');
    tag = content.subarray(content.length - 16);
    content = content.subarray(0, content.length - 16);
  }

  const key = deriveKey(Buffer.from(password, 'utf8'), salt, iterations);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);
  return decrypted.toString('utf8');
}

// Human-friendly recovery key if none is supplied (e.g. "XK7P-9M2Q-4TRH").
function generateRecoveryKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const groups = [];
  for (let g = 0; g < 3; g += 1) {
    let group = '';
    for (let i = 0; i < 4; i += 1) {
      group += alphabet[crypto.randomInt(alphabet.length)];
    }
    groups.push(group);
  }
  return groups.join('-');
}

module.exports = {
  encryptEnvelope,
  decryptEnvelope,
  generateRecoveryKey,
};
