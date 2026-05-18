const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');

const {
  getNotifications,
  getRecentNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/notificationController');

const router = express.Router();

router.get('/', authenticate, getNotifications);
router.get('/recent', authenticate, getRecentNotifications);

// IMPORTANT: keep this before /:id/read
router.patch('/mark-all-read', authenticate, markAllNotificationsRead);

router.patch('/:id/read', authenticate, markNotificationRead);

module.exports = router;