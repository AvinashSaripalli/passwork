export async function apiLogin(baseUrl, email, password) {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data;
}

export async function apiGet(baseUrl, path, token) {
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error('SESSION_EXPIRED');
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.message) || 'Request failed');
  return data;
}
