const prisma = require('../config/prisma');

function getWrappedKeyForUser(wrappedKeys, userId) {
  if (!wrappedKeys || typeof wrappedKeys !== 'object') return null;
  return wrappedKeys[userId] || null;
}

function setWrappedKeyForUser(wrappedKeys, userId, wrappedKey) {
  const keys = { ...(wrappedKeys || {}) };
  if (wrappedKey) {
    keys[userId] = wrappedKey;
  } else {
    delete keys[userId];
  }
  return keys;
}

function removeWrappedKeyForUser(wrappedKeys, userId) {
  if (!wrappedKeys || typeof wrappedKeys !== 'object') return null;
  const keys = { ...wrappedKeys };
  delete keys[userId];
  return Object.keys(keys).length > 0 ? keys : null;
}

function extractWrappedKeysForUser(wrappedKeys, userIds) {
  if (!wrappedKeys || typeof wrappedKeys !== 'object') return {};
  const result = {};
  for (const uid of userIds) {
    if (wrappedKeys[uid]) {
      result[uid] = wrappedKeys[uid];
    }
  }
  return result;
}

async function addWrappedKeysForFolder(folderId, userWrappedKeys) {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { wrappedKeys: true },
  });
  const updated = { ...(folder.wrappedKeys || {}), ...userWrappedKeys };
  await prisma.folder.update({
    where: { id: folderId },
    data: { wrappedKeys: updated },
  });
  return updated;
}

async function addWrappedKeysForPassword(passwordId, userWrappedKeys) {
  const password = await prisma.passwordEntry.findUnique({
    where: { id: passwordId },
    select: { wrappedKeys: true },
  });
  const updated = { ...(password.wrappedKeys || {}), ...userWrappedKeys };
  await prisma.passwordEntry.update({
    where: { id: passwordId },
    data: { wrappedKeys: updated },
  });
  return updated;
}

async function revokeWrappedKeysForUser(vaultId, userId) {
  const folders = await prisma.folder.findMany({
    where: { vaultId },
    select: { id: true, wrappedKeys: true },
  });

  const folderUpdates = folders
    .filter((f) => f.wrappedKeys && f.wrappedKeys[userId])
    .map((f) => {
      const keys = { ...f.wrappedKeys };
      delete keys[userId];
      return prisma.folder.update({
        where: { id: f.id },
        data: { wrappedKeys: Object.keys(keys).length > 0 ? keys : null },
      });
    });

  const passwordUpdates = [];
  for (const folder of folders) {
    const passwords = await prisma.passwordEntry.findMany({
      where: { folderId: folder.id },
      select: { id: true, wrappedKeys: true },
    });
    for (const p of passwords) {
      if (p.wrappedKeys && p.wrappedKeys[userId]) {
        const keys = { ...p.wrappedKeys };
        delete keys[userId];
        passwordUpdates.push(
          prisma.passwordEntry.update({
            where: { id: p.id },
            data: { wrappedKeys: Object.keys(keys).length > 0 ? keys : null },
          })
        );
      }
    }
  }

  await prisma.$transaction([...folderUpdates, ...passwordUpdates]);
}

async function getVaultWrappedKeysForUser(vaultId, userId) {
  const folders = await prisma.folder.findMany({
    where: { vaultId },
    select: {
      id: true,
      wrappedKeys: true,
      passwords: {
        select: {
          id: true,
          wrappedKeys: true,
        },
      },
    },
  });

  const folderKeys = {};
  const itemKeys = {};

  for (const folder of folders) {
    if (folder.wrappedKeys && folder.wrappedKeys[userId]) {
      folderKeys[folder.id] = folder.wrappedKeys[userId];
    }
    for (const pwd of folder.passwords) {
      if (pwd.wrappedKeys && pwd.wrappedKeys[userId]) {
        itemKeys[pwd.id] = pwd.wrappedKeys[userId];
      }
    }
  }

  return { folderKeys, itemKeys };
}

async function getItemsNeedingWrapping(vaultId, userId) {
  const folders = await prisma.folder.findMany({
    where: { vaultId },
    select: {
      id: true,
      wrappedKeys: true,
      passwords: {
        select: {
          id: true,
          wrappedKeys: true,
        },
      },
    },
  });

  const foldersNeedingWrap = [];
  const itemsNeedingWrap = [];

  for (const folder of folders) {
    if (!folder.wrappedKeys || !folder.wrappedKeys[userId]) {
      foldersNeedingWrap.push(folder.id);
    }
    for (const pwd of folder.passwords) {
      if (!pwd.wrappedKeys || !pwd.wrappedKeys[userId]) {
        itemsNeedingWrap.push(pwd.id);
      }
    }
  }

  return { foldersNeedingWrap, itemsNeedingWrap };
}

module.exports = {
  getWrappedKeyForUser,
  setWrappedKeyForUser,
  removeWrappedKeyForUser,
  extractWrappedKeysForUser,
  addWrappedKeysForFolder,
  addWrappedKeysForPassword,
  revokeWrappedKeysForUser,
  getVaultWrappedKeysForUser,
  getItemsNeedingWrapping,
};
