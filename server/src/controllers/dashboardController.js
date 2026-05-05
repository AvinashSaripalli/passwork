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

const getAccessibleVaultIds = async (userId) => {
  const vaults = await prisma.vault.findMany({
    where: {
      OR: [
        { ownerId: userId },
        {
          permissions: {
            some: {
              userId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return vaults.map((vault) => vault.id);
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
    const vaultIds = await getAccessibleVaultIds(req.user.id);

    const passwords = await prisma.passwordEntry.findMany({
      where: {
        vaultId: {
          in: vaultIds,
        },
      },
      select: {
        id: true,
        isWeak: true,
        isOld: true,
        isAtRisk: true,
      },
    });

    const totalPasswords = passwords.length;
    const weakPasswords = passwords.filter((item) => item.isWeak).length;
    const oldPasswords = passwords.filter((item) => item.isOld).length;
    const riskPasswords = passwords.filter((item) => item.isAtRisk).length;

    const securityScore = calculateSecurityScore({
      totalPasswords,
      weakPasswords,
      oldPasswords,
      riskPasswords,
    });

    res.json({
      totalPasswords,
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

    const vaultIds = await getAccessibleVaultIds(req.user.id);

    const { startDate, endDate } = buildTrendRange(range);
    const trendBuckets = buildTrendBuckets(range, startDate, endDate);

    const activityLogs = await prisma.activityLog.findMany({
      where: {
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
    const vaultIds = await getAccessibleVaultIds(req.user.id);

    const recentPasswords = await prisma.passwordEntry.findMany({
      where: {
        vaultId: {
          in: vaultIds,
        },
      },
      include: {
        vault: {
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

    const vaultIds = await getAccessibleVaultIds(req.user.id);

    const passwords = await prisma.passwordEntry.findMany({
      where: {
        vaultId: {
          in: vaultIds,
        },
      },
      include: {
        vault: {
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

    const totalPasswords = passwords.length;
    const weakPasswords = passwords.filter((item) => item.isWeak).length;
    const oldPasswords = passwords.filter((item) => item.isOld).length;
    const riskPasswords = passwords.filter((item) => item.isAtRisk).length;

    const securityScore = calculateSecurityScore({
      totalPasswords,
      weakPasswords,
      oldPasswords,
      riskPasswords,
    });

    const { startDate, endDate } = buildTrendRange(range);
    const trendBuckets = buildTrendBuckets(range, startDate, endDate);

    const activityLogs = await prisma.activityLog.findMany({
      where: {
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

      if (log.action === 'CREATE_PASSWORD') found.added += 1;
      if (log.action === 'DELETE_PASSWORD') found.deleted += 1;
    });

    const passwordTrend = trendBuckets.map((item) => ({
      label: item.label,
      added: item.added,
      deleted: item.deleted,
    }));

    res.json({
      totalPasswords,
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

const getPasswordHealthBreakdown = async (req, res) => {
  try {
    const vaultIds = await getAccessibleVaultIds(req.user.id);

    const passwords = await prisma.passwordEntry.findMany({
      where: {
        vaultId: { in: vaultIds },
      },
      select: {
        isWeak: true,
        isOld: true,
        isAtRisk: true,
      },
    });

    const weak = passwords.filter((p) => p.isWeak).length;
    const old = passwords.filter((p) => p.isOld).length;
    const risk = passwords.filter((p) => p.isAtRisk).length;
    const safe = passwords.filter(
      (p) => !p.isWeak && !p.isOld && !p.isAtRisk
    ).length;

    res.json({
      passwordHealth: [
        { name: 'Safe', value: safe },
        { name: 'Weak', value: weak },
        { name: 'Old', value: old },
        { name: 'Risk', value: risk },
      ],
    });
  } catch (error) {
    console.error('Password health breakdown error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getVaultPasswordCounts = async (req, res) => {
  try {
    const vaultIds = await getAccessibleVaultIds(req.user.id);

    const vaults = await prisma.vault.findMany({
      where: {
        id: { in: vaultIds },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            passwords: true,
          },
        },
      },
    });

    const vaultPasswordCounts = vaults.map((vault) => ({
      name: vault.name,
      count: vault._count.passwords,
    }));

    res.json({ vaultPasswordCounts });
  } catch (error) {
    console.error('Vault password counts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRecentActivityTimeline = async (req, res) => {
  try {
    const vaultIds = await getAccessibleVaultIds(req.user.id);

    const logs = await prisma.activityLog.findMany({
      where: {},
      orderBy: {
        createdAt: 'desc',
      },
      take: 30,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const filteredLogs = logs
      .filter((log) => {
        const vaultId = log.metadata?.vaultId;
        return vaultIds.includes(vaultId);
      })
      .slice(0, 8);

    res.json({
      recentActivity: filteredLogs,
    });
  } catch (error) {
    console.error('Recent activity timeline error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getSecuritySummary,
  getPasswordActivityTrend,
  getRecentPasswords,
  getSecurityDashboard,
  getPasswordHealthBreakdown,
  getVaultPasswordCounts,
  getRecentActivityTimeline,
};