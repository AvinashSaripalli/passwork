const express = require('express');
const router = express.Router();

const twoFactorController = require('../controllers/twoFactorController');
const { authenticate } = require('../middlewares/authMiddleware');
const { sensitiveLimiter } = require('../utils/rateLimiters');

// ─── TOTP ──────────────────────────────────────────────────────────────────
router.get('/totp/status', authenticate, twoFactorController.getTOTPStatus);
router.post('/totp/setup', authenticate, twoFactorController.setupTOTP);
router.post(
  '/totp/verify-enable',
  sensitiveLimiter,
  authenticate,
  twoFactorController.verifyAndEnableTOTP
);
router.post('/totp/disable', sensitiveLimiter, authenticate, twoFactorController.disableTOTP);
router.post(
  '/totp/regenerate-backup-codes',
  sensitiveLimiter,
  authenticate,
  twoFactorController.regenerateBackupCodes
);

// ─── WebAuthn ──────────────────────────────────────────────────────────────
router.post('/webauthn/register-begin', authenticate, twoFactorController.webAuthnRegisterBegin);
router.post('/webauthn/register-finish', authenticate, twoFactorController.webAuthnRegisterFinish);
router.post('/webauthn/authenticate-begin', twoFactorController.webAuthnAuthenticateBegin);
router.post('/webauthn/authenticate-finish', twoFactorController.webAuthnAuthenticateFinish);
router.get('/webauthn/credentials', authenticate, twoFactorController.getWebAuthnCredentials);
router.delete(
  '/webauthn/credentials/:credentialId',
  authenticate,
  twoFactorController.removeWebAuthnCredential
);

// ─── Vault Timeout ─────────────────────────────────────────────────────────
router.get('/vault-timeout', authenticate, twoFactorController.getVaultTimeout);
router.put('/vault-timeout', authenticate, twoFactorController.updateVaultTimeout);

module.exports = router;
