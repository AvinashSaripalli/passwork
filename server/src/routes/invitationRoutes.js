const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/authMiddleware');
const {
  sendInvitation,
  getPendingInvitations,
  getInvitationByToken,
} = require('../controllers/invitationController');

router.post('/', authenticate, sendInvitation);

// keep this BEFORE /:token
router.get('/pending/list', authenticate, getPendingInvitations);

router.get('/:token', getInvitationByToken);

module.exports = router;