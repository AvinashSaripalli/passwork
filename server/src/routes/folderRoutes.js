const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/authMiddleware');
const {
  createFolder,
  getFoldersByVault,
  updateFolder,
  shareFolder,
  getFolderActivityLogs,
  deleteFolder,
  getFolderById,
  updateFolderPermission,
  deleteFolderPermission,
} = require('../controllers/folderController');
const { requireFolderAccess } = require('../utils/permissions');

router.post(
  '/',
  authenticate,
  createFolder
);

router.get(
  '/vault/:vaultId',
  authenticate,
  getFoldersByVault
);

router.put(
  '/:id',
  authenticate,
  requireFolderAccess(['ADMINISTRATOR']),
  updateFolder
);

router.post(
  '/:id/share',
  authenticate,
  requireFolderAccess(['ADMINISTRATOR']),
  shareFolder
);

router.get(
  '/:id/history',
  authenticate,
  requireFolderAccess(['ADMINISTRATOR', 'FULL_ACCESS', 'READ_ONLY', 'EDIT_ONLY']),
  getFolderActivityLogs
);

router.delete(
  '/:id',
  authenticate,
  requireFolderAccess(['ADMINISTRATOR']),
  deleteFolder
);

router.get(
  '/:id',
  authenticate,
  getFolderById
);

router.put(
  '/permissions/:id',
  authenticate,
  updateFolderPermission
);

router.delete(
  '/permissions/:id',
  authenticate,
  deleteFolderPermission
);

module.exports = router;