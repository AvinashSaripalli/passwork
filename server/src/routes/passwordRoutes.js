const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/authMiddleware');
const passwordController = require('../controllers/passwordController');

router.post('/', authenticate, passwordController.createPassword);

router.post('/import-excel', authenticate, passwordController.importPasswordsFromExcel);
router.get('/export-excel', authenticate, passwordController.exportPasswordsToExcel);

router.get('/vault/:vaultId', authenticate, passwordController.getPasswordsByVault);
router.get('/:id', authenticate, passwordController.getPasswordById);
router.put('/:id', authenticate, passwordController.updatePassword);
router.delete('/:id', authenticate, passwordController.deletePassword);
router.post('/:id/copy-log', authenticate, passwordController.logCopyPassword);

module.exports = router;