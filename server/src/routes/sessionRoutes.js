const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { getActiveSessions, revokeSession, revokeAllSessions } = require('../controllers/sessionController');

router.get('/', authenticate, getActiveSessions);
router.delete('/:sessionId', authenticate, revokeSession);
router.delete('/', authenticate, revokeAllSessions);

module.exports = router;
