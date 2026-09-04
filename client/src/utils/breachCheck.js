// HaveIBeenPwned k-anonymity check — never sends the full password off-device.
//
// Algorithm: SHA-1 the plaintext, take the first 5 hex chars (prefix), request
// every known suffix for that prefix, and compare the remaining 35 chars
// locally. Only a 5-hex prefix (1/1,048,576 of the hash space, ~20 bits of
// entropy) is transmitted — the full password never leaves this device.

const PWNED_API = 'https://api.pwnedpasswords.com/range/';

const sha1Hex = async (text) => {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const countLeakedOccurrences = (hash, { value, suffixPairs }) =>
  suffixPairs.find((pair) => pair.suffix === value.toUpperCase())?.count || 0;

// Returns { breached: boolean, occurrences: number } for a plaintext password.
export async function checkBreachedPassword(password) {
  try {
    const hash = await sha1Hex(String(password));
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const res = await fetch(`${PWNED_API}${prefix}`, {
      method: 'GET',
      headers: { 'Add-Padding': 'true' },
    });

    if (!res.ok) return { breached: false, occurrences: 0 };

    const body = await res.text();
    const suffixPairs = body
      .split('\r\n')
      .filter(Boolean)
      .map((line) => {
        const [rawSuffix, num] = line.split(':');
        return { suffix: rawSuffix.trim(), count: parseInt(num, 10) || 0 };
      });

    const occurrences = countLeakedOccurrences(hash, { value: suffix, suffixPairs });
    return { breached: occurrences > 0, occurrences };
  } catch {
    // Network/offline — fail open (do not block saving).
    return { breached: false, occurrences: 0 };
  }
}

// Simple strength heuristic (0-5) mirroring the server's Client-side scoring.
export function estimateStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(5, score);
}
