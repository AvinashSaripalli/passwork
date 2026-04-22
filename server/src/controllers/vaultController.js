const prisma = require('../config/prisma');

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

    let baseSlug = makeSlug(name);
    let slug = baseSlug;
    let count = 1;

    while (await prisma.vault.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count}`;
      count += 1;
    }

    const vault = await prisma.vault.create({
      data: {
        name,
        type,
        slug,
        ownerId: req.user.id,
      },
    });

    await prisma.vaultPermission.create({
      data: {
        vaultId: vault.id,
        userId: req.user.id,
        accessLevel: 'ADMIN',
      },
    });

    await prisma.activityLog.create({
      data: {
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

    res.json(vault);
  } catch (error) {
    console.error('Get vault by slug error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const shareVault = async (req, res) => {
  return res.status(400).json({
    message: 'Use folder sharing instead of vault sharing in this version',
  });
};

module.exports = {
  createVault,
  getVaults,
  getVaultBySlug,
  shareVault,
};