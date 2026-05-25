const OLD_DAYS_THRESHOLD = 180;

const BREACHED_PASSWORDS = new Set([
  '123456', 'password', '12345678', 'qwerty', '123456789',
  '12345', '1234', '111111', '1234567', 'sunshine',
  'qwerty123', 'iloveyou', 'princess', 'admin', 'welcome',
  '666666', 'abc123', 'football', '123123', 'monkey',
  '654321', '!@#$%^&*', 'charlie', 'aaaaaa', 'donald',
  'dragon', '1234567890', 'michael', 'baseball', 'ashley',
  'letmein', 'shadow', 'master', '121212', 'flower',
  'hottie', 'login', 'passw0rd', 'starwars', 'ninja',
  'mustang', 'qwerty12345', 'batman', 'trustno1', 'access',
  'passwd', 'lovely', 'superman', 'killer', 'hunter',
  '123qwe', 'zaq12wsx', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
  '1q2w3e4r', 'qazwsx', 'password1', 'password123', 'changeme',
  'default', 'administrator', 'root', 'toor', 'guest',
  'test', 'testing', 'temp', 'temporary',
  '000000', '00000000', '012345', '0123456', '01234567',
  '102030', '112233', '123321', '131313', '232323',
  '555555', '777777', '888888', '999999', '696969',
  'loveme', 'fuckme', 'fuckyou', 'sexy', 'sexy123',
  'pass', 'pass123', 'pass1234', 'p@ssword', 'p@ssw0rd',
  'qwerty1', 'qwerty12', 'qwerty1234', 'asdf', 'asdfgh',
  'zxcvbn', 'qwertz', '123456a', '123456b', 'a123456',
  '1qaz2wsx', '3edc4rfv', '123qweasd', 'qweasd', 'qwe123',
  'passwrd', 'passwerd', 'pasword', 'pasvord',
  'senha', 'contraseña', 'parol', 'heslo', 'slaptazodis',
]);

export function isPasswordAtRisk(password) {
  if (!password || password.length < 1) return false;

  const lower = password.toLowerCase();

  if (BREACHED_PASSWORDS.has(lower)) return true;

  if (/^[a-z]+$/.test(lower) && lower.length >= 4) {
    if (/(.)\1{3,}/.test(lower)) return true;
  }

  if (/^\d+$/.test(password) && password.length >= 3) return true;

  if (password.length < 8) return true;

  const commonWords = [
    'password', 'passwrd', 'p@ssword', 'p@ssw0rd',
    'admin', 'login', 'welcome', 'master',
    'iloveyou', 'sunshine', 'princess',
    'qwerty', 'letmein', 'monkey', 'dragon', 'charlie',
    'trustno1', 'football', 'baseball', 'hockey',
    'shadow', 'superman', 'batman', 'naruto',
    'hello', 'changeme', 'default',
  ];

  const remaining = commonWords.some((word) => lower.includes(word));

  return remaining;
}

export function isPasswordOld(lastUpdatedAt, createdAt) {
  const dateStr = lastUpdatedAt || createdAt;
  if (!dateStr) return false;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= OLD_DAYS_THRESHOLD;
}
