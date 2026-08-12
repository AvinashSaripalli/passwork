const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');
const {
  authLimiter,
  sensitiveLimiter,
  masterPasswordLimiter,
} = require('../utils/rateLimiters');

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/me', authenticate, authController.me);
router.post('/set-master-password', authenticate, authController.setMasterPassword);
router.post('/verify-master-password', masterPasswordLimiter, authenticate, authController.verifyMasterPassword);
router.put('/me', authenticate, authController.updateProfile);
router.put('/change-password', sensitiveLimiter, authenticate, authController.changePassword);
router.put('/change-master-password', sensitiveLimiter, authenticate, authController.changeMasterPassword);
router.post('/reencrypt-passwords', authenticate, authController.reencryptPasswords);

module.exports = router;
