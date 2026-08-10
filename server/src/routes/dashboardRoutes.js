const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/authMiddleware');

const {
  getSecuritySummary,
  getPasswordActivityTrend,
  getRecentPasswords,
} = require('../controllers/dashboardController');

router.get('/security-summary', authenticate, getSecuritySummary);

router.get('/password-activity', authenticate, getPasswordActivityTrend);

router.get('/recent-passwords', authenticate, getRecentPasswords);


module.exports = router;