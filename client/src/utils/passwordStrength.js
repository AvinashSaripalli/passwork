const COMMON_WORDS = [
  'password', 'passwrd', 'p@ssword', 'p@ssw0rd',
  'admin', 'login', 'welcome', 'master',
  'iloveyou', 'sunshine', 'princess',
  'qwerty', 'letmein', 'monkey', 'dragon', 'charlie',
  'trustno1', 'football', 'baseball', 'hockey',
  'shadow', 'superman', 'batman', 'naruto',
  'hello', 'changeme', 'default',
];

const SEQ_PATTERNS = [
  /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i,
  /012|123|234|345|456|567|678|789/,
  /qwerty|asdf|zxcv|qwer|wert|erty|rtyu|tyui|yuio|uiop|sdfg|dfgh|fghj|ghjk|hjkl|xcvb|cvbn|vbnm/i,
];

export function getPasswordStrength(password) {
  let score = 0;

  if (password.length >= 16) score += 3;
  else if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;

  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  let penalty = 0;

  if (/(.)\1{2,}/.test(password)) penalty += 1;

  if (SEQ_PATTERNS.some((p) => p.test(password))) penalty += 1;

  if (/^[a-z]+$/.test(password)) penalty += 2;
  else if (/^[A-Z]+$/.test(password)) penalty += 2;
  else if (!/[A-Z]/.test(password) && password.length >= 8) penalty += 1;

  if (COMMON_WORDS.some((word) => password.toLowerCase().includes(word))) penalty += 1;

  if (/(?:19|20)\d{2}/.test(password)) penalty += 1;

  score = Math.max(0, score - penalty);

  if (score <= 2) return { label: 'Weak', color: 'red' };
  if (score <= 4) return { label: 'Medium', color: 'orange' };
  return { label: 'Strong', color: 'green' };
}