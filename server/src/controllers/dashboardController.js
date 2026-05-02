const prisma = require('../config/prisma');

const getMonthLabel = (date) =>
  new Date(date).toLocaleString('en-US', { month: 'short' });

const getSecurityDashboard = async (req, res) => {
  try {
    const accessibleVaults = await prisma.vault.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          { permissions: { some: { userId: req.user.id } } },
        ],
      },
      select: { id: true },
    });

    const vaultIds = accessibleVaults.map((v) => v.id);

    const passwords = await prisma.passwordEntry.findMany({
      where: {
        vaultId: { in: vaultIds },
      },
      include: {
        vault: {
          select: { id: true, name: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // ---------- FIX HERE ----------
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const activityLogs = await prisma.activityLog.findMany({
      where: {
        action: {
          in: ['CREATE_PASSWORD', 'DELETE_PASSWORD'],
        },
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // ✅ FILTER IN JS
    const filteredLogs = activityLogs.filter((log) => {
      const vaultId = log.metadata?.vaultId;
      return vaultIds.includes(vaultId);
    });

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);

      months.push({
        month: getMonthLabel(d),
        added: 0,
        deleted: 0,
      });
    }

    filteredLogs.forEach((log) => {
      const month = getMonthLabel(log.createdAt);
      const found = months.find((m) => m.month === month);

      if (!found) return;

      if (log.action === 'CREATE_PASSWORD') found.added += 1;
      if (log.action === 'DELETE_PASSWORD') found.deleted += 1;
    });

    res.json({
      totalPasswords: passwords.length,
      weakPasswords: passwords.filter((p) => p.isWeak).length,
      oldPasswords: passwords.filter((p) => p.isOld).length,
      riskPasswords: passwords.filter((p) => p.isAtRisk).length,
      recentPasswords: passwords.slice(0, 10),
      passwordTrend: months,
    });
  } catch (error) {
    console.error('Security dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getSecurityDashboard };