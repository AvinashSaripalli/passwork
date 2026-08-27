const prisma = require('../config/prisma');
const generateId = require('../utils/generateId');
const { getVaultAccess } = require('../utils/permissions');
const { revokeWrappedKeysForUser } = require('../utils/wrappedKeys');

const ALLOWED_VAULT_ACCESS_LEVELS = ['VIEWER', 'EDITOR', 'MANAGER', 'ADMIN'];

const makeSlug = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

const createVault = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admin can create vaults' });
    }

    const { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required' });
    }

    const baseSlug = makeSlug(name);
    let slug = baseSlug;
    let count = 1;

    while (await prisma.vault.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count}`;
      count += 1;
    }

    const vaultId = await generateId('vault');

    const vault = await prisma.vault.create({
      data: {
        id: vaultId,
        name,
        type,
        slug,
        ownerId: req.user.id,
      },
    });

    const vaultPermissionId = await generateId('vaultPermission');

    await prisma.vaultPermission.create({
      data: {
        id: vaultPermissionId,
        vaultId: vault.id,
        userId: req.user.id,
        accessLevel: 'ADMIN',
      },
    });

    const activityId = await generateId('activityLog');

    await prisma.activityLog.create({
      data: {
        id: activityId,
        userId: req.user.id,
        action: 'CREATE_VAULT',
        targetType: 'Vault',
        targetId: vault.id,
        metadata: {
          name: vault.name,
          type: vault.type,
          slug: vault.slug,
        },
      },
    });

    res.status(201).json(vault);
  } catch (error) {
    console.error('Create vault error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getVaults = async (req, res) => {
  try {
    let vaults;

    if (req.user.role === 'ADMIN') {
      vaults = await prisma.vault.findMany({
  where: {
    type: {
      not: 'PERSONAL',
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
    folders: {
      include: {
        permissions: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    },
    passwords: {
      select: {
        id: true,
        name: true,
        login: true,
        createdAt: true,
      },
    },
  },
  orderBy: { createdAt: 'desc' },
});
    } else {
      const folderPermissions = await prisma.folderPermission.findMany({
        where: { userId: req.user.id },
        include: {
          folder: {
            include: {
              vault: true,
            },
          },
        },
      });

      const vaultIds = [...new Set(folderPermissions.map((item) => item.folder.vaultId))];

      vaults = await prisma.vault.findMany({
        where: { id: { in: vaultIds } },
        include: {
          folders: {
            where: {
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
          },
          passwords: false,
          permissions: false,
        },
      });
    }

    res.json(vaults);
  } catch (error) {
    console.error('Get vaults error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getVaultBySlug = async (req, res) => {
  try {
    let vault;

    if (req.user.role === 'ADMIN') {
      vault = await prisma.vault.findUnique({
        where: { slug: req.params.slug },
        include: {
          owner: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
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
          folders: {
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
    } else {
      const targetVault = await prisma.vault.findUnique({
        where: { slug: req.params.slug },
        select: { id: true },
      });

      if (!targetVault) {
        return res.status(404).json({ message: 'Vault not found' });
      }

      const folderPermissions = await prisma.folderPermission.findMany({
        where: {
          userId: req.user.id,
          folder: {
            vaultId: targetVault.id,
          },
        },
        include: {
          folder: {
            include: {
              permissions: {
                include: {
                  user: {
                    select: { id: true, fullName: true, email: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!folderPermissions.length) {
        return res.status(403).json({ message: 'Access denied' });
      }

      vault = await prisma.vault.findUnique({
        where: { slug: req.params.slug },
        include: {
          owner: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          folders: {
            where: {
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
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    if (!vault) {
      return res.status(404).json({ message: 'Vault not found' });
    }

    const extractMyWrappedKey = (folders) => {
      return folders.map((folder) => {
        const allWrappedKeys = folder.wrappedKeys || {};
        const myWrappedKey = allWrappedKeys[req.user.id] || null;
        const { wrappedKeys, ...rest } = folder;
        return { ...rest, myWrappedKey };
      });
    };

    if (vault.folders) {
      vault = { ...vault, folders: extractMyWrappedKey(vault.folders) };
    }

    res.json(vault);
  } catch (error) {
    console.error('Get vault by slug error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const shareVault = async (req, res) => {
  try {
    const vaultId = req.params.id;
    const { userEmail, accessLevel } = req.body;

    if (!vaultId) {
      return res.status(400).json({ message: 'Vault id is required' });
    }

    if (!userEmail || !accessLevel) {
      return res.status(400).json({ message: 'userEmail and accessLevel are required' });
    }

    if (!ALLOWED_VAULT_ACCESS_LEVELS.includes(accessLevel)) {
      return res.status(400).json({
        message: `Invalid access level. Must be one of: ${ALLOWED_VAULT_ACCESS_LEVELS.join(', ')}`,
      });
    }

    const vault = await prisma.vault.findUnique({
      where: { id: vaultId },
    });

    if (!vault) {
      return res.status(404).json({ message: 'Vault not found' });
    }

    if (vault.type === 'PERSONAL') {
      return res.status(400).json({ message: 'Personal vaults cannot be shared' });
    }

    const access = await getVaultAccess(vaultId, req.user.id);
    if (access !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot share vault with yourself' });
    }

    const permission = await prisma.vaultPermission.upsert({
      where: {
        vaultId_userId: {
          vaultId,
          userId: user.id,
        },
      },
      update: {
        accessLevel,
      },
      create: {
        id: await generateId('vaultPermission'),
        vaultId,
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
        id: await generateId('activityLog'),
        userId: req.user.id,
        action: 'SHARE_VAULT',
        targetType: 'Vault',
        targetId: vaultId,
        metadata: {
          vaultId,
          name: vault.name,
          sharedWith: user.email,
          accessLevel,
        },
      },
    });

    res.status(201).json(permission);
  } catch (error) {
    console.error('Share vault error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const unshareVault = async (req, res) => {
  try {
    const vaultId = req.params.id;
    const { userId } = req.body;

    if (!vaultId || !userId) {
      return res.status(400).json({ message: 'vaultId and userId are required' });
    }

    const vault = await prisma.vault.findUnique({ where: { id: vaultId } });
    if (!vault) {
      return res.status(404).json({ message: 'Vault not found' });
    }

    const access = await getVaultAccess(vaultId, req.user.id);
    if (access !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot remove yourself' });
    }

    await prisma.vaultPermission.deleteMany({
      where: { vaultId, userId },
    });

    await revokeWrappedKeysForUser(vaultId, userId);

    await prisma.activityLog.create({
      data: {
        id: await generateId('activityLog'),
        userId: req.user.id,
        action: 'UNSHARE_VAULT',
        targetType: 'Vault',
        targetId: vaultId,
        metadata: { vaultId, removedUserId: userId },
      },
    });

    res.json({ message: 'Vault access removed and wrapped keys revoked' });
  } catch (error) {
    console.error('Unshare vault error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createVault,
  getVaults,
  getVaultBySlug,
  shareVault,
  unshareVault,
};