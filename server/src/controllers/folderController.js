const prisma = require('../config/prisma');
const { isAdminUser, getFolderAccess } = require('../utils/permissions');

const ALLOWED_ACCESS_LEVELS = [
  'ADMINISTRATOR',
  'FULL_ACCESS',
  'READ_ONLY',
  'EDIT_ONLY',
];

const createFolder = async (req, res) => {
  try {
    const { name, vaultId, parentId } = req.body;

    if (!name || !vaultId) {
      return res.status(400).json({ message: 'Name and vaultId are required' });
    }

    // no subfolders allowed
    if (parentId) {
      return res.status(400).json({ message: 'Subfolders are not allowed' });
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        vaultId,
        parentId: null,
      },
      include: {
        permissions: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_FOLDER',
        targetType: 'Folder',
        targetId: folder.id,
        metadata: {
          name: folder.name,
          vaultId,
          folderId: folder.id,
        },
      },
    });

    res.status(201).json(folder);
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const updateFolder = async (req, res) => {
  try {
    const { name, parentId } = req.body;

    if (parentId) {
      return res.status(400).json({ message: 'Subfolders are not allowed' });
    }

    const existingFolder = await prisma.folder.findUnique({
      where: { id: req.params.id },
    });

    if (!existingFolder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const updatedFolder = await prisma.folder.update({
      where: { id: req.params.id },
      data: {
        name,
        parentId: null,
      },
      include: {
        permissions: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_FOLDER',
        targetType: 'Folder',
        targetId: updatedFolder.id,
        metadata: {
          name: updatedFolder.name,
          folderId: updatedFolder.id,
          vaultId: updatedFolder.vaultId,
        },
      },
    });

    res.json(updatedFolder);
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const getFoldersByVault = async (req, res) => {
  try {
    const admin = await isAdminUser(req.user.id);

    let folders;

    if (admin) {
      folders = await prisma.folder.findMany({
        where: { vaultId: req.params.vaultId },
        include: {
          permissions: {
            include: {
              user: {
                select: { id: true, fullName: true, email: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    } else {
      folders = await prisma.folder.findMany({
        where: {
          vaultId: req.params.vaultId,
          permissions: {
            some: {
              userId: req.user.id,
            },
          },
        },
        include: {
          permissions: {
            include: {
              user: {
                select: { id: true, fullName: true, email: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    res.json(folders);
  } catch (error) {
    console.error('Get folders by vault error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const getFolderById = async (req, res) => {
  try {
    const folder = await prisma.folder.findUnique({
      where: { id: req.params.id },
      include: {
        permissions: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        passwords: {
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    });

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const access = await getFolderAccess(folder.id, req.user.id);

    if (!access) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(folder);
  } catch (error) {
    console.error('Get folder by id error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const shareFolder = async (req, res) => {
  try {
    const folderId = req.params.id;
    const { userEmail, accessLevel } = req.body;

    if (!folderId) {
      return res.status(400).json({ message: 'Folder id is required' });
    }

    if (!userEmail || !accessLevel) {
      return res.status(400).json({ message: 'userEmail and accessLevel are required' });
    }

    if (!ALLOWED_ACCESS_LEVELS.includes(accessLevel)) {
      return res.status(400).json({ message: 'Invalid access level' });
    }

    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const permission = await prisma.folderPermission.upsert({
      where: {
        folderId_userId: {
          folderId,
          userId: user.id,
        },
      },
      update: {
        accessLevel,
      },
      create: {
        folderId,
        userId: user.id,
        accessLevel,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_FOLDER',
        targetType: 'Folder',
        targetId: folderId,
        metadata: {
          folderId,
          sharedWith: user.email,
          accessLevel,
        },
      },
    });

    res.json(permission);
  } catch (error) {
    console.error('Share folder error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const getFolderActivityLogs = async (req, res) => {
  try {
    const folderId = req.params.id;

    const access = await getFolderAccess(folderId, req.user.id);
    if (!access) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const logs = await prisma.activityLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const filteredLogs = logs.filter((log) => {
      const metadataFolderId = log?.metadata?.folderId;

      return log.targetId === folderId || metadataFolderId === folderId;
    });

    res.json(filteredLogs);
  } catch (error) {
    console.error('Get folder activity logs error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// UPDATE permission (change access level)
const updateFolderPermission = async (req, res) => {
  try {
    const { accessLevel } = req.body;
    const { id } = req.params;

    if (!accessLevel) {
      return res.status(400).json({ message: 'Access level is required' });
    }

    const permission = await prisma.folderPermission.update({
      where: { id },
      data: { accessLevel },
    });

    res.json(permission);
  } catch (error) {
    console.error('Update folder permission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// DELETE permission (remove user from folder)
const deleteFolderPermission = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.folderPermission.delete({
      where: { id },
    });

    res.json({ message: 'User removed from folder' });
  } catch (error) {
    console.error('Delete folder permission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const folderId = req.params.id;

    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        passwords: true,
        permissions: true,
      },
    });

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    if (folder.passwords.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete folder because it contains passwords',
      });
    }

    await prisma.$transaction([
      prisma.folderPermission.deleteMany({
        where: { folderId },
      }),
      prisma.folder.delete({
        where: { id: folderId },
      }),
      prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'DELETE_FOLDER',
          targetType: 'Folder',
          targetId: folderId,
          metadata: {
            name: folder.name,
            vaultId: folder.vaultId,
            folderId: folder.id,
          },
        },
      }),
    ]);

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = {
  createFolder,
  updateFolder,
  getFoldersByVault,
  getFolderById,
  shareFolder,
  getFolderActivityLogs,
  deleteFolder,
  updateFolderPermission,
  deleteFolderPermission,
};