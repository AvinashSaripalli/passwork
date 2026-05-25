const crypto = require('crypto');
const prisma = require('../config/prisma');
const generateId = require('../utils/generateId');
const sendMail = require('../utils/sendMail');

const sendInvitation = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { email, role = 'USER' } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const invitationId = await generateId('invitation');
    const token = crypto.randomBytes(32).toString('hex');

    const invitation = await prisma.invitation.create({
      data: {
        id: invitationId,
        email,
        token,
        role,
        invitedBy: req.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const registerLink = `${process.env.CLIENT_URL}/register?token=${token}`;

    await sendMail({
      to: email,
      subject: 'Vaultix Registration Invitation',
      html: `
        <div style="font-family:Arial,sans-serif">
          <h2>You are invited to Vaultix</h2>
          <p>Please click the button below to register your account.</p>
          <a href="${registerLink}" style="display:inline-block;background:#4f46e5;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">
            Register Now
          </a>
          <p style="margin-top:16px">Or copy this link:</p>
          <p>${registerLink}</p>
          <p>This invitation expires in 7 days.</p>
        </div>
      `,
    });

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation,
    });
  } catch (error) {
    console.error('Send invitation error:', error);
    res.status(500).json({ message: 'Failed to send invitation' });
  }
};

const getInvitationByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation || invitation.isUsed) {
      return res.status(404).json({ message: 'Invalid invitation' });
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'Invitation expired' });
    }

    res.json({
      email: invitation.email,
      role: invitation.role,
    });
  } catch (error) {
    console.error('Get invitation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPendingInvitations = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        inviter: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    res.json(invitations);
  } catch (error) {
    console.error('Get pending invitations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  sendInvitation,
  getInvitationByToken,
  getPendingInvitations,
};

