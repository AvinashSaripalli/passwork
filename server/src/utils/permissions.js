const prisma = require('../config/prisma');

const isAdminUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === 'ADMIN';
};

const getFolderAccess = async (folderId, userId) => {
  const admin = await isAdminUser(userId);
  if (admin) return 'ADMINISTRATOR';

  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      permissions: true,
      vault: true,
    },
  });

  if (!folder) return null;

  if (folder.vault.ownerId === userId) {
    return 'ADMINISTRATOR';
  }

  const permission = folder.permissions.find((item) => item.userId === userId);
  return permission ? permission.accessLevel : null;
};

const getVaultAccess = async (vaultId, userId) => {
  const admin = await isAdminUser(userId);
  if (admin) return 'ADMIN';

  const vault = await prisma.vault.findUnique({
    where: { id: vaultId },
    include: {
      permissions: true,
    },
  });

  if (!vault) return null;

  if (vault.ownerId === userId) {
    return 'ADMIN';
  }

  const permission = vault.permissions.find((item) => item.userId === userId);
  return permission ? permission.accessLevel : null;
};

const requireFolderAccess = (allowedLevels = []) => {
  return async (req, res, next) => {
    try {
      const body = req.body || {};

      let folderId =
        req.params?.folderId ||
        req.params?.id ||
        body.folderId ||
        body.id ||
        req.passwordEntry?.folderId;

      if (!folderId && req.params?.id) {
        const password = await prisma.passwordEntry.findUnique({
          where: { id: req.params.id },
          select: { folderId: true },
        });

        if (password) {
          folderId = password.folderId;
        }
      }

      if (!folderId) {
        return res.status(400).json({ message: 'Folder id is required' });
      }

      const access = await getFolderAccess(folderId, req.user.id);

      if (!access || !allowedLevels.includes(access)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      req.folderAccess = access;
      req.folderId = folderId;

      next();
    } catch (error) {
      console.error('Folder permission error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
};

module.exports = {
  isAdminUser,
  getVaultAccess,
  getFolderAccess,
  requireFolderAccess,
};