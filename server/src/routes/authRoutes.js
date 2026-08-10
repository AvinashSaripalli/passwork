const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many attempts. Please try again later.' },
});

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many attempts. Please try again later.' },
});

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/me', authenticate, authController.me);
router.post('/set-master-password', authenticate, authController.setMasterPassword);
router.post('/verify-master-password', authLimiter, authenticate, authController.verifyMasterPassword);
router.post('/verify-admin-master-password', authLimiter, authenticate, authController.verifyAdministratorMasterPassword);
router.put('/me', authenticate, authController.updateProfile);
router.put('/change-password', sensitiveLimiter, authenticate, authController.changePassword);
router.put('/change-master-password', sensitiveLimiter, authenticate, authController.changeMasterPassword);
router.post('/reencrypt-passwords', authenticate, authController.reencryptPasswords);

module.exports = router;