const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/authMiddleware');
const activityController = require('../controllers/activityController');

router.get('/', authenticate, activityController.getAllActivityLogs);
router.get('/vault/:vaultId', authenticate, activityController.getVaultActivityLogs);

module.exports = router;