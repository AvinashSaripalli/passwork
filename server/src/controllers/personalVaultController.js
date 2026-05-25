const prisma = require('../config/prisma');
const generateId = require('../utils/generateId');

const makeSlug = (name, userId) =>
  `${name}-${userId}`
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

const getOrCreateMyVault = async (req, res) => {
  try {
    let vault = await prisma.vault.findFirst({
      where: {
        ownerId: req.user.id,
        type: 'PERSONAL',
      },
      include: {
        folders: {
          orderBy: { createdAt: 'asc' },
        },
        passwords: {
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
            folder: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vault) {
      vault = await prisma.vault.create({
        data: {
          id: await generateId('vault'),
          name: 'My Vault',
          type: 'PERSONAL',
          slug: makeSlug('my-vault', req.user.id),
          ownerId: req.user.id,
        },
        include: {
          folders: true,
          passwords: true,
        },
      });

      await prisma.activityLog.create({
        data: {
          id: await generateId('activityLog'),
          userId: req.user.id,
          action: 'CREATE_VAULT',
          targetType: 'Vault',
          targetId: vault.id,
          metadata: {
            vaultId: vault.id,
            type: 'PERSONAL',
            personalVault: true,
          },
        },
      });
    }

    res.json(vault);
  } catch (error) {
    console.error('Get/Create my vault error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createMyVaultFolder = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    const vault = await prisma.vault.findFirst({
      where: {
        ownerId: req.user.id,
        type: 'PERSONAL',
      },
    });

    if (!vault) {
      return res.status(404).json({ message: 'Personal vault not found' });
    }

    const folder = await prisma.folder.create({
      data: {
        id: await generateId('folder'),
        name,
        vaultId: vault.id,
        parentId: null,
      },
    });

    await prisma.activityLog.create({
      data: {
        id: await generateId('activityLog'),
        userId: req.user.id,
        action: 'CREATE_FOLDER',
        targetType: 'Folder',
        targetId: folder.id,
        metadata: {
          vaultId: vault.id,
          folderId: folder.id,
          personalVault: true,
        },
      },
    });

    res.status(201).json(folder);
  } catch (error) {
    console.error('Create my vault folder error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyVaultFolders = async (req, res) => {
  try {
    const vault = await prisma.vault.findFirst({
      where: {
        ownerId: req.user.id,
        type: 'PERSONAL',
      },
    });

    if (!vault) {
      return res.json([]);
    }

    const folders = await prisma.folder.findMany({
      where: {
        vaultId: vault.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json(folders);
  } catch (error) {
    console.error('Get my vault folders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createMyVaultPassword = async (req, res) => {
  try {
    const {
      name,
      login,
      encryptedPassword,
      encryptedNote,
      url,
      colorTag,
      folderId,
      tags = [],
    } = req.body;

    if (!name || !login || !encryptedPassword || !folderId) {
      return res.status(400).json({
        message: 'name, login, encryptedPassword and folderId are required',
      });
    }

    const vault = await prisma.vault.findFirst({
      where: {
        ownerId: req.user.id,
        type: 'PERSONAL',
      },
    });

    if (!vault) {
      return res.status(404).json({ message: 'Personal vault not found' });
    }

    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        vaultId: vault.id,
      },
    });

    if (!folder) {
      return res.status(403).json({ message: 'Invalid personal folder' });
    }

    const passwordEntry = await prisma.passwordEntry.create({
      data: {
        id: await generateId('passwordEntry'),
        name,
        login,
        encryptedPassword,
        encryptedNote,
        url,
        colorTag,
        vaultId: vault.id,
        folderId,
        createdById: req.user.id,
        lastUpdatedAt: new Date(),
        strengthScore: req.body.strengthScore ?? 40,
        isWeak: req.body.isWeak ?? false,
        tags: {
          create: tags.map((tagName) => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: {
                  id: `TAG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  name: tagName,
                },
              },
            },
          })),
        },
      },
      include: {
        folder: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        id: await generateId('activityLog'),
        userId: req.user.id,
        action: 'CREATE_PASSWORD',
        targetType: 'PasswordEntry',
        targetId: passwordEntry.id,
        metadata: {
          name: passwordEntry.name,
          vaultId: vault.id,
          folderId,
          personalVault: true,
        },
      },
    });

    res.status(201).json(passwordEntry);
  } catch (error) {
    console.error('Create my vault password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyVaultPasswords = async (req, res) => {
  try {
    const vault = await prisma.vault.findFirst({
      where: {
        ownerId: req.user.id,
        type: 'PERSONAL',
      },
    });

    if (!vault) {
      return res.json([]);
    }

    const passwords = await prisma.passwordEntry.findMany({
      where: {
        vaultId: vault.id,
      },
      include: {
        folder: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(passwords);
  } catch (error) {
    console.error('Get my vault passwords error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateMyVaultFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    const vault = await prisma.vault.findFirst({
      where: {
        ownerId: req.user.id,
        type: 'PERSONAL',
      },
    });

    if (!vault) {
      return res.status(404).json({ message: 'Personal vault not found' });
    }

    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        vaultId: vault.id,
      },
    });

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const updatedFolder = await prisma.folder.update({
      where: { id: folderId },
      data: { name },
    });

    res.json(updatedFolder);
  } catch (error) {
    console.error('Update my vault folder error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteMyVaultFolder = async (req, res) => {
  try {
    const { folderId } = req.params;

    const vault = await prisma.vault.findFirst({
      where: {
        ownerId: req.user.id,
        type: 'PERSONAL',
      },
    });

    if (!vault) {
      return res.status(404).json({ message: 'Personal vault not found' });
    }

    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        vaultId: vault.id,
      },
      include: {
        passwords: true,
      },
    });

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    await prisma.folder.delete({
      where: { id: folderId },
    });

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Delete my vault folder error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateMyVaultPassword = async (req, res) => {
  try {
    const { passwordId } = req.params;

    const {
      name,
      login,
      encryptedPassword,
      encryptedNote,
      url,
      colorTag,
      folderId,
    } = req.body;

    const vault = await prisma.vault.findFirst({
      where: {
        ownerId: req.user.id,
        type: 'PERSONAL',
      },
    });

    if (!vault) {
      return res.status(404).json({ message: 'Personal vault not found' });
    }

    const password = await prisma.passwordEntry.findFirst({
      where: {
        id: passwordId,
        vaultId: vault.id,
      },
    });

    if (!password) {
      return res.status(404).json({ message: 'Password not found' });
    }

    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          vaultId: vault.id,
        },
      });

      if (!folder) {
        return res.status(400).json({ message: 'Invalid folder' });
      }
    }

    const updatedPassword = await prisma.passwordEntry.update({
      where: { id: passwordId },
      data: {
        name,
        login,
        encryptedPassword,
        encryptedNote,
        url,
        colorTag,
        folderId,
        lastUpdatedAt: new Date(),
        strengthScore: req.body.strengthScore ?? undefined,
        isWeak: req.body.isWeak ?? undefined,
        isOld: req.body.isOld ?? undefined,
        isAtRisk: req.body.isAtRisk ?? undefined,
      },
    });

    res.json(updatedPassword);
  } catch (error) {
    console.error('Update my vault password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteMyVaultPassword = async (req, res) => {
  try {
    const { passwordId } = req.params;

    const vault = await prisma.vault.findFirst({
      where: {
        ownerId: req.user.id,
        type: 'PERSONAL',
      },
    });

    if (!vault) {
      return res.status(404).json({ message: 'Personal vault not found' });
    }

    const password = await prisma.passwordEntry.findFirst({
      where: {
        id: passwordId,
        vaultId: vault.id,
      },
    });

    if (!password) {
      return res.status(404).json({ message: 'Password not found' });
    }

    await prisma.passwordEntry.delete({
      where: { id: passwordId },
    });

    res.json({ message: 'Password deleted successfully' });
  } catch (error) {
    console.error('Delete my vault password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPasswordShares = async (req, res) => {
  try {
    const { passwordId } = req.params;

    const vault = await prisma.vault.findFirst({
      where: {
        ownerId: req.user.id,
        type: 'PERSONAL',
      },
    });

    if (!vault) {
      return res.status(404).json({ message: 'Personal vault not found' });
    }

    const password = await prisma.passwordEntry.findFirst({
      where: {
        id: passwordId,
        vaultId: vault.id,
      },
    });

    if (!password) {
      return res.status(404).json({ message: 'Password not found' });
    }

    const shares = await prisma.passwordShare.findMany({
      where: { passwordId },
      include: {
        sharedWith: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(shares);
  } catch (error) {
    console.error('Get password shares error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getOrCreateMyVault,
  createMyVaultFolder,
  getMyVaultFolders,
  createMyVaultPassword,
  getMyVaultPasswords,
  updateMyVaultFolder,
  deleteMyVaultFolder,
  updateMyVaultPassword,
  deleteMyVaultPassword,
  getPasswordShares,
};