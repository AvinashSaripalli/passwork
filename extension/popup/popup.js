import { decryptText, decryptFields, isEncryptedFormat, generateTOTP } from '../lib/crypto.js';
import { apiLogin, apiGet } from '../lib/api.js';

const DEFAULT_URL = 'https://knbitrix.duckdns.org';
const LOCK_MS = 15 * 60 * 1000;

const $ = (id) => document.getElementById(id);

let baseUrl = '';
let token = '';
let user = null;
let creds = [];
let tab = null;
let tabHost = '';

init();

async function init() {
  const sync = await chrome.storage.sync.get('baseUrl');
  baseUrl = (sync.baseUrl || DEFAULT_URL).replace(/\/+$/, '');

  const local = await chrome.storage.local.get(['token', 'user']);
  token = local.token || '';
  user = local.user || null;

  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabHost = hostOf(tab?.url || '');

  $('loginServer').textContent = baseUrl;
  $('lnkSettings').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('lnkOpenVault').addEventListener('click', () => chrome.tabs.create({ url: baseUrl }));
  $('lnkRefresh').addEventListener('click', () => loadCreds(true));
  $('btnLock').addEventListener('click', lockVault);
  $('btnLogin').addEventListener('click', onLogin);
  $('btnUnlock').addEventListener('click', onUnlock);
  $('search').addEventListener('input', () => renderList());
  $('unlockUser').textContent = user ? user.email : '';

  const sess = await chrome.storage.session.get(['master', 'cache']);
  const cacheValid =
    sess.master && sess.cache && Date.now() - sess.cache.ts < LOCK_MS;

  if (token && user && cacheValid) {
    creds = sess.cache.creds;
    showList();
  } else if (token && user) {
    await chrome.storage.session.remove(['master', 'cache']);
    show('viewUnlock');
  } else {
    show('viewLogin');
  }
}

function show(view) {
  for (const v of ['viewLogin', 'viewUnlock', 'viewList']) {
    $(v).style.display = v === view ? 'block' : 'none';
  }
  const authed = view === 'viewList';
  $('btnLock').style.display = authed ? 'inline' : 'none';
  $('footerBar').style.display = authed ? 'flex' : 'none';
}

async function onLogin() {
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  const master = $('loginMaster').value;
  $('loginError').textContent = '';
  if (!email || !password || !master) {
    $('loginError').textContent = 'All three fields are required.';
    return;
  }
  $('btnLogin').disabled = true;
  try {
    const data = await apiLogin(baseUrl, email, password);
    token = data.token;
    user = data.user;
    await chrome.storage.local.set({ token, user });
    await chrome.storage.session.set({ master });
    await loadCreds(false);
  } catch (err) {
    $('loginError').textContent = err.message;
  } finally {
    $('btnLogin').disabled = false;
  }
}

async function onUnlock() {
  const master = $('unlockMaster').value;
  if (!master) return;
  $('unlockError').textContent = '';
  $('btnUnlock').disabled = true;
  try {
    await chrome.storage.session.set({ master });
    await loadCreds(false);
  } catch (err) {
    await chrome.storage.session.remove('master');
    $('unlockError').textContent = err.message;
  } finally {
    $('btnUnlock').disabled = false;
  }
}

async function lockVault() {
  await chrome.storage.session.remove(['master', 'cache']);
  creds = [];
  $('unlockMaster').value = '';
  show('viewUnlock');
}

async function loadCreds(force) {
  if (!force) {
    const cached = await chrome.storage.session.get('cache');
    if (cached.cache && Date.now() - cached.cache.ts < LOCK_MS) {
      creds = cached.cache.creds;
      showList();
      return;
    }
  }

  const sess = await chrome.storage.session.get('master');
  const master = sess.master;
  if (!master) {
    show('viewUnlock');
    return;
  }

  showList();
  $('listStatus').style.display = 'block';
  $('listStatus').textContent = 'Decrypting vault…';

  try {
    let entries = [];

    try {
      const mine = await apiGet(baseUrl, '/my-vault', token);
      entries = entries.concat(mine.passwords || []);
    } catch {
      /* personal vault unavailable */
    }

    try {
      const shared = await apiGet(baseUrl, '/password-shares/shared-with-me', token);
      entries = entries.concat((shared || []).map((s) => ({ ...s.password, shared: true })));
    } catch {
      /* no shared access */
    }

    const byId = new Map();
    for (const e of entries) {
      if (!byId.has(e.id)) byId.set(e.id, e);
    }

    const salt = user?.encryptionSalt;
    const decrypted = [];

    for (const entry of byId.values()) {
      if (entry.type && entry.type !== 'LOGIN') continue;

      let password = '';
      if (isEncryptedFormat(entry.encryptedPassword)) {
        password = await decryptText(entry.encryptedPassword, master, salt);
        if (!password) continue;
      } else if (entry.encryptedPassword) {
        continue;
      }

      let totpSecret = null;
      if (entry.encryptedFields) {
        const fields = await decryptFields(entry.encryptedFields, master, salt);
        totpSecret = fields?.totpSecret || fields?.totp || null;
      }

      decrypted.push({
        id: entry.id,
        name: entry.name,
        login: entry.login || '',
        url: entry.url || '',
        password,
        totpSecret,
        shared: !!entry.shared,
      });
    }

    creds = decrypted;
    await chrome.storage.session.set({ cache: { ts: Date.now(), creds } });
  } catch (err) {
    if (err.message === 'SESSION_EXPIRED') {
      await chrome.storage.local.remove(['token', 'user']);
      token = '';
      user = null;
      show('viewLogin');
      return;
    }
    $('listStatus').textContent = `Error: ${err.message}`;
    return;
  } finally {
    $('listStatus').style.display = 'none';
  }

  showList();
}

function showList() {
  show('viewList');
  $('siteLabel').innerHTML = tabHost
    ? `Site: <b></b>`
    : 'No site detected — showing all items';
  if (tabHost) $('siteLabel').querySelector('b').textContent = tabHost;
  renderList();
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function urlHost(entryUrl) {
  if (!entryUrl) return '';
  try {
    return new URL(entryUrl.includes('://') ? entryUrl : `https://${entryUrl}`).hostname.replace(
      /^www\./,
      ''
    );
  } catch {
    return '';
  }
}

function matchesSite(cred) {
  if (!tabHost) return false;
  const credHost = urlHost(cred.url);
  if (credHost && (credHost === tabHost || credHost.endsWith(`.${tabHost}`) || tabHost.endsWith(`.${credHost}`))) {
    return true;
  }
  const name = cred.name.toLowerCase();
  const base = tabHost.split('.')[0];
  return name.includes(base) && base.length > 2;
}

function renderList() {
  const q = $('search').value.trim().toLowerCase();
  const listEl = $('list');
  listEl.innerHTML = '';

  const matched = creds.filter(matchesSite);
  const others = creds.filter((c) => !matched.includes(c));
  const filtered = (c) =>
    !q ||
    c.name.toLowerCase().includes(q) ||
    c.login.toLowerCase().includes(q) ||
    urlHost(c.url).includes(q);

  const sections = [
    { title: tabHost ? 'For this site' : 'All items', items: matched.filter(filtered), match: true },
    { title: 'Everything else', items: others.filter(filtered), match: false },
  ];

  let shown = 0;
  for (const section of sections) {
    if (!section.items.length) continue;
    if (section.title === 'Everything else' && matched.length) {
      const head = document.createElement('div');
      head.className = 'empty';
      head.style.padding = '10px 0 4px';
      head.textContent = '— Everything else —';
      listEl.appendChild(head);
    }
    for (const cred of section.items) {
      listEl.appendChild(itemRow(cred, section.match));
      shown++;
    }
  }

  if (!shown) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = creds.length
      ? 'No items match your search.'
      : 'No logins found. Add passwords in the web vault first.';
    listEl.appendChild(empty);
  }
}

function itemRow(cred, isMatch) {
  const row = document.createElement('div');
  row.className = `item${isMatch ? ' matched' : ''}`;

  const row1 = document.createElement('div');
  row1.className = 'row1';

  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = cred.name + (cred.shared ? ' (shared)' : '');
  row1.appendChild(name);

  if (isMatch) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'SITE MATCH';
    row1.appendChild(badge);
  }

  const loginLine = document.createElement('div');
  loginLine.className = 'login';
  loginLine.textContent = cred.login || '(no username)';

  const actions = document.createElement('div');
  actions.className = 'actions';

  const fillBtn = actionBtn('Fill', 'fill', () => doFill(cred));
  const copyUserBtn = actionBtn('Copy user', '', () => copy(cred.login, 'Username copied'));
  const copyPassBtn = actionBtn('Copy pass', '', () => copy(cred.password, 'Password copied'));
  actions.append(fillBtn, copyUserBtn, copyPassBtn);

  if (cred.totpSecret) {
    generateTOTP(cred.totpSecret).then((totp) => {
      if (!totp) return;
      const otpBtn = actionBtn(`OTP ${totp.code}`, '', () => copy(totp.code, 'TOTP code copied'));
      actions.appendChild(otpBtn);
    });
  }

  row.append(row1, loginLine, actions);
  return row;
}

function actionBtn(label, cls, onClick) {
  const b = document.createElement('button');
  b.textContent = label;
  if (cls) b.className = cls;
  b.addEventListener('click', onClick);
  return b;
}

async function doFill(cred) {
  try {
    const results = await chrome.tabs.sendMessage(tab.id, {
      type: 'VAULTIX_FILL',
      username: cred.login,
      password: cred.password,
    });
    const ok = Array.isArray(results) ? results.some((r) => r && r.ok) : results?.ok;
    flash(ok ? `Filled → ${cred.name}` : 'No login form found on this page');
  } catch {
    flash('Reload the page once, then try Fill again');
  }
}

async function copy(text, message) {
  if (!text) return;
  await navigator.clipboard.writeText(text);
  flash(message);
}

let flashTimer = null;
function flash(message) {
  let el = $('flash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'flash';
    el.style.cssText =
      'position:fixed;bottom:38px;left:14px;right:14px;background:#4f46e5;color:#fff;' +
      'padding:7px 10px;border-radius:8px;font-size:12px;text-align:center;z-index:99;';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.display = 'block';
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => (el.style.display = 'none'), 1800);
}
