const prisma = require('../config/prisma');

const requireAdmin = (req, res) => {
  if (req.user.role !== 'ADMIN') {
    res.status(403).json({ message: 'Access denied' });
    return true;
  }
  return false;
};

const getUsers = async (req, res) => {
  try {
    if (requireAdmin(req, res)) return;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createUserByAdmin = async (req, res) => {
  try {
    if (requireAdmin(req, res)) return;

    const bcrypt = require('bcrypt');
    const crypto = require('crypto');
    const { fullName, email, password, role = 'USER' } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'fullName, email and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const encryptionSalt = crypto.randomBytes(16).toString('hex');

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        encryptionSalt,
        role,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user by admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    if (requireAdmin(req, res)) return;

    const { fullName, role, isActive } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        fullName,
        role,
        isActive,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (requireAdmin(req, res)) return;

    await prisma.user.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUsers,
  createUserByAdmin,
  updateUser,
  deleteUser,
};