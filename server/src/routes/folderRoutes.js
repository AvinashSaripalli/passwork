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
  getFolderWrapRecipients,
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
  requireFolderAccess(['ADMIN']),
  updateFolder
);

router.post(
  '/:id/share',
  authenticate,
  requireFolderAccess(['ADMIN']),
  shareFolder
);

router.get(
  '/:id/history',
  authenticate,
  requireFolderAccess(['ADMIN', 'EDITOR', 'VIEWER', 'MANAGER']),
  getFolderActivityLogs
);

router.delete(
  '/:id',
  authenticate,
  requireFolderAccess(['ADMIN']),
  deleteFolder
);

router.get(
  '/:id/wrap-recipients',
  authenticate,
  getFolderWrapRecipients
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