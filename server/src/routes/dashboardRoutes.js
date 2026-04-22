const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

router.get('/security', authenticate, dashboardController.getSecurityDashboard);

module.exports = router;