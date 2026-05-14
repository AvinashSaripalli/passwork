const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');

const {
  getShareableUsers,
  getUsers,
  createUserByAdmin,
  updateUser,
  deleteUser,
} = require('../controllers/userController');

const router = express.Router();

router.get('/shareable', authenticate, getShareableUsers);

router.get('/', authenticate, getUsers);
router.post('/', authenticate, createUserByAdmin);
router.put('/:id', authenticate, updateUser);
router.delete('/:id', authenticate, deleteUser);

module.exports = router;