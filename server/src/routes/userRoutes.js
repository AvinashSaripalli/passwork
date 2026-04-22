const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');

router.get('/', authenticate, userController.getUsers);
router.post('/', authenticate, userController.createUserByAdmin);
router.put('/:id', authenticate, userController.updateUser);
router.delete('/:id', authenticate, userController.deleteUser);

module.exports = router;