const prisma = require('../config/prisma');

const { getVaultAccess } = require('../utils/permissions');

const getAllActivityLogs = async (req, res) => {
  try {
    const logs = await prisma.activityLog.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
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