/**
 * Field schemas for each ItemType.
 * Used server-side to validate that encryptedFields contains the correct keys
 * for the given item type, preventing corrupted or mismatched data.
 */

const ITEM_FIELD_SCHEMAS = {
  LOGIN: {
    optional: ['totpSecret'],
    required: [],
  },
  CARD: {
    required: ['cardholderName', 'cardNumber', 'expiry', 'cvv'],
    optional: ['brand'],
  },
  BANK_ACCOUNT: {
    required: ['accountHolder', 'accountNumber', 'routingNumber'],
    optional: ['iban', 'swiftCode'],
  },
  IDENTITY: {
    required: ['firstName', 'lastName', 'dob', 'idNumber', 'email', 'phone'],
    optional: ['address1', 'address2', 'city', 'state', 'postalCode', 'country'],
  },
  SECURE_NOTE: {
    required: [],
    optional: [],
  },
};

const VALID_ITEM_TYPES = Object.keys(ITEM_FIELD_SCHEMAS);

/**
 * Validates that the provided encryptedFields object (parsed JSON) contains
 * exactly the expected keys for the given ItemType.
 *
 * Handles both formats:
 * - Old format: single AES-GCM envelope with { iv, content, ... } keys
 * - New format: per-field envelopes with field-specific keys
 *
 * Returns { valid: true } or { valid: false, message: string }.
 */
function validateItemFields(type, fields) {
  if (!VALID_ITEM_TYPES.includes(type)) {
    return { valid: false, message: `Invalid item type: ${type}` };
  }

  const schema = ITEM_FIELD_SCHEMAS[type];
  const allAllowed = new Set([...schema.required, ...schema.optional]);

  if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
    const hasEncryptionEnvelope = 'iv' in fields && 'content' in fields;

    if (hasEncryptionEnvelope) {
      return { valid: true };
    }

    const providedKeys = Object.keys(fields);
    const disallowed = providedKeys.filter((k) => !allAllowed.has(k));

    if (disallowed.length > 0) {
      return {
        valid: false,
        message: `Unexpected fields for ${type}: ${disallowed.join(', ')}`,
      };
    }
  }

  if (schema.required.length > 0) {
    if (!fields || typeof fields !== 'object') {
      return {
        valid: false,
        message: `${type} requires fields: ${schema.required.join(', ')}`,
      };
    }

    const hasEncryptionEnvelope = 'iv' in fields && 'content' in fields;
    if (hasEncryptionEnvelope) {
      return { valid: true };
    }

    const missing = schema.required.filter(
      (key) => !(key in fields) || fields[key] === undefined
    );

    if (missing.length > 0) {
      return {
        valid: false,
        message: `Missing required fields for ${type}: ${missing.join(', ')}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validates the 'login' field is appropriate for the given ItemType.
 * LOGIN type requires a non-empty login. Other types allow empty.
 */
function validateLoginForType(type, login) {
  if (type === 'LOGIN' && (!login || !login.trim())) {
    return { valid: false, message: 'Login / Email is required for LOGIN items' };
  }
  return { valid: true };
}

module.exports = {
  ITEM_FIELD_SCHEMAS,
  VALID_ITEM_TYPES,
  validateItemFields,
  validateLoginForType,
};
