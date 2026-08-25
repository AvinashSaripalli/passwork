const prisma = require('../config/prisma');

const VAULT_LEVEL_RANK = {
  READ_ONLY: 0,
  READ_WRITE: 1,
  DELETE: 2,
  ADMIN: 3,
};

const FOLDER_LEVEL_RANK = {
  READ_ONLY: 0,
  EDIT_ONLY: 1,
  FULL_ACCESS: 2,
  ADMINISTRATOR: 3,
};

const DEPT_TO_FOLDER_MAP = {
  READ_ONLY: 'READ_ONLY',
  READ_WRITE: 'FULL_ACCESS',
  DELETE: 'FULL_ACCESS',
  ADMIN: 'ADMINISTRATOR',
};

const isAdminUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === 'ADMIN';
};

const getUserDepartmentIds = async (userId) => {
  const memberships = await prisma.departmentMember.findMany({
    where: { userId },
    select: { departmentId: true },
  });

  return memberships.map((membership) => membership.departmentId);
};

const getDepartmentIdsWithAncestors = async (departmentIds) => {
  if (!departmentIds.length) return [];

  const allDepartments = await prisma.department.findMany({
    select: { id: true, parentId: true },
  });

  const parentMap = new Map(allDepartments.map((d) => [d.id, d.parentId]));
  const result = new Set();

  for (const startId of departmentIds) {
    let currentId = startId;
    const guard = new Set();

    while (currentId && !guard.has(currentId)) {
      guard.add(currentId);
      result.add(currentId);
      currentId = parentMap.get(currentId) || null;
    }
  }

  return [...result];
};

const getHighestVaultLevel = (levels) =>
  levels.reduce(
    (best, level) =>
      level && (!best || VAULT_LEVEL_RANK[level] > VAULT_LEVEL_RANK[best]) ? level : best,
    null
  );

const getHighestFolderLevel = (levels) =>
  levels.reduce(
    (best, level) =>
      level && (!best || FOLDER_LEVEL_RANK[level] > FOLDER_LEVEL_RANK[best]) ? level : best,
    null
  );

const getDepartmentVaultAccess = async (vaultId, userId) => {
  const memberOfIds = await getUserDepartmentIds(userId);

  if (!memberOfIds.length) return null;

  const departmentIds = await getDepartmentIdsWithAncestors(memberOfIds);

  const grant = await prisma.departmentPermission.findFirst({
    where: {
      vaultId,
      departmentId: { in: departmentIds },
    },
    orderBy: { createdAt: 'asc' },
  });

  return grant ? grant.accessLevel : null;
};

const getDepartmentFolderAccess = async (folderId, userId) => {
  const memberOfIds = await getUserDepartmentIds(userId);

  if (!memberOfIds.length) return null;

  const departmentIds = await getDepartmentIdsWithAncestors(memberOfIds);

  const grant = await prisma.departmentPermission.findFirst({
    where: {
      folderId,
      departmentId: { in: departmentIds },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!grant) return null;

  return DEPT_TO_FOLDER_MAP[grant.accessLevel] || null;
};

const getFolderAccess = async (folderId, userId) => {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      permissions: true,
      vault: true,
    },
  });

  if (!folder) return null;

  if (folder.vault.type === 'PERSONAL') {
    return folder.vault.ownerId === userId ? 'ADMINISTRATOR' : null;
  }

  const admin = await isAdminUser(userId);
  if (admin) return 'ADMINISTRATOR';

  if (folder.vault.ownerId === userId) {
    return 'ADMINISTRATOR';
  }

  const permission = folder.permissions.find((item) => item.userId === userId);

  const departmentAccess = await getDepartmentFolderAccess(folder.id, userId);

  return getHighestFolderLevel([permission?.accessLevel, departmentAccess]);
};

const getVaultAccess = async (vaultId, userId) => {
  const vault = await prisma.vault.findUnique({
    where: { id: vaultId },
    include: {
      permissions: true,
    },
  });

  if (!vault) return null;

  if (vault.type === 'PERSONAL') {
    return vault.ownerId === userId ? 'ADMIN' : null;
  }

  const admin = await isAdminUser(userId);
  if (admin) return 'ADMIN';

  if (vault.ownerId === userId) {
    return 'ADMIN';
  }

  const permission = vault.permissions.find((item) => item.userId === userId);

  const departmentAccess = await getDepartmentVaultAccess(vault.id, userId);

  return getHighestVaultLevel([permission?.accessLevel, departmentAccess]);
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
  getUserDepartmentIds,
  getDepartmentIdsWithAncestors,
  getVaultAccess,
  getFolderAccess,
  requireFolderAccess,
  DEPT_TO_FOLDER_MAP,
};