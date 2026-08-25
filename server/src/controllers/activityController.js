const prisma = require('../config/prisma');

const { getVaultAccess } = require('../utils/permissions');

const getAllActivityLogs = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const { departmentId } = req.query;

    let whereClause = isAdmin ? {} : { userId: req.user.id };

    if (departmentId && isAdmin) {
      const memberIds = (
        await prisma.departmentMember.findMany({
          where: { departmentId },
          select: { userId: true },
        })
      ).map((m) => m.userId);

      whereClause = { userId: { in: memberIds } };
    }

    const logs = await prisma.activityLog.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
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

    const filtered = isAdmin
      ? logs.filter((log) => !(log.metadata?.personalVault && log.userId !== req.user.id))
      : logs;

    res.json(filtered);
  } catch (error) {
    console.error('Get all activity logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getVaultActivityLogs = async (req, res) => {
  try {
    const vaultId = req.params.vaultId;

    const access = await getVaultAccess(vaultId, req.user.id);

    if (!access) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const logs = await prisma.activityLog.findMany({
      where: {
        OR: [
          {
            metadata: {
              path: ['vaultId'],
              equals: vaultId,
            },
          },
          {
            targetId: vaultId,
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    res.json(logs);
  } catch (error) {
    console.error('Get vault activity logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllActivityLogs,
  getVaultActivityLogs,
};