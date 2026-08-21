const input = document.getElementById('baseUrl');
const status = document.getElementById('status');

chrome.storage.sync.get('baseUrl', ({ baseUrl }) => {
  input.value = baseUrl || 'https://knbitrix.duckdns.org';
});

document.getElementById('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const url = input.value.trim().replace(/\/+$/, '');
  chrome.storage.sync.set({ baseUrl: url }, () => {
    status.textContent = 'Saved';
    setTimeout(() => (status.textContent = ''), 1500);
  });
});
