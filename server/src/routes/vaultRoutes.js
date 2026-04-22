const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/authMiddleware');
const vaultController = require('../controllers/vaultController');

router.get('/', authenticate, vaultController.getVaults);
router.post('/', authenticate, vaultController.createVault);
router.get('/:id', authenticate, vaultController.getVaultById);

// ❌ REMOVE VAULT SHARE (we use folder share now)
router.post('/:id/share', authenticate, vaultController.shareVault);

module.exports = router;