const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');

const {
  storeKeyPair,
  getPublicKey,
  getKeyPair,
  getWrappedItemKeys,
  reWrapItemKeys,
  getAllVaultWrappedKeys,
  reWrapVaultKeys,
} = require('../controllers/keyPairController');

const router = express.Router();

router.use(authenticate);

router.get('/me/wrapped-keys', getWrappedItemKeys);
router.get('/me/all-vault-wrapped-keys', getAllVaultWrappedKeys);
router.post('/me/re-wrap', reWrapItemKeys);
router.post('/me/re-wrap-vault-keys', reWrapVaultKeys);
router.post('/', storeKeyPair);
router.get('/', getKeyPair);
router.get('/:userId/public', getPublicKey);

module.exports = router;
