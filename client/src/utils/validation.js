export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=<>?/{}[\]|~`])/;

export const validateEmail = (email) => {
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

  return '';
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!PASSWORD_REGEX.test(password))
    return 'Password must include uppercase, lowercase, number, and special character';
  return '';
};

export const validateFullName = (name) => {
  if (!name) return 'Full name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  return '';
};

export const validateMasterPassword = (password) => {
  return validatePassword(password);
};

export const validateConfirmPassword = (password, confirm) => {
  if (!confirm) return 'Please confirm your password';
  if (password !== confirm) return 'Passwords do not match';
  return '';
};

export const validateHint = (hint) => {
  if (hint && hint.length > 100) return 'Hint must be under 100 characters';
  return '';
};
