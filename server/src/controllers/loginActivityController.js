const prisma = require('../config/prisma');

const getLoginActivities = async (req, res) => {
  try {
    const where =
      req.user.role === 'ADMIN'
        ? {}
        : {
            userId: req.user.id,
          };

    const activities = await prisma.loginActivity.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    res.json({ activities });
  } catch (error) {
    console.error('Login activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getLoginActivities,
};