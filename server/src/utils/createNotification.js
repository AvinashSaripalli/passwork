const prisma = require('../config/prisma');

const createNotification = async ({
  userId,
  title,
  message,
  type,
  metadata = {},
}) => {
  try {
    const id = `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    await prisma.notification.create({
      data: {
        id,
        userId,
        title,
        message,
        type,
        metadata,
      },
    });
  } catch (error) {
    console.error('Create notification error:', error);
  }
};

module.exports = createNotification;