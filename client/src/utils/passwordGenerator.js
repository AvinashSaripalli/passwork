const DEFAULTS = {
  length: 16,
  useUppercase: true,
  useLowercase: true,
  useNumbers: true,
  useSymbols: true,
  excludeAmbiguous: false,
};

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS = 'il1Lo0O';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / (0xffffffff + 1) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generatePassword(options = {}) {
  const {
    length = DEFAULTS.length,
    useUppercase = DEFAULTS.useUppercase,
    useLowercase = DEFAULTS.useLowercase,
    useNumbers = DEFAULTS.useNumbers,
    useSymbols = DEFAULTS.useSymbols,
    excludeAmbiguous = DEFAULTS.excludeAmbiguous,
  } = options;

  let chars = '';
  if (useLowercase) chars += LOWERCASE;
  if (useUppercase) chars += UPPERCASE;
  if (useNumbers) chars += NUMBERS;
  if (useSymbols) chars += SYMBOLS;

  if (!chars) return '';

  let available = chars;
  if (excludeAmbiguous) {
    available = [...available].filter((c) => !AMBIGUOUS.includes(c)).join('');
  }

  if (!available) return '';

  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  let password = '';
  for (let i = 0; i < length; i++) {
    password += available[array[i] % available.length];
  }

  const required = [];
  if (useLowercase) required.push(LOWERCASE);
  if (useUppercase) required.push(UPPERCASE);
  if (useNumbers) required.push(NUMBERS);
  if (useSymbols) required.push(SYMBOLS);

  const pwArray = password.split('');
  for (let i = 0; i < required.length; i++) {
    const set = required[i];
    let filtered = set;
    if (excludeAmbiguous) {
      filtered = [...set].filter((c) => !AMBIGUOUS.includes(c)).join('');
    }
    const randomChar = filtered[array[i] % filtered.length];
    pwArray[i] = randomChar;
  }

  return shuffleArray(pwArray).join('');
}