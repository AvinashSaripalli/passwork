const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');

const {
  getOrCreateMyVault,
  createMyVaultFolder,
  getMyVaultFolders,
  createMyVaultPassword,
  getMyVaultPasswords,
  updateMyVaultFolder,
  deleteMyVaultFolder,
  updateMyVaultPassword,
  deleteMyVaultPassword,
  getPasswordShares,
} = require('../controllers/personalVaultController');

const router = express.Router();

router.use(authenticate);

router.get('/', getOrCreateMyVault);

router.get('/folders', getMyVaultFolders);
router.post('/folders', createMyVaultFolder);
router.put('/folders/:folderId', updateMyVaultFolder);
router.delete('/folders/:folderId', deleteMyVaultFolder);

router.get('/passwords', getMyVaultPasswords);
router.post('/passwords', createMyVaultPassword);
router.put('/passwords/:passwordId', updateMyVaultPassword);
router.delete('/passwords/:passwordId', deleteMyVaultPassword);

router.get('/passwords/:passwordId/shares', getPasswordShares);

module.exports = router;