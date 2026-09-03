const OTPAuth = require('otpauth');
const QRCode = require('qrcode');
const crypto = require('crypto');

const ISSUER = 'Vaultix';

function generateTOTPSecret(email) {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

function verifyTOTP(secret, token) {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

async function generateQRCode(uri) {
  return QRCode.toDataURL(uri, {
    width: 256,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(5);
    const code = bytes
      .toString('hex')
      .toUpperCase()
      .match(/.{1,4}/g)
      .join('-');
    codes.push(code);
  }
  return codes;
}

function hashBackupCode(code) {
  return crypto.createHash('sha256').update(code.toLowerCase().replace(/-/g, '')).digest('hex');
}

function verifyBackupCode(code, hashedCodes) {
  const hash = hashBackupCode(code);
  const index = hashedCodes.indexOf(hash);
  if (index === -1) return false;
  hashedCodes.splice(index, 1);
  return true;
}

module.exports = {
  generateTOTPSecret,
  verifyTOTP,
  generateQRCode,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
};
