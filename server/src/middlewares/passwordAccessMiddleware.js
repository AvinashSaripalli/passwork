const prisma = require('../config/prisma');
const { getVaultAccess } = require('../utils/permissions');

const requirePasswordAccess = (allowedLevels = []) => {
  return async (req, res, next) => {
    try {
      const password = await prisma.passwordEntry.findUnique({
        where: { id: req.params.id },
      });

      if (!password) {
        return res.status(404).json({ message: 'Password not found' });
      }

      const access = await getVaultAccess(password.vaultId, req.user.id);

      if (!access || !allowedLevels.includes(access)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      req.passwordEntry = password;
      req.vaultAccess = access;
      next();
    } catch (error) {
      console.error('Password access error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
};

module.exports = {
  requirePasswordAccess,
};