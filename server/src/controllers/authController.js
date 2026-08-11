const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const generateId = require('../utils/generateId');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=<>?/{}[\]|~`])/;

const validateEmail = (email) => {
  if (!email) return 'Email is required';
  const trimmed = email.trim();
  if (trimmed !== email) return 'Email must not contain leading or trailing spaces';
  if (trimmed.length > 254) return 'Email is too long (max 254 characters)';

  const atIndex = email.indexOf('@');
  if (atIndex < 1) return 'Email must have characters before the @';

  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);

  if (localPart.length > 64) return 'Email local part is too long (max 64 characters)';
  if (!domainPart) return 'Email must contain a domain after the @';
  if (!domainPart.includes('.')) return 'Email domain must include a dot (e.g., gmail.com)';
  if (domainPart.startsWith('.')) return 'Email domain must not start with a dot';
  if (domainPart.endsWith('.')) return 'Email domain must not end with a dot';
  if (domainPart.includes('..')) return 'Email must not contain consecutive dots';

  const tld = domainPart.split('.').pop();
  if (tld.length < 2) return 'Email top-level domain must be at least 2 characters (e.g., .com, .org)';

  return null;
};

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

    if (fullName.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }

    const emailValidationError = validateEmail(email);
    if (emailValidationError) {
      return res.status(400).json({ message: emailValidationError });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({ message: 'Password must include uppercase, lowercase, number, and special character' });
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

    const emailValidationError = validateEmail(email);
    if (emailValidationError) {
      return res.status(400).json({ message: emailValidationError });
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

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

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

    if (masterPassword.length < 8) {
      return res.status(400).json({ message: 'Master password must be at least 8 characters' });
    }

    if (!PASSWORD_REGEX.test(masterPassword)) {
      return res.status(400).json({
        message: 'Master password must include uppercase, lowercase, number, and special character',
      });
    }

    if (hint && hint.length > 100) {
      return res.status(400).json({ message: 'Hint must be under 100 characters' });
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

const updateProfile = async (req, res) => {
  try {
    const { fullName, email } = req.body;
    const userId = req.user.id;

    if (!fullName || !email) {
      return res.status(400).json({ message: 'Full name and email are required' });
    }

    const emailValidationError = validateEmail(email);
    if (emailValidationError) {
      return res.status(400).json({ message: emailValidationError });
    }

    if (fullName.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }

    if (email !== req.user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { fullName: fullName.trim(), email },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        masterPasswordHash: true,
        masterPasswordHint: true,
        encryptionSalt: true,
        createdAt: true,
      },
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        ...updated,
        hasMasterPassword: !!updated.masterPasswordHash,
        masterPasswordHint: updated.masterPasswordHint,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        message: 'New password must include uppercase, lowercase, number, and special character',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const changeMasterPassword = async (req, res) => {
  try {
    const { currentMasterPassword, newMasterPassword, hint } = req.body;
    const userId = req.user.id;

    if (!currentMasterPassword || !newMasterPassword) {
      return res.status(400).json({ message: 'Current and new master password are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.masterPasswordHash) {
      return res.status(400).json({ message: 'Master password not set' });
    }

    const isMatch = await bcrypt.compare(currentMasterPassword, user.masterPasswordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current master password is incorrect' });
    }

    if (newMasterPassword.length < 8) {
      return res.status(400).json({ message: 'New master password must be at least 8 characters' });
    }

    if (!PASSWORD_REGEX.test(newMasterPassword)) {
      return res.status(400).json({
        message: 'New master password must include uppercase, lowercase, number, and special character',
      });
    }

    const masterPasswordHash = await bcrypt.hash(newMasterPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: {
        masterPasswordHash,
        masterPasswordHint: hint || null,
      },
    });

    res.json({ message: 'Master password changed successfully' });
  } catch (error) {
    console.error('Change master password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const reencryptPasswords = async (req, res) => {
  try {
    const { passwords } = req.body;

    if (!passwords || !Array.isArray(passwords) || passwords.length === 0) {
      return res.status(400).json({ message: 'passwords array is required' });
    }

    if (passwords.length > 1000) {
      return res.status(400).json({ message: 'Cannot re-encrypt more than 1000 passwords at once' });
    }

    const updates = passwords.map((pw) =>
      prisma.passwordEntry.update({
        where: { id: pw.id, createdById: req.user.id },
        data: {
          encryptedPassword: pw.encryptedPassword,
          ...(pw.encryptedNote !== undefined && { encryptedNote: pw.encryptedNote }),
        },
      })
    );

    await prisma.$transaction(updates);

    res.json({ message: 'Passwords re-encrypted successfully' });
  } catch (error) {
    console.error('Re-encrypt passwords error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  saveLoginActivity,
  login,
  me,
  setMasterPassword,
  updateProfile,
  changePassword,
  changeMasterPassword,
  reencryptPasswords,
};