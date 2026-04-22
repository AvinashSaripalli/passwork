const prisma = require('../config/prisma');

const getSecurityDashboard = async (req, res) => {
  try {
    const accessibleVaults = await prisma.vault.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          {
            permissions: {
              some: {
                userId: req.user.id,
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    const vaultIds = accessibleVaults.map((vault) => vault.id);

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

    const recentPasswords = passwords.slice(0, 10);

    res.json({
      totalPasswords,
      weakPasswords,
      oldPasswords,
      riskPasswords,
      recentPasswords,
    });
  } catch (error) {
    console.error('Security dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getSecurityDashboard,
};