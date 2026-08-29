const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const generateId = require('../utils/generateId');
const sendMail = require('../utils/sendMail');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=<>?/{}[\]|~`])/;

// Per-account brute-force lockout (in-memory).
// Tracks consecutive failed login attempts per email so that a single account
// cannot be hammered regardless of the source IP(s).
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const failedAttempts = new Map(); // email -> { count, lockedUntil }

function trackFailedAttempt(email) {
  const norm = (email || '').trim().toLowerCase();
  const record = failedAttempts.get(norm) || { count: 0, lockedUntil: 0 };

  // If already locked, keep the lock.
  if (record.lockedUntil > Date.now()) {
    return false;
  }

  record.count += 1;
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_WINDOW_MS;
    record.count = 0;
  }
  failedAttempts.set(norm, record);
  return true;
}

function resetFailedAttempts(email) {
  failedAttempts.delete((email || '').trim().toLowerCase());
}

function isAccountLocked(email) {
  const record = failedAttempts.get((email || '').trim().toLowerCase());
  if (!record) return false;
  if (record.lockedUntil > Date.now()) {
    return true;
  }
  // Lock expired — clear it.
  failedAttempts.delete((email || '').trim().toLowerCase());
  return false;
}

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

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL = '30d';

const signToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
};

const signRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'refreshToken is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // Only accept tokens explicitly minted as refresh tokens.
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || user.isActive === false) {
      return res.status(401).json({ message: 'Account unavailable' });
    }

    const token = signToken(user);

    res.json({ token });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Only trust proxy-forwarded headers when the deployment runs behind a known
// reverse proxy (set TRUST_PROXY=true in production). Otherwise honor the
// actual socket address so clients cannot spoof their IP in audit logs.
const getClientIp = (req) => {
  if (process.env.TRUST_PROXY === 'true') {
    return (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.socket?.remoteAddress ||
      req.ip ||
      ''
    );
  }
  return req.socket?.remoteAddress || req.ip || '';
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
    const { fullName, email, password, token } = req.body;

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

    let role = 'USER';

    if (token) {
      const invitation = await prisma.invitation.findUnique({
        where: { token },
      });

      if (!invitation || invitation.isUsed) {
        return res.status(400).json({ message: 'Invalid or already used invitation' });
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ message: 'Invitation has expired' });
      }

      if (invitation.email.toLowerCase() !== email.trim().toLowerCase()) {
        return res.status(400).json({ message: 'This invitation was issued for a different email address' });
      }

      role = invitation.role;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim() },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const encryptionSalt = crypto.randomBytes(16).toString('hex');
    const userId = await generateId('user');

    let user;

    if (token) {
      try {
        user = await prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              id: userId,
              fullName,
              email: email.trim(),
              passwordHash,
              encryptionSalt,
              role,
            },
          });

          const updated = await tx.invitation.updateMany({
            where: { token, isUsed: false },
            data: { isUsed: true },
          });

          if (updated.count === 0) {
            throw new Error('INVITATION_ALREADY_USED');
          }

          return created;
        });
      } catch (error) {
        if (error.message === 'INVITATION_ALREADY_USED') {
          return res.status(400).json({ message: 'Invitation already used' });
        }
        throw error;
      }
    } else {
      user = await prisma.user.create({
        data: {
          id: userId,
          fullName,
          email: email.trim(),
          passwordHash,
          encryptionSalt,
          role,
        },
      });
    }

    const jwtToken = signToken(user);
    const refreshToken = signRefreshToken(user);

    await saveLoginActivity({
      req,
      userId: user.id,
      status: 'SUCCESS',
    });

    res.status(201).json({
      message: 'User registered successfully',
      token: jwtToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        encryptionSalt: user.encryptionSalt,
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

    // Per-account brute-force lockout: reject early when the account is
    // currently locked, before doing any expensive work.
    if (isAccountLocked(email)) {
      return res.status(429).json({
        message: 'Too many failed attempts. Please try again in a few minutes.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      trackFailedAttempt(email);
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
      trackFailedAttempt(email);
      await saveLoginActivity({
        req,
        userId: user.id,
        status: 'FAILED',
      });

      return res.status(400).json({ message: 'Invalid credentials' });
    }

    resetFailedAttempts(email);
    const token = signToken(user);
    const refreshToken = signRefreshToken(user);

    await saveLoginActivity({
      req,
      userId: user.id,
      status: 'SUCCESS',
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      refreshToken,
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

const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const emailValidationError = validateEmail(email);
    if (emailValidationError) {
      return res.status(400).json({ message: emailValidationError });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim() },
    });

    // Always respond with the same message so we don't reveal whether an
    // email is registered (prevents account enumeration).
    const genericMessage =
      'If an account exists for that email, a password reset link has been sent.';

    if (!user || user.isActive === false) {
      return res.json({ message: genericMessage });
    }

    // Bind the token to the current password hash so it becomes unusable as
    // soon as the password actually changes (single-use per password state).
    const passwordFingerprint = crypto
      .createHash('sha256')
      .update(user.passwordHash)
      .digest('hex');

    const resetToken = jwt.sign(
      {
        sub: user.id,
        type: 'password-reset',
        ph: passwordFingerprint,
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '10m' }
    );

    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    await sendMail({
      to: user.email,
      subject: 'Vaultix Password Reset',
      html: `
        <div style="font-family:Arial,sans-serif">
          <h2>Reset your Vaultix password</h2>
          <p>Click the button below to set a new password. This link expires in 10 minutes.</p>
          <a href="${resetLink}" style="display:inline-block;background:#2563eb;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">
            Reset Password
          </a>
          <p style="margin-top:16px">Or copy this link:</p>
          <p>${resetLink}</p>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: genericMessage });
  } catch (error) {
    console.error('Request password reset error:', error);
    const isAuthError = error?.code === 'EAUTH';
    res.status(500).json({
      message: isAuthError
        ? 'Email sending failed: invalid Gmail credentials. Use a 16-character App Password (myaccount.google.com/apppasswords).'
        : 'Failed to send password reset email',
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must include uppercase, lowercase, number, and special character',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch {
      return res.status(400).json({ message: 'Invalid or expired reset link' });
    }

    if (decoded.type !== 'password-reset' || !decoded.sub || !decoded.ph) {
      return res.status(400).json({ message: 'Invalid reset link' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || user.isActive === false) {
      return res.status(400).json({ message: 'Invalid reset link' });
    }

    // Token is only valid while the password hasn't already changed.
    const currentFingerprint = crypto
      .createHash('sha256')
      .update(user.passwordHash)
      .digest('hex');

    if (currentFingerprint !== decoded.ph) {
      return res.status(400).json({ message: 'Reset link has already been used' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Restore login ability after a reset, regardless of any lockout state.
    resetFailedAttempts(user.email);

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
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
      return res.status(401).json({ message: 'Invalid master password' });
    }

    res.json({ verified: true });
  } catch (error) {
    console.error('Verify master password error:', error);
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
          ...(pw.encryptedFields !== undefined && { encryptedFields: pw.encryptedFields }),
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

const resetMasterPassword = async (req, res) => {
  try {
    const { newMasterPassword, hint, encryptedPrivateKey, publicKey, salt } = req.body;
    const userId = req.user.id;

    if (!newMasterPassword || !encryptedPrivateKey || !publicKey || !salt) {
      return res.status(400).json({
        message: 'New master password, encrypted private key, public key, and salt are required',
      });
    }

    if (newMasterPassword.length < 8) {
      return res.status(400).json({ message: 'Master password must be at least 8 characters' });
    }

    if (!PASSWORD_REGEX.test(newMasterPassword)) {
      return res.status(400).json({
        message: 'Master password must include uppercase, lowercase, number, and special character',
      });
    }

    if (hint && hint.length > 100) {
      return res.status(400).json({ message: 'Hint must be under 100 characters' });
    }

    const masterPasswordHash = await bcrypt.hash(newMasterPassword, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          masterPasswordHash,
          masterPasswordHint: hint || null,
        },
      });

      const encryptedPrivateKeyParsed =
        typeof encryptedPrivateKey === 'string'
          ? JSON.parse(encryptedPrivateKey)
          : encryptedPrivateKey;

      const existing = await tx.userKeyPair.findUnique({
        where: { userId },
      });

      if (existing) {
        await tx.userKeyPair.update({
          where: { userId },
          data: { encryptedPrivateKey: encryptedPrivateKeyParsed, publicKey, salt },
        });
      } else {
        await tx.userKeyPair.create({
          data: {
            id: await generateId('keyPair'),
            userId,
            encryptedPrivateKey: encryptedPrivateKeyParsed,
            publicKey,
            salt,
          },
        });
      }
    });

    res.json({ message: 'Master password reset successfully' });
  } catch (error) {
    console.error('Reset master password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  saveLoginActivity,
  login,
  refresh,
  me,
  setMasterPassword,
  verifyMasterPassword,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  changeMasterPassword,
  resetMasterPassword,
  reencryptPasswords,
};