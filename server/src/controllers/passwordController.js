const prisma = require('../config/prisma');
const { getFolderAccess, isAdminUser } = require('../utils/permissions');
const XLSX = require('xlsx');
const generateId = require('../utils/generateId');

const getVaultType = async (vaultId) => {
  try {
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId },
      select: { type: true },
    });
    return vault?.type || null;
  } catch {
    return null;
  }
};

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
      wrappedKeys,
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

    const isWeak = req.body.isWeak ?? false;
    const isOld = req.body.isOld ?? false;
    const isAtRisk = req.body.isAtRisk ?? false;
    const isSensitive = req.body.isSensitive ?? false;
    const strengthScore = req.body.strengthScore ?? 40;

    const passwordEntry = await prisma.passwordEntry.create({
      data: {
        id: await generateId('passwordEntry'),
        name,
        login,
        encryptedPassword,
        encryptedNote,
        encryptedFields: req.body.encryptedFields || null,
        url,
        colorTag,
        vaultId,
        folderId,
        createdById: req.user.id,
        isWeak,
        isOld,
        isAtRisk,
        isSensitive,
        strengthScore,
        wrappedKeys: wrappedKeys || null,
        lastUpdatedAt: new Date(),
        tags: {
          create: tags.map((tagName) => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: {
                  id: generateId('tag'),
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

    const vaultType = await getVaultType(vaultId);

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
          vaultType,
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

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'rows array is required' });
    }

    if (rows.length > 500) {
      return res.status(400).json({ message: 'Cannot import more than 500 passwords at once' });
    }

    const access = await getFolderAccess(folderId, req.user.id);
    if (!access || !['ADMINISTRATOR', 'FULL_ACCESS'].includes(access)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const createdPasswords = [];

    for (const row of rows) {
      if (!row.name || !row.login || !row.encryptedPassword) continue;

      const created = await prisma.passwordEntry.create({
        data: {
          id: await generateId('passwordEntry'),
          name: row.name,
          login: row.login,
          encryptedPassword: row.encryptedPassword,
          encryptedNote: row.encryptedNote || '',
          url: row.url || '',
          vaultId,
          folderId,
          createdById: req.user.id,
          lastUpdatedAt: new Date(),
          strengthScore: row.strengthScore ?? 40,
          isWeak: row.isWeak ?? false,
          isOld: row.isOld ?? false,
          isAtRisk: row.isAtRisk ?? false,
          isSensitive: row.isSensitive ?? false,
          tags: {
            create: Array.isArray(row.tags)
              ? row.tags.map((tagName) => ({
                  tag: {
                    connectOrCreate: {
                      where: { name: tagName },
                      create: {
                        id: generateId('tag'),
                        name: tagName,
                      },
                    },
                  },
                }))
              : [],
          },
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
          createdBy: {
            select: { id: true, encryptionSalt: true },
          },
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
          createdBy: {
            select: { id: true, encryptionSalt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const userId = req.user.id;
    const result = passwords.map((pw) => {
      const allWrappedKeys = pw.wrappedKeys || {};
      const myWrappedKey = allWrappedKeys[userId] || null;
      const { wrappedKeys, ...rest } = pw;
      return { ...rest, myWrappedKey };
    });

    res.json(result);
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
        createdBy: {
          select: { id: true, encryptionSalt: true },
        },
      },
    });

    if (!password) {
      return res.status(404).json({ message: 'Password not found' });
    }

    const access = await getFolderAccess(password.folderId, req.user.id);
    if (!access || !['ADMINISTRATOR', 'FULL_ACCESS', 'EDIT_ONLY', 'READ_ONLY'].includes(access)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const vaultType = await getVaultType(password.vaultId);

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
          vaultType,
        },
      },
    });

    const allWrappedKeys = password.wrappedKeys || {};
    const myWrappedKey = allWrappedKeys[req.user.id] || null;
    const { wrappedKeys, ...passwordData } = password;

    res.json({ ...passwordData, myWrappedKey });
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
      wrappedKeys,
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
        strengthScore: req.body.strengthScore ?? undefined,
        isWeak: req.body.isWeak ?? undefined,
        isOld: req.body.isOld ?? undefined,
        isAtRisk: req.body.isAtRisk ?? undefined,
        isSensitive: req.body.isSensitive ?? undefined,
        ...(wrappedKeys !== undefined && { wrappedKeys }),

        ...(cleanTags !== undefined && {
          tags: {
            deleteMany: {},
            create: cleanTags.map((tagName) => ({
              tag: {
                connectOrCreate: {
                  where: { name: tagName },
                  create: {
                    id: generateId('tag'),
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

    const vaultType = await getVaultType(updatedPassword.vaultId);

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
          vaultType,
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

    const vaultType = await getVaultType(password.vaultId);

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
          vaultType,
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

    const hasFolderAccess = await getFolderAccess(password.folderId, req.user.id);
    const hasShare = await prisma.passwordShare.findFirst({
      where: {
        passwordId: password.id,
        sharedWithId: req.user.id,
      },
    });

    const hasAccessViaFolder = hasFolderAccess && ['ADMINISTRATOR', 'FULL_ACCESS', 'EDIT_ONLY', 'READ_ONLY'].includes(hasFolderAccess);

    if (!hasAccessViaFolder && !hasShare) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const vaultType = await getVaultType(password.vaultId);

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
          vaultType,
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

    const hasFolderAccess = await getFolderAccess(password.folderId, req.user.id);
    const hasShare = await prisma.passwordShare.findFirst({
      where: {
        passwordId: password.id,
        sharedWithId: req.user.id,
      },
    });

    const hasAccessViaFolder = hasFolderAccess && ['ADMINISTRATOR', 'FULL_ACCESS', 'EDIT_ONLY', 'READ_ONLY'].includes(hasFolderAccess);

    if (!hasAccessViaFolder && !hasShare) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await prisma.passwordEntry.update({
      where: { id: password.id },
      data: {
        lastViewedAt: new Date(),
      },
    });

    const vaultType = await getVaultType(password.vaultId);

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
          vaultType,
        },
      },
    });

    res.json({ message: 'Password view activity logged' });
  } catch (error) {
    console.error('Log view password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPasswordsOwnedByUser = async (req, res) => {
  try {
    const passwords = await prisma.passwordEntry.findMany({
      where: { createdById: req.user.id },
      select: {
        id: true,
        encryptedPassword: true,
        encryptedNote: true,
      },
    });

    res.json(passwords);
  } catch (error) {
    console.error('Get passwords owned by user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getItemsNeedingWrapping = async (req, res) => {
  try {
    const { vaultId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'userId query param is required' });
    }

    const vault = await prisma.vault.findUnique({
      where: { id: vaultId },
      select: { type: true },
    });

    if (!vault) {
      return res.status(404).json({ message: 'Vault not found' });
    }

    if (vault.type === 'PERSONAL') {
      return res.status(400).json({ message: 'Personal vaults do not support key wrapping' });
    }

    const result = await getItemsNeedingWrapping(vaultId, userId);
    res.json(result);
  } catch (error) {
    console.error('Get items needing wrapping error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const batchWrapKeys = async (req, res) => {
  try {
    const { wrappedFolders, wrappedPasswords } = req.body;

    if (!wrappedFolders && !wrappedPasswords) {
      return res.status(400).json({ message: 'wrappedFolders or wrappedPasswords is required' });
    }

    const operations = [];

    if (wrappedFolders && Array.isArray(wrappedFolders)) {
      for (const item of wrappedFolders) {
        if (!item.folderId || !item.wrappedKeys) continue;
        operations.push(
          prisma.folder.update({
            where: { id: item.folderId },
            data: { wrappedKeys: item.wrappedKeys },
          })
        );
      }
    }

    if (wrappedPasswords && Array.isArray(wrappedPasswords)) {
      for (const item of wrappedPasswords) {
        const passwordId = item.id || item.passwordId;
        if (!passwordId || !item.wrappedKeys) continue;
        operations.push(
          prisma.passwordEntry.update({
            where: { id: passwordId },
            data: {
              wrappedKeys: item.wrappedKeys,
              ...(item.encryptedPassword && { encryptedPassword: item.encryptedPassword }),
              ...(item.encryptedNote !== undefined && { encryptedNote: item.encryptedNote }),
            },
          })
        );
      }
    }

    if (operations.length > 0) {
      await prisma.$transaction(operations);
    }

    res.json({ message: 'Keys wrapped successfully', count: operations.length });
  } catch (error) {
    console.error('Batch wrap keys error:', error);
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
  getPasswordsOwnedByUser,
  getItemsNeedingWrapping,
  batchWrapKeys,
};