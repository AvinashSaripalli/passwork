const listeners = new Set();

export function showToast(message, type = 'success', duration = 3000) {
  listeners.forEach((listener) => listener({ message, type, duration }));
}

export function subscribeToast(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
