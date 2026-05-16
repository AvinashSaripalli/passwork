const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');
const {
  getLoginActivities,
} = require('../controllers/loginActivityController');

const router = express.Router();

router.get('/', authenticate, getLoginActivities);

module.exports = router;