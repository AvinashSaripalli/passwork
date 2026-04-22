const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/authMiddleware');
const vaultController = require('../controllers/vaultController');

router.get('/', authenticate, vaultController.getVaults);
router.post('/', authenticate, vaultController.createVault);
router.get('/:slug', authenticate, vaultController.getVaultBySlug);
router.post('/:id/share', authenticate, vaultController.shareVault);

module.exports = router;