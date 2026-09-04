const prisma = require('../config/prisma');

// Returns the effective policy for a vault (company/client vaults) or null.
const getVaultPolicy = async (vaultId) => {
  const vault = await prisma.vault.findUnique({
    where: { id: vaultId },
    select: {
      type: true,
      minStrengthScore: true,
      maxAgeDays: true,
      blockCommon: true,
      allowedTypes: true,
    },
  });

  if (!vault || vault.type === 'PERSONAL') return null;

  return {
    type: vault.type,
    minStrengthScore: vault.minStrengthScore ?? null,
    maxAgeDays: vault.maxAgeDays ?? null,
    blockCommon: vault.blockCommon ?? false,
    allowedTypes: Array.isArray(vault.allowedTypes) ? vault.allowedTypes : null,
  };
};

// Validate a candidate item against the vault's policy. The strength/flags are
// computed client-side (passwords never leave the device in plaintext), so this
// enforces policy on the client-reported metadata.
const validateAgainstPolicy = (policy, { strengthScore, isWeak, isAtRisk, type } = {}) => {
  if (!policy) return { valid: true };

  const errors = [];

  if (policy.allowedTypes && Array.isArray(policy.allowedTypes) && !policy.allowedTypes.includes(type)) {
    errors.push(`Item type '${type}' is not allowed in this vault by policy`);
  }

  const score = typeof strengthScore === 'number' ? strengthScore : null;
  if (policy.minStrengthScore != null && score != null && score < policy.minStrengthScore) {
    errors.push(
      `Password is too weak for this vault's policy (minimum strength ${policy.minStrengthScore}).`
    );
  }

  if (policy.blockCommon && isAtRisk) {
    errors.push('This password appears in known breach data and is blocked by vault policy.');
  }

  if (errors.length > 0) {
    return { valid: false, message: errors.join(' ') };
  }

  return { valid: true };
};

module.exports = {
  getVaultPolicy,
  validateAgainstPolicy,
};
