const prisma = require('../config/prisma');
const generateId = require('../utils/generateId');

const storeKeyPair = async (req, res) => {
  try {
    const { encryptedPrivateKey, publicKey, salt } = req.body;

    if (!encryptedPrivateKey || !publicKey || !salt) {
      return res.status(400).json({ message: 'encryptedPrivateKey, publicKey, and salt are required' });
    }

    console.log('Storing keypair for user:', req.user.id, 'pubKey type:', typeof publicKey, 'encPrivKey type:', typeof encryptedPrivateKey);

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

    const operations = [];

    if (folders && Array.isArray(folders)) {
      for (const item of folders) {
        if (!item.id || !item.wrappedKeys) continue;
        operations.push(
          prisma.folder.update({
            where: { id: item.id },
            data: { wrappedKeys: item.wrappedKeys },
          })
        );
      }
    }

    if (passwords && Array.isArray(passwords)) {
      for (const item of passwords) {
        if (!item.id || !item.wrappedKeys) continue;
        operations.push(
          prisma.passwordEntry.update({
            where: { id: item.id },
            data: { wrappedKeys: item.wrappedKeys },
          })
        );
      }
    }

    if (operations.length > 0) {
      await prisma.$transaction(operations);
    }

    res.json({ message: 'Vault keys re-wrapped successfully', count: operations.length });
  } catch (error) {
    console.error('Re-wrap vault keys error:', error);
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
