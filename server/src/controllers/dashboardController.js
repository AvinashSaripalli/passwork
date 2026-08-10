// controllers/dashboardController.js

const prisma = require('../config/prisma');

const allowedRanges = [
  '7D',
  '30D',
  'THIS_MONTH',
  'LAST_MONTH',
  '6M',
];

// LOCAL DATE KEY (FIXES IST TIMEZONE ISSUE)
const getLocalDateKey = (date) => {
  const d = new Date(date);

  const year = d.getFullYear();

  const month = String(
    d.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    d.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getAccessibleVaultIds = async (
  user,
  vaultType
) => {
  // ADMIN COMPANY DASHBOARD
  if (
    user.role === 'ADMIN' &&
    vaultType === 'COMPANY'
  ) {
    const vaults = await prisma.vault.findMany({
      where: {
        type: 'COMPANY',
      },

      select: {
        id: true,
      },
    });

    return vaults.map((v) => v.id);
  }

  // PERSONAL DASHBOARD
  const vaults = await prisma.vault.findMany({
    where: {
      ownerId: user.id,
      type: 'PERSONAL',
    },

    select: {
      id: true,
    },
  });

  return vaults.map((v) => v.id);
};

const getPasswordWhere = async (
  user,
  vaultType
) => {
  const vaultIds = await getAccessibleVaultIds(
    user,
    vaultType
  );

  return {
    vaultId: {
      in: vaultIds,
    },
  };
};

const calculateSecurityScore = ({
  totalPasswords,
  weakPasswords,
  oldPasswords,
  riskPasswords,
}) => {
  if (totalPasswords === 0) return 100;

  const weakPenalty =
    (weakPasswords / totalPasswords) * 40;

  const oldPenalty =
    (oldPasswords / totalPasswords) * 25;

  const riskPenalty =
    (riskPasswords / totalPasswords) * 35;

  return Math.max(
    0,
    Math.round(
      100 -
        weakPenalty -
        oldPenalty -
        riskPenalty
    )
  );
};

// SECURITY SUMMARY
const getSecuritySummary = async (
  req,
  res
) => {
  try {
    const vaultType =
      req.query.vaultType === 'COMPANY'
        ? 'COMPANY'
        : 'PERSONAL';

    const where = await getPasswordWhere(
      req.user,
      vaultType
    );

    const passwords =
      await prisma.passwordEntry.findMany({
        where,

        select: {
          isWeak: true,
          isOld: true,
          isAtRisk: true,
        },
      });

    const totalPasswords = passwords.length;

    const weakPasswords = passwords.filter(
      (p) => p.isWeak
    ).length;

    const oldPasswords = passwords.filter(
      (p) => p.isOld
    ).length;

    const riskPasswords = passwords.filter(
      (p) => p.isAtRisk
    ).length;

    const securityScore =
      calculateSecurityScore({
        totalPasswords,
        weakPasswords,
        oldPasswords,
        riskPasswords,
      });

    const deleteLogs = await prisma.activityLog.findMany({
      where: { action: 'DELETE_PASSWORD' },
      select: { metadata: true },
    });

    const deletedPasswords = deleteLogs.filter((log) => {
      const vaultId = log.metadata?.vaultId;
      return where.vaultId.in.includes(vaultId);
    }).length;

    res.json({
      totalPasswords,

      companyPasswords:
        vaultType === 'COMPANY'
          ? totalPasswords
          : 0,

      personalPasswords:
        vaultType === 'PERSONAL'
          ? totalPasswords
          : 0,

      deletedPasswords,

      weakPasswords,
      oldPasswords,
      riskPasswords,
      securityScore,
    });
  } catch (error) {
    console.error(error);

    res
      .status(500)
      .json({ message: 'Server error' });
  }
};

// PASSWORD ACTIVITY TREND
const getPasswordActivityTrend = async (
  req,
  res
) => {
  try {
    const range = allowedRanges.includes(
      req.query.range
    )
      ? req.query.range
      : '6M';

    const vaultType =
      req.query.vaultType === 'COMPANY'
        ? 'COMPANY'
        : 'PERSONAL';

    const vaultIds = await getAccessibleVaultIds(
      req.user,
      vaultType
    );

    // DATE RANGE
    const now = new Date();

    const startDate = new Date();

    const endDate = new Date();

    if (range === '7D') {
      startDate.setDate(now.getDate() - 6);
    }

    else if (range === '30D') {
      startDate.setDate(now.getDate() - 29);
    }

    else if (range === 'THIS_MONTH') {
      startDate.setFullYear(
        now.getFullYear(),
        now.getMonth(),
        1
      );
    }

    else if (range === 'LAST_MONTH') {
      startDate.setFullYear(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );

      endDate.setFullYear(
        now.getFullYear(),
        now.getMonth(),
        0
      );
    }

    else {
      startDate.setMonth(now.getMonth() - 5);

      startDate.setDate(1);
    }

    startDate.setHours(0, 0, 0, 0);

    endDate.setHours(23, 59, 59, 999);

    // FETCH PASSWORDS
    const passwords =
      await prisma.passwordEntry.findMany({
        where: {
          vaultId: {
            in: vaultIds,
          },

          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },

        select: {
          createdAt: true,
        },
      });

    // FETCH DELETED PASSWORD LOGS
    const deleteLogs =
      await prisma.activityLog.findMany({
        where: {
          action: 'DELETE_PASSWORD',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },

        select: {
          createdAt: true,
          metadata: true,
        },
      });

    const relevantDeletes = deleteLogs.filter(
      (log) => {
        const vaultId =
          log.metadata?.vaultId;
        return vaultIds.includes(vaultId);
      }
    );

    // CREATE BUCKETS
    const buckets = [];

    // 6 MONTHS
    if (range === '6M') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date();

        d.setMonth(d.getMonth() - i);

        buckets.push({
          key: `${d.getFullYear()}-${d.getMonth()}`,

          label: d.toLocaleString('en-US', {
            month: 'short',
          }),

          added: 0,
          deleted: 0,
        });
      }
    }

    // DAYS
    else {
      const current = new Date(startDate);

      while (current <= endDate) {
        buckets.push({
          key: getLocalDateKey(current),

          label: current.toLocaleString(
            'en-US',
            {
              day: '2-digit',
              month: 'short',
            }
          ),

          added: 0,
          deleted: 0,
        });

        current.setDate(
          current.getDate() + 1
        );
      }
    }

    // MAP PASSWORDS
    passwords.forEach((password) => {
      const d = new Date(
        password.createdAt
      );

      let key;

      if (range === '6M') {
        key = `${d.getFullYear()}-${d.getMonth()}`;
      } else {
        key = getLocalDateKey(d);
      }

      const found = buckets.find(
        (b) => b.key === key
      );

      if (!found) return;

      found.added += 1;
    });

    // MAP DELETES
    relevantDeletes.forEach((log) => {
      const d = new Date(log.createdAt);

      let key;

      if (range === '6M') {
        key = `${d.getFullYear()}-${d.getMonth()}`;
      } else {
        key = getLocalDateKey(d);
      }

      const found = buckets.find(
        (b) => b.key === key
      );

      if (!found) return;

      found.deleted += 1;
    });

    res.json({
      passwordTrend: buckets.map((b) => ({
        label: b.label,
        added: b.added,
        deleted: b.deleted,
      })),
    });
  } catch (error) {
    console.error(error);

    res
      .status(500)
      .json({ message: 'Server error' });
  }
};

// RECENT PASSWORDS
const getRecentPasswords = async (
  req,
  res
) => {
  try {
    const vaultType =
      req.query.vaultType === 'COMPANY'
        ? 'COMPANY'
        : 'PERSONAL';

    const where = await getPasswordWhere(
      req.user,
      vaultType
    );

    const recentPasswords =
      await prisma.passwordEntry.findMany({
        where,

        include: {
          vault: {
            select: { id: true, name: true, type: true },
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
    console.error(error);

    res
      .status(500)
      .json({ message: 'Server error' });
  }
};

module.exports = {
  getSecuritySummary,
  getPasswordActivityTrend,
  getRecentPasswords,
};