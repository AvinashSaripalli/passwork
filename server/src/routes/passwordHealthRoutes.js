const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { getPasswordHealth } = require('../controllers/passwordHealthController');

router.get('/', authenticate, getPasswordHealth);

module.exports = router;
