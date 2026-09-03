import { startAuthentication } from '@simplewebauthn/browser';

export async function generateWebAuthnAuthOptions() {
  const res = await fetch('/api/v1/2fa/webauthn/authenticate-begin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({}),
  });
  return res.json();
}

export async function completeWebAuthnAuthentication(options) {
  return startAuthentication(options);
}
