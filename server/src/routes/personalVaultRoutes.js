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
  restoreMyVaultPassword,
  purgeMyVaultPassword,
  getMyVaultTrash,
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
router.post('/passwords/:passwordId/restore', restoreMyVaultPassword);
router.delete('/passwords/:passwordId/purge', purgeMyVaultPassword);
router.get('/trash', getMyVaultTrash);

router.get('/passwords/:passwordId/shares', getPasswordShares);

module.exports = router;