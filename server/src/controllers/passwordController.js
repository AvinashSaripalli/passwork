const prisma = require('../config/prisma');
const { getFolderAccess, isAdminUser } = require('../utils/permissions');
const XLSX = require('xlsx');

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
                create: { name: tagName },
              },
            },
          })),
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
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
    if (!access) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await prisma.activityLog.create({
      data: {
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
    });

    if (!existingPassword) {
      return res.status(404).json({ message: 'Password not found' });
    }

    const access = await getFolderAccess(existingPassword.folderId, req.user.id);
    if (!access || !['ADMINISTRATOR', 'FULL_ACCESS', 'EDIT_ONLY'].includes(access)) {
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
    } = req.body;

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
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_PASSWORD',
        targetType: 'PasswordEntry',
        targetId: updatedPassword.id,
        metadata: {
          name: updatedPassword.name,
          folderId: updatedPassword.folderId,
          vaultId: updatedPassword.vaultId,
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

const importPasswordsFromExcel = async (req, res) => {
  try {
    const { vaultId, folderId, rows } = req.body;

    if (!vaultId || !folderId) {
      return res.status(400).json({ message: 'vaultId and folderId are required' });
    }

    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ message: 'Excel rows are required' });
    }

    const access = await getFolderAccess(folderId, req.user.id);
    if (!access || !['ADMINISTRATOR', 'FULL_ACCESS'].includes(access)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const createdPasswords = [];

    for (const row of rows) {
      const created = await prisma.passwordEntry.create({
        data: {
          name: row.name || 'Imported Password',
          login: row.login || '',
          encryptedPassword: row.encryptedPassword || '',
          encryptedNote: row.encryptedNote || null,
          url: row.url || null,
          colorTag: row.colorTag || null,
          vaultId,
          folderId,
          createdById: req.user.id,
          isWeak: row.isWeak === true || row.isWeak === 'true' || row.isWeak === 'Yes',
          isOld: row.isOld === true || row.isOld === 'true' || row.isOld === 'Yes',
          isAtRisk: row.isAtRisk === true || row.isAtRisk === 'true' || row.isAtRisk === 'Yes',
          strengthScore: row.strengthScore ? Number(row.strengthScore) : null,
          lastUpdatedAt: new Date(),
          tags: {
            create: (row.tags
              ? String(row.tags).split(',').map((t) => t.trim()).filter(Boolean)
              : []
            ).map((tagName) => ({
              tag: {
                connectOrCreate: {
                  where: { name: tagName },
                  create: { name: tagName },
                },
              },
            })),
          },
        },
      });

      createdPasswords.push(created);
    }

    res.status(201).json({
      message: 'Passwords imported successfully',
      count: createdPasswords.length,
    });
  } catch (error) {
    console.error('Import passwords from excel error:', error);
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
      include: {
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

    const rows = passwords.map((item) => ({
      name: item.name,
      login: item.login,
      encryptedPassword: item.encryptedPassword,
      encryptedNote: item.encryptedNote || '',
      url: item.url || '',
      colorTag: item.colorTag || '',
      isWeak: item.isWeak ? 'Yes' : 'No',
      isOld: item.isOld ? 'Yes' : 'No',
      isAtRisk: item.isAtRisk ? 'Yes' : 'No',
      strengthScore: item.strengthScore ?? '',
      tags: item.tags?.map((tagItem) => tagItem.tag?.name).filter(Boolean).join(', ') || '',
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Passwords');

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    const fileName = `${folderId ? 'folder-passwords' : 'vault-passwords'}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    res.send(buffer);
  } catch (error) {
    console.error('Export passwords to excel error:', error);
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
  importPasswordsFromExcel,
  exportPasswordsToExcel,
};