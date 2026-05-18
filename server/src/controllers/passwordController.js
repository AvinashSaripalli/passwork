const prisma = require('../config/prisma');
const { getFolderAccess, isAdminUser } = require('../utils/permissions');
const XLSX = require('xlsx');
const generateId = require('../utils/generateId');

const createPassword = async (req, res) => {
  try {
    const {
      name,
      login,
      encryptedPassword,
      encryptedNote,
      url,
      colorTag,
      vaultId,
      folderId,
      tags = [],
    } = req.body;

    if (!name || !login || !encryptedPassword || !vaultId || !folderId) {
      return res.status(400).json({
        message: 'name, login, encryptedPassword, vaultId and folderId are required',
      });
    }

    const access = await getFolderAccess(folderId, req.user.id);
    if (!access || !['ADMINISTRATOR', 'FULL_ACCESS'].includes(access)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const isWeak = encryptedPassword.length < 12;
    const isOld = false;
    const isAtRisk = false;
    const strengthScore =
      encryptedPassword.length >= 16 ? 90 : encryptedPassword.length >= 12 ? 70 : 40;

    const passwordEntry = await prisma.passwordEntry.create({
      data: {
        id: await generateId('passwordEntry'),
        name,
        login,
        encryptedPassword,
        encryptedNote,
        url,
        colorTag,
        vaultId,
        folderId,
        createdById: req.user.id,
        isWeak,
        isOld,
        isAtRisk,
        strengthScore,
        lastUpdatedAt: new Date(),
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
        tags: {
          include: { tag: true },
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
          vaultId,
          folderId,
        },
      },
    });

    res.status(201).json(passwordEntry);
  } catch (error) {
    console.error('Create password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const importPasswordsFromExcel = async (req, res) => {
  try {
    const { vaultId, folderId, rows } = req.body;

    if (!vaultId || !folderId) {
      return res.status(400).json({ message: 'vaultId and folderId required' });
    }

    const access = await getFolderAccess(folderId, req.user.id);
    if (!access || !['ADMINISTRATOR', 'FULL_ACCESS'].includes(access)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const createdPasswords = [];

    for (const row of rows) {
      const created = await prisma.passwordEntry.create({
        data: {
          id: await generateId('passwordEntry'),

          // ✅ ONLY REQUIRED FIELDS
          name: row.name || '',
          login: row.login || '',
          encryptedPassword: row.password || '', // frontend should encrypt if needed
          url: row.url || '',

          vaultId,
          folderId,
          createdById: req.user.id,
          lastUpdatedAt: new Date(),
        },
      });

      createdPasswords.push(created);
    }

    res.json({
      message: 'Imported successfully',
      count: createdPasswords.length,
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPasswordsByVault = async (req, res) => {
  try {
    const admin = await isAdminUser(req.user.id);

    let passwords;

    if (admin) {
      passwords = await prisma.passwordEntry.findMany({
        where: {
          vaultId: req.params.vaultId,
        },
        include: {
          tags: { include: { tag: true } },
          folder: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      const allowedFolders = await prisma.folderPermission.findMany({
        where: { userId: req.user.id },
        select: { folderId: true },
      });

      const folderIds = allowedFolders.map((item) => item.folderId);

      passwords = await prisma.passwordEntry.findMany({
        where: {
          vaultId: req.params.vaultId,
          folderId: { in: folderIds },
        },
        include: {
          tags: { include: { tag: true } },
          folder: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json(passwords);
  } catch (error) {
    console.error('Get passwords by vault error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPasswordById = async (req, res) => {
  try {
    const password = await prisma.passwordEntry.findUnique({
      where: { id: req.params.id },
      include: {
        tags: { include: { tag: true } },
        folder: true,
        vault: true,
      },
    });

    if (!password) {
      return res.status(404).json({ message: 'Password not found' });
    }

    const access = await getFolderAccess(password.folderId, req.user.id);
    if (!access || !['ADMINISTRATOR', 'FULL_ACCESS', 'EDIT_ONLY', 'READ_ONLY'].includes(access)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await prisma.activityLog.create({
      data: {
        id: await generateId('activityLog'),
        userId: req.user.id,
        action: 'VIEW_PASSWORD',
        targetType: 'PasswordEntry',
        targetId: password.id,
        metadata: {
          name: password.name,
          folderId: password.folderId,
          vaultId: password.vaultId,
        },
      },
    });

    res.json(password);
  } catch (error) {
    console.error('Get password by id error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updatePassword = async (req, res) => {
  try {
    const existingPassword = await prisma.passwordEntry.findUnique({
      where: { id: req.params.id },
      include: {
        tags: true,
      },
    });

    if (!existingPassword) {
      return res.status(404).json({ message: 'Password not found' });
    }

    const access = await getFolderAccess(existingPassword.folderId, req.user.id);

    if (
      !access ||
      !['ADMINISTRATOR', 'FULL_ACCESS', 'EDIT_ONLY'].includes(access)
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      name,
      login,
      encryptedPassword,
      encryptedNote,
      url,
      colorTag,
      folderId,
      tags,
    } = req.body;

    const cleanTags = Array.isArray(tags)
      ? tags
          .map((tag) => String(tag).trim())
          .filter(Boolean)
          .filter((tag, index, arr) => {
            return (
              arr.findIndex(
                (item) => item.toLowerCase() === tag.toLowerCase()
              ) === index
            );
          })
      : undefined;

    const updatedPassword = await prisma.passwordEntry.update({
      where: { id: req.params.id },
      data: {
        name,
        login,
        encryptedPassword,
        encryptedNote,
        url,
        colorTag,
        folderId: folderId === undefined ? undefined : folderId,
        lastUpdatedAt: new Date(),

        ...(cleanTags !== undefined && {
          tags: {
            deleteMany: {},
            create: cleanTags.map((tagName) => ({
              tag: {
                connectOrCreate: {
                  where: { name: tagName },
                  create: {
                    id: `TAG-${Date.now()}-${Math.floor(
                      Math.random() * 1000
                    )}`,
                    name: tagName,
                  },
                },
              },
            })),
          },
        }),
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        folder: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        id: await generateId('activityLog'),
        userId: req.user.id,
        action: 'UPDATE_PASSWORD',
        targetType: 'PasswordEntry',
        targetId: updatedPassword.id,
        metadata: {
          name: updatedPassword.name,
          folderId: updatedPassword.folderId,
          vaultId: updatedPassword.vaultId,
          tags: cleanTags || undefined,
        },
      },
    });

    res.json(updatedPassword);
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deletePassword = async (req, res) => {
  try {
    const password = await prisma.passwordEntry.findUnique({
      where: { id: req.params.id },
    });

    if (!password) {
      return res.status(404).json({ message: 'Password not found' });
    }

    const access = await getFolderAccess(password.folderId, req.user.id);
    if (!access || !['ADMINISTRATOR', 'FULL_ACCESS'].includes(access)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await prisma.passwordEntry.delete({
      where: { id: req.params.id },
    });

    await prisma.activityLog.create({
      data: {
        id: await generateId('activityLog'),
        userId: req.user.id,
        action: 'DELETE_PASSWORD',
        targetType: 'PasswordEntry',
        targetId: req.params.id,
        metadata: {
          name: password.name,
          folderId: password.folderId,
          vaultId: password.vaultId,
        },
      },
    });

    res.json({ message: 'Password deleted successfully' });
  } catch (error) {
    console.error('Delete password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const logCopyPassword = async (req, res) => {
  try {
    const password = await prisma.passwordEntry.findUnique({
      where: { id: req.params.id },
    });

    if (!password) {
      return res.status(404).json({ message: 'Password not found' });
    }

    const access = await getFolderAccess(password.folderId, req.user.id);
    if (
      !access ||
      !['ADMINISTRATOR', 'FULL_ACCESS', 'EDIT_ONLY', 'READ_ONLY'].includes(access)
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await prisma.activityLog.create({
      data: {
        id: await generateId('activityLog'),
        userId: req.user.id,
        action: 'COPY_PASSWORD',
        targetType: 'PasswordEntry',
        targetId: password.id,
        metadata: {
          name: password.name,
          folderId: password.folderId,
          vaultId: password.vaultId,
        },
      },
    });

    res.json({ message: 'Password copy activity logged' });
  } catch (error) {
    console.error('Log copy password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const logViewPassword = async (req, res) => {
  try {
    const password = await prisma.passwordEntry.findUnique({
      where: { id: req.params.id },
    });

    if (!password) {
      return res.status(404).json({ message: 'Password not found' });
    }

    const access = await getFolderAccess(password.folderId, req.user.id);

    if (
      !access ||
      !['ADMINISTRATOR', 'FULL_ACCESS', 'EDIT_ONLY', 'READ_ONLY'].includes(access)
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await prisma.passwordEntry.update({
      where: { id: password.id },
      data: {
        lastViewedAt: new Date(),
      },
    });

    await prisma.activityLog.create({
      data: {
        id: await generateId('activityLog'),
        userId: req.user.id,
        action: 'VIEW_PASSWORD',
        targetType: 'PasswordEntry',
        targetId: password.id,
        metadata: {
          name: password.name,
          folderId: password.folderId,
          vaultId: password.vaultId,
        },
      },
    });

    res.json({ message: 'Password view activity logged' });
  } catch (error) {
    console.error('Log view password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const exportPasswordsToExcel = async (req, res) => {
  try {
    const { vaultId, folderId } = req.query;

    if (!vaultId) {
      return res.status(400).json({ message: 'vaultId is required' });
    }

    let where = { vaultId };

    if (folderId) {
      const access = await getFolderAccess(folderId, req.user.id);
      if (!access) {
        return res.status(403).json({ message: 'Access denied' });
      }
      where.folderId = folderId;
    }

    const passwords = await prisma.passwordEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // ✅ ONLY REQUIRED FIELDS
    const rows = passwords.map((item) => ({
      name: item.name || '',
      login: item.login || '',
      password: item.encryptedPassword || '', // you can decrypt if needed
      url: item.url || '',
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Passwords');

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="passwords.xlsx"`
    );

    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createPassword,
  getPasswordsByVault,
  getPasswordById,
  updatePassword,
  deletePassword,
  logCopyPassword,
  logViewPassword,
  importPasswordsFromExcel,
  exportPasswordsToExcel,
};