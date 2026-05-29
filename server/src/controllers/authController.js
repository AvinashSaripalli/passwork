const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    req.ip ||
    ''
  );
};

const saveLoginActivity = async ({ req, userId, status }) => {
  try {
    const loginActivityId = `LOGIN-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    await prisma.loginActivity.create({
      data: {
        id: loginActivityId,
        userId,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
        status,
      },
    });
  } catch (error) {
    console.error('Save login activity error:', error);
  }
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

    await saveLoginActivity({
      req,
      userId: user.id,
      status: 'SUCCESS',
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        hasMasterPassword: false,
        masterPasswordHint: null,
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
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.isActive === false) {
      await saveLoginActivity({
        req,
        userId: user.id,
        status: 'BLOCKED',
      });

      return res.status(403).json({
        message: 'Your account is inactive. Please contact administrator.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      await saveLoginActivity({
        req,
        userId: user.id,
        status: 'FAILED',
      });

      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);

    await saveLoginActivity({
      req,
      userId: user.id,
      status: 'SUCCESS',
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
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
      hasMasterPassword: !!user.masterPasswordHash,
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

    const isMatch = await bcrypt.compare(
      masterPassword,
      user.masterPasswordHash
    );

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
        masterPasswordHash: {
          not: null,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!adminUser) {
      return res.status(400).json({
        message: 'Administrator master password not set',
      });
    }

    const isMatch = await bcrypt.compare(
      masterPassword,
      adminUser.masterPasswordHash
    );

    if (!isMatch) {
      return res.status(400).json({
        message: 'Invalid administrator master password',
      });
    }

    res.json({ verified: true });
  } catch (error) {
    console.error('Verify administrator master password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  saveLoginActivity,
  login,
  me,
  setMasterPassword,
  verifyMasterPassword,
  verifyAdministratorMasterPassword,
};