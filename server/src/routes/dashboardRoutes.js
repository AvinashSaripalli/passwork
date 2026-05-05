const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/authMiddleware');

const {
  getSecuritySummary,
  getPasswordActivityTrend,
  getRecentPasswords,
  getPasswordHealthBreakdown,
  getVaultPasswordCounts,
  getRecentActivityTimeline,
} = require('../controllers/dashboardController');

router.get('/security-summary', authenticate, getSecuritySummary);
router.get('/password-activity', authenticate, getPasswordActivityTrend);
router.get('/recent-passwords', authenticate, getRecentPasswords);
router.get('/password-health', authenticate, getPasswordHealthBreakdown);
router.get('/vault-counts', authenticate, getVaultPasswordCounts);
router.get('/recent-activity', authenticate, getRecentActivityTimeline);

module.exports = router;