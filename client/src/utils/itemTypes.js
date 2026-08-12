export const ITEM_TYPES = [
  { value: 'LOGIN', label: 'Login' },
  { value: 'CARD', label: 'Credit / Debit Card' },
  { value: 'BANK_ACCOUNT', label: 'Bank Account' },
  { value: 'IDENTITY', label: 'Identity' },
  { value: 'SECURE_NOTE', label: 'Secure Note' },
];

export const getItemTypeMeta = (type) =>
  ITEM_TYPES.find((item) => item.value === type) || ITEM_TYPES[0];

export const TYPE_FIELDS = {
  LOGIN: [],
  CARD: [
    { key: 'cardholderName', label: 'Cardholder Name', input: 'text' },
    { key: 'cardNumber', label: 'Card Number', input: 'text', copy: true },
    { key: 'expiry', label: 'Expiry (MM/YY)', input: 'text', copy: true },
    { key: 'cvv', label: 'CVV', input: 'password', copy: true },
    { key: 'pin', label: 'PIN', input: 'password', copy: true },
  ],
  BANK_ACCOUNT: [
    { key: 'accountHolder', label: 'Account Holder', input: 'text' },
    { key: 'accountNumber', label: 'Account Number', input: 'text', copy: true },
    { key: 'routingNumber', label: 'Routing / IFSC', input: 'text', copy: true },
    { key: 'branch', label: 'Branch', input: 'text' },
    { key: 'iban', label: 'IBAN / SWIFT', input: 'text', copy: true },
  ],
  IDENTITY: [
    { key: 'firstName', label: 'First Name', input: 'text' },
    { key: 'lastName', label: 'Last Name', input: 'text' },
    { key: 'dob', label: 'Date of Birth', input: 'text' },
    { key: 'idNumber', label: 'ID / Passport / SSN', input: 'password', copy: true },
    { key: 'email', label: 'Email', input: 'text' },
    { key: 'phone', label: 'Phone', input: 'text' },
    { key: 'address', label: 'Address', input: 'text' },
  ],
  SECURE_NOTE: [],
};

export const isSensitiveDefault = (type) =>
  type === 'CARD' || type === 'BANK_ACCOUNT' || type === 'IDENTITY';

export const emptyTypeFields = (type) => {
  const fields = {};
  (TYPE_FIELDS[type] || []).forEach((field) => {
    fields[field.key] = '';
  });
  return fields;
};

export const maskFieldValue = (value, field) => {
  if (!value) return '';
  if (!field?.copy) return value;
  if (value.length <= 4) return '••••';
  return '•••• •••• ' + value.slice(-4);
};

export const getTypePlaceholder = (type) => {
  switch (type) {
    case 'CARD':
      return 'e.g. HDFC Credit Card';
    case 'BANK_ACCOUNT':
      return 'e.g. SBI Savings Account';
    case 'IDENTITY':
      return 'e.g. My Passport';
    case 'SECURE_NOTE':
      return 'e.g. WiFi Router Settings';
    default:
      return 'e.g. Gmail';
  }
};
