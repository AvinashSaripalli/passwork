const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const generateId = require('../utils/generateId');

const signToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '1d' }
  );
};

const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const crypto = require('crypto');
    const encryptionSalt = crypto.randomBytes(16).toString('hex');
    const userId = await generateId('user');

    const user = await prisma.user.create({
      data: {
        id: userId,
        fullName,
        email,
        passwordHash,
        encryptionSalt,
        role: 'USER',
      },
    });

    const token = signToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        masterPasswordHint: user.masterPasswordHint,
        hasMasterPassword: !!user.masterPasswordHash,
        encryptionSalt: user.encryptionSalt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    res.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      masterPasswordHint: user.masterPasswordHint,
      hasMasterPassword: !!user.masterPasswordHash, // ✅ ADD THIS
      encryptionSalt: user.encryptionSalt,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const setMasterPassword = async (req, res) => {
  try {
    const { masterPassword, hint } = req.body;

    if (!masterPassword) {
      return res.status(400).json({ message: 'Master password is required' });
    }

    const masterPasswordHash = await bcrypt.hash(masterPassword, 12);

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        masterPasswordHash,
        masterPasswordHint: hint || null,
      },
    });

    res.json({ message: 'Master password set successfully' });
  } catch (error) {
    console.error('Set master password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyMasterPassword = async (req, res) => {
  try {
    const { masterPassword } = req.body;

    if (!masterPassword) {
      return res.status(400).json({ message: 'Master password is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user || !user.masterPasswordHash) {
      return res.status(400).json({ message: 'Master password not set' });
    }

    const isMatch = await bcrypt.compare(masterPassword, user.masterPasswordHash);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid master password' });
    }

    res.json({ verified: true });
  } catch (error) {
    console.error('Verify master password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyAdministratorMasterPassword = async (req, res) => {
  try {
    const { masterPassword } = req.body;

    if (!masterPassword) {
      return res.status(400).json({ message: 'Master password is required' });
    }

    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
      },
    });

    if (!adminUser || !adminUser.masterPasswordHash) {
      return res.status(404).json({ message: 'Administrator master password not set' });
    }

    const isMatch = await bcrypt.compare(
      masterPassword,
      adminUser.masterPasswordHash
    );

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid administrator master password' });
    }

    res.json({ verified: true });
  } catch (error) {
    console.error('Verify administrator master password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  me,
  setMasterPassword,
  verifyMasterPassword,
  verifyAdministratorMasterPassword,
};