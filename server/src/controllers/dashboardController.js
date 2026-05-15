const prisma = require('../config/prisma');

const allowedRanges = ['7D', '30D', 'THIS_MONTH', 'LAST_MONTH', '6M'];

const getDateOnly = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

const getDayLabel = (date) =>
  new Date(date).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
  });

const getMonthLabel = (date) =>
  new Date(date).toLocaleString('en-US', {
    month: 'short',
  });

const getAccessibleVaultIds = async (user) => {
  if (user.role === 'ADMIN') {
    const vaults = await prisma.vault.findMany({
      select: { id: true },
    });

    return vaults.map((vault) => vault.id);
  }

  const vaults = await prisma.vault.findMany({
    where: {
      ownerId: user.id,
      type: 'PERSONAL',
    },
    select: { id: true },
  });

  return vaults.map((vault) => vault.id);
};

const getPasswordWhere = async (user) => {
  const vaultIds = await getAccessibleVaultIds(user);

  if (user.role === 'ADMIN') {
    return {
      vaultId: {
        in: vaultIds,
      },
    };
  }

  return {
    vaultId: {
      in: vaultIds,
    },
    createdById: user.id,
  };
};

const buildTrendRange = (range) => {
  const now = new Date();
  const startDate = new Date();
  const endDate = new Date();

  if (range === '7D') {
    startDate.setDate(now.getDate() - 6);
  } else if (range === '30D') {
    startDate.setDate(now.getDate() - 29);
  } else if (range === 'THIS_MONTH') {
    startDate.setFullYear(now.getFullYear(), now.getMonth(), 1);
  } else if (range === 'LAST_MONTH') {
    startDate.setFullYear(now.getFullYear(), now.getMonth() - 1, 1);
    endDate.setFullYear(now.getFullYear(), now.getMonth(), 0);
  } else {
    startDate.setMonth(now.getMonth() - 5);
    startDate.setDate(1);
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
};

const buildTrendBuckets = (range, startDate, endDate) => {
  const buckets = [];

  if (range === '6M') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);

      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: getMonthLabel(d),
        added: 0,
        deleted: 0,
      });
    }

    return buckets;
  }

  const current = new Date(startDate);

  while (current <= endDate) {
    buckets.push({
      key: getDateOnly(current),
      label: getDayLabel(current),
      added: 0,
      deleted: 0,
    });

    current.setDate(current.getDate() + 1);
  }

  return buckets;
};

const calculateSecurityScore = ({
  totalPasswords,
  weakPasswords,
  oldPasswords,
  riskPasswords,
}) => {
  if (totalPasswords === 0) return 100;

  const weakPenalty = (weakPasswords / totalPasswords) * 40;
  const oldPenalty = (oldPasswords / totalPasswords) * 25;
  const riskPenalty = (riskPasswords / totalPasswords) * 35;

  return Math.max(
    0,
    Math.round(100 - weakPenalty - oldPenalty - riskPenalty)
  );
};

const getSecuritySummary = async (req, res) => {
  try {
    const where = await getPasswordWhere(req.user);

    const passwords = await prisma.passwordEntry.findMany({
      where,
      select: {
        id: true,
        isWeak: true,
        isOld: true,
        isAtRisk: true,
      },
    });

    const totalPasswordsForHealth = passwords.length;
    const weakPasswords = passwords.filter((item) => item.isWeak).length;
    const oldPasswords = passwords.filter((item) => item.isOld).length;
    const riskPasswords = passwords.filter((item) => item.isAtRisk).length;

    const securityScore = calculateSecurityScore({
      totalPasswords: totalPasswordsForHealth,
      weakPasswords,
      oldPasswords,
      riskPasswords,
    });

    const totalPasswords = await prisma.passwordEntry.count();

    const companyPasswords = await prisma.passwordEntry.count({
      where: {
        vault: {
          type: 'COMPANY',
        },
      },
    });

    const personalPasswords = await prisma.passwordEntry.count({
      where: {
        vault: {
          type: 'PERSONAL',
        },
      },
    });

    const deletedPasswords = await prisma.activityLog.count({
      where: {
        action: 'DELETE_PASSWORD',
      },
    });

    res.json({
      totalPasswords,
      companyPasswords,
      personalPasswords,
      deletedPasswords,
      weakPasswords,
      oldPasswords,
      riskPasswords,
      securityScore,
    });
  } catch (error) {
    console.error('Security summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPasswordActivityTrend = async (req, res) => {
  try {
    const range = allowedRanges.includes(req.query.range)
      ? req.query.range
      : '6M';

    const vaultIds = await getAccessibleVaultIds(req.user);
    const { startDate, endDate } = buildTrendRange(range);
    const trendBuckets = buildTrendBuckets(range, startDate, endDate);

    const activityLogs = await prisma.activityLog.findMany({
      where: {
        userId: req.user.role === 'ADMIN' ? undefined : req.user.id,
        action: {
          in: ['CREATE_PASSWORD', 'DELETE_PASSWORD'],
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const filteredLogs = activityLogs.filter((log) => {
      const vaultId = log.metadata?.vaultId;
      return vaultIds.includes(vaultId);
    });

    filteredLogs.forEach((log) => {
      let key;

      if (range === '6M') {
        const d = new Date(log.createdAt);
        key = `${d.getFullYear()}-${d.getMonth()}`;
      } else {
        key = getDateOnly(log.createdAt);
      }

      const found = trendBuckets.find((item) => item.key === key);
      if (!found) return;

      if (log.action === 'CREATE_PASSWORD') {
        found.added += 1;
      }

      if (log.action === 'DELETE_PASSWORD') {
        found.deleted += 1;
      }
    });

    const passwordTrend = trendBuckets.map((item) => ({
      label: item.label,
      added: item.added,
      deleted: item.deleted,
    }));

    res.json({
      range,
      passwordTrend,
    });
  } catch (error) {
    console.error('Password activity trend error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRecentPasswords = async (req, res) => {
  try {
    const where = await getPasswordWhere(req.user);

    const recentPasswords = await prisma.passwordEntry.findMany({
      where,
      include: {
        vault: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
    });

    res.json({
      recentPasswords,
    });
  } catch (error) {
    console.error('Recent passwords error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getSecurityDashboard = async (req, res) => {
  try {
    const range = allowedRanges.includes(req.query.range)
      ? req.query.range
      : '6M';

    const where = await getPasswordWhere(req.user);
    const vaultIds = await getAccessibleVaultIds(req.user);

    const passwords = await prisma.passwordEntry.findMany({
      where,
      include: {
        vault: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const totalPasswordsForHealth = passwords.length;
    const weakPasswords = passwords.filter((item) => item.isWeak).length;
    const oldPasswords = passwords.filter((item) => item.isOld).length;
    const riskPasswords = passwords.filter((item) => item.isAtRisk).length;

    const securityScore = calculateSecurityScore({
      totalPasswords: totalPasswordsForHealth,
      weakPasswords,
      oldPasswords,
      riskPasswords,
    });

    const totalPasswords = await prisma.passwordEntry.count();

    const companyPasswords = await prisma.passwordEntry.count({
      where: {
        vault: {
          type: 'COMPANY',
        },
      },
    });

    const personalPasswords = await prisma.passwordEntry.count({
      where: {
        vault: {
          type: 'PERSONAL',
        },
      },
    });

    const deletedPasswords = await prisma.activityLog.count({
      where: {
        action: 'DELETE_PASSWORD',
      },
    });

    const { startDate, endDate } = buildTrendRange(range);
    const trendBuckets = buildTrendBuckets(range, startDate, endDate);

    const activityLogs = await prisma.activityLog.findMany({
      where: {
        userId: req.user.role === 'ADMIN' ? undefined : req.user.id,
        action: {
          in: ['CREATE_PASSWORD', 'DELETE_PASSWORD'],
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const filteredLogs = activityLogs.filter((log) => {
      const vaultId = log.metadata?.vaultId;
      return vaultIds.includes(vaultId);
    });

    filteredLogs.forEach((log) => {
      let key;

      if (range === '6M') {
        const d = new Date(log.createdAt);
        key = `${d.getFullYear()}-${d.getMonth()}`;
      } else {
        key = getDateOnly(log.createdAt);
      }

      const found = trendBuckets.find((item) => item.key === key);
      if (!found) return;

      if (log.action === 'CREATE_PASSWORD') {
        found.added += 1;
      }

      if (log.action === 'DELETE_PASSWORD') {
        found.deleted += 1;
      }
    });

    const passwordTrend = trendBuckets.map((item) => ({
      label: item.label,
      added: item.added,
      deleted: item.deleted,
    }));

    res.json({
      totalPasswords,
      companyPasswords,
      personalPasswords,
      deletedPasswords,
      weakPasswords,
      oldPasswords,
      riskPasswords,
      securityScore,
      recentPasswords: passwords.slice(0, 10),
      passwordTrend,
    });
  } catch (error) {
    console.error('Security dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getSecuritySummary,
  getPasswordActivityTrend,
  getRecentPasswords,
  getSecurityDashboard,
};