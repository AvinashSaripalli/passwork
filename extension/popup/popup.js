const DEFAULT_URL = 'https://knbitrix.duckdns.org';

async function getBaseUrl() {
  const { baseUrl } = await chrome.storage.sync.get('baseUrl');
  return baseUrl || DEFAULT_URL;
}

async function render() {
  const url = await getBaseUrl();
  document.getElementById('openVault').href = url;
  document.getElementById('baseUrlLabel').textContent = url;
}

document.getElementById('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

render();
