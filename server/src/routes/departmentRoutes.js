const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/authMiddleware');
const departmentController = require('../controllers/departmentController');

router.use(authenticate);

router.get('/', departmentController.getDepartments);
router.post('/', departmentController.createDepartment);
router.put('/:id', departmentController.updateDepartment);
router.delete('/:id', departmentController.deleteDepartment);
router.post('/:id/members', departmentController.addMember);
router.put('/:id/members/:userId', departmentController.updateMember);
router.delete('/:id/members/:userId', departmentController.removeMember);
router.post('/:id/grants', departmentController.createGrant);
router.delete('/:id/grants/:grantId', departmentController.deleteGrant);

module.exports = router;
