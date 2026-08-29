const prisma = require('../config/prisma');
const generateId = require('../utils/generateId');
const { getFolderAccess } = require('../utils/permissions');

const storeKeyPair = async (req, res) => {
  try {
    const { encryptedPrivateKey, publicKey, salt } = req.body;

    if (!encryptedPrivateKey || !publicKey || !salt) {
      return res.status(400).json({ message: 'encryptedPrivateKey, publicKey, and salt are required' });
    }

    const existing = await prisma.userKeyPair.findUnique({
      where: { userId: req.user.id },
    });

    if (existing) {
      await prisma.userKeyPair.update({
        where: { userId: req.user.id },
        data: {
          encryptedPrivateKey: typeof encryptedPrivateKey === 'string' ? JSON.parse(encryptedPrivateKey) : encryptedPrivateKey,
          publicKey,
          salt,
        },
      });
    } else {
      await prisma.userKeyPair.create({
        data: {
          id: await generateId('keyPair'),
          userId: req.user.id,
          encryptedPrivateKey: typeof encryptedPrivateKey === 'string' ? JSON.parse(encryptedPrivateKey) : encryptedPrivateKey,
          publicKey,
          salt,
        },
      });
    }

    res.status(201).json({ message: 'Key pair stored successfully' });
  } catch (error) {
    console.error('Store key pair error:', error.message, error.stack);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const getPublicKey = async (req, res) => {
  try {
    const { userId } = req.params;

    const keyPair = await prisma.userKeyPair.findUnique({
      where: { userId },
      select: {
        publicKey: true,
        salt: true,
      },
    });

    if (!keyPair) {
      return res.status(404).json({ message: 'User has not set up encryption keys yet' });
    }

    res.json(keyPair);
  } catch (error) {
    console.error('Get public key error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getKeyPair = async (req, res) => {
  try {
    const keyPair = await prisma.userKeyPair.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        encryptedPrivateKey: true,
        publicKey: true,
        salt: true,
      },
    });

    if (!keyPair) {
      return res.json(null);
    }

    res.json(keyPair);
  } catch (error) {
    console.error('Get key pair error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getWrappedItemKeys = async (req, res) => {
  try {
    const shares = await prisma.passwordShare.findMany({
      where: { sharedWithId: req.user.id },
      select: {
        id: true,
        passwordId: true,
        encryptedItemKey: true,
      },
    });

    res.json(shares);
  } catch (error) {
    console.error('Get wrapped item keys error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const reWrapItemKeys = async (req, res) => {
  try {
    const { wrappedKeys } = req.body;

    if (!wrappedKeys || !Array.isArray(wrappedKeys) || wrappedKeys.length === 0) {
      return res.status(400).json({ message: 'wrappedKeys array is required' });
    }

    if (wrappedKeys.length > 500) {
      return res.status(400).json({ message: 'Cannot re-wrap more than 500 keys at once' });
    }

    // Object-level authorization: a user may only re-wrap keys for shares
    // that were shared WITH them (sharedWithId === caller). This prevents a
    // caller from overwriting another user's wrapped key material.
    const shareIds = wrappedKeys.map((item) => item.shareId).filter(Boolean);
    const ownedShares = await prisma.passwordShare.findMany({
      where: { id: { in: shareIds } },
      select: { id: true, sharedWithId: true },
    });
    const ownedShareIds = new Set(
      ownedShares.filter((s) => s.sharedWithId === req.user.id).map((s) => s.id)
    );

    const unauthorized = wrappedKeys.some((item) => !ownedShareIds.has(item.shareId));
    if (unauthorized) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates = wrappedKeys.map((item) =>
      prisma.passwordShare.update({
        where: { id: item.shareId },
        data: { encryptedItemKey: item.encryptedItemKey },
      })
    );

    await prisma.$transaction(updates);

    res.json({ message: 'Item keys re-wrapped successfully' });
  } catch (error) {
    console.error('Re-wrap item keys error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllVaultWrappedKeys = async (req, res) => {
  try {
    const userId = req.user.id;

    const folders = await prisma.folder.findMany({
      select: {
        id: true,
        wrappedKeys: true,
      },
    });

    const folderResults = [];
    const passwordResults = [];

    for (const folder of folders) {
      if (folder.wrappedKeys && folder.wrappedKeys[userId]) {
        folderResults.push({
          id: folder.id,
          wrappedKey: folder.wrappedKeys[userId],
        });
      }

      const passwords = await prisma.passwordEntry.findMany({
        where: { folderId: folder.id },
        select: { id: true, wrappedKeys: true },
      });

      for (const pw of passwords) {
        if (pw.wrappedKeys && pw.wrappedKeys[userId]) {
          passwordResults.push({
            id: pw.id,
            wrappedKey: pw.wrappedKeys[userId],
          });
        }
      }
    }

    res.json({ folders: folderResults, passwords: passwordResults });
  } catch (error) {
    console.error('Get all vault wrapped keys error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const reWrapVaultKeys = async (req, res) => {
  try {
    const { folders, passwords } = req.body;
    const userId = req.user.id;

    const canWriteFolder = async (folderId) => {
      const access = await getFolderAccess(folderId, req.user.id);
      return (
        !!access &&
        ['ADMINISTRATOR', 'READ_WRITE', 'FULL_ACCESS'].includes(access)
      );
    };

    let count = 0;

    await prisma.$transaction(async (tx) => {
      if (Array.isArray(folders)) {
        for (const item of folders) {
          if (!item.id || !item.wrappedKeys) continue;

          // Object-level authorization: only authorized writers may mutate
          // a folder's key material.
          if (!(await canWriteFolder(item.id))) {
            throw new Error('ACCESS_DENIED');
          }

          const existing = await tx.folder.findUnique({
            where: { id: item.id },
            select: { wrappedKeys: true },
          });

          // Replace only the caller's own entry — preserve everyone else's
          // wrapped keys (their public keys are still valid).
          const mergedWrappedKeys = {
            ...(existing?.wrappedKeys || {}),
          };
          delete mergedWrappedKeys[userId];
          Object.assign(mergedWrappedKeys, item.wrappedKeys);

          await tx.folder.update({
            where: { id: item.id },
            data: { wrappedKeys: mergedWrappedKeys },
          });
          count += 1;
        }
      }

      if (Array.isArray(passwords)) {
        for (const item of passwords) {
          if (!item.id || !item.wrappedKeys) continue;

          // Object-level authorization: only authorized writers may mutate
          // a password entry's key material.
          const pw = await tx.passwordEntry.findUnique({
            where: { id: item.id },
            select: { folderId: true },
          });
          if (!pw || !pw.folderId || !(await canWriteFolder(pw.folderId))) {
            throw new Error('ACCESS_DENIED');
          }

          const existing = await tx.passwordEntry.findUnique({
            where: { id: item.id },
            select: { wrappedKeys: true },
          });

          const mergedWrappedKeys = {
            ...(existing?.wrappedKeys || {}),
          };
          delete mergedWrappedKeys[userId];
          Object.assign(mergedWrappedKeys, item.wrappedKeys);

          await tx.passwordEntry.update({
            where: { id: item.id },
            data: { wrappedKeys: mergedWrappedKeys },
          });
          count += 1;
        }
      }
    });

    res.json({ message: 'Vault keys re-wrapped successfully', count });
  } catch (error) {
    console.error('Re-wrap vault keys error:', error);
    if (error.message === 'ACCESS_DENIED') {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  storeKeyPair,
  getPublicKey,
  getKeyPair,
  getWrappedItemKeys,
  reWrapItemKeys,
  getAllVaultWrappedKeys,
  reWrapVaultKeys,
};
