const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');

const {
  sharePassword,
  getSharedWithMe,
  removePasswordShare,
} = require('../controllers/passwordShareController');

const router = express.Router();

router.use(authenticate);

router.get('/shared-with-me', getSharedWithMe);
router.post('/:passwordId/share', sharePassword);
router.delete('/:shareId', removePasswordShare);

module.exports = router;