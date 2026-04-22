const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.me);
router.post('/set-master-password', authenticate, authController.setMasterPassword);
router.post('/verify-master-password', authenticate, authController.verifyMasterPassword);
router.post('/verify-admin-master-password',authenticate, authController.verifyAdministratorMasterPassword);


module.exports = router;