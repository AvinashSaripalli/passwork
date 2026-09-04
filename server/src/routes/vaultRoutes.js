const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/authMiddleware');
const vaultController = require('../controllers/vaultController');

router.get('/', authenticate, vaultController.getVaults);
router.post('/', authenticate, vaultController.createVault);
router.get('/:slug', authenticate, vaultController.getVaultBySlug);
router.post('/:id/share', authenticate, vaultController.shareVault);
router.post('/:id/unshare', authenticate, vaultController.unshareVault);
router.get('/:id/policy', authenticate, vaultController.getVaultPolicy);
router.put('/:id/policy', authenticate, vaultController.setVaultPolicy);

module.exports = router;