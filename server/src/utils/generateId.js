const prisma = require('../config/prisma');

const config = {
  user: 'USER',
  vault: 'VAULT',
  folder: 'FOL',
  folderPermission: 'FPERM',
  vaultPermission: 'VPERM',
  passwordEntry: 'PWD',
  activityLog: 'ACT',
};

async function generateId(model) {
  const prefix = config[model];

  if (!prefix) {
    throw new Error(`Unsupported model: ${model}`);
  }

  const last = await prisma[model].findFirst({
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  let next = 1;

  if (last?.id) {
    const match = last.id.match(/-(\d+)$/);
    if (match) {
      next = Number(match[1]) + 1;
    }
  }

  return `${prefix}-${String(next).padStart(3, '0')}`;
}

module.exports = generateId;