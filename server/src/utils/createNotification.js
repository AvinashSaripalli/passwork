const prisma = require('../config/prisma');
const generateId = require('./generateId');

const createNotification = async ({
  userId,
  title,
  message,
  type,
  metadata = {},
}) => {
  try {
    const id = await generateId('notification');

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