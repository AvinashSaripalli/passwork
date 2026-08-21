(() => {
  if (window.__vaultixLoaded) return;
  window.__vaultixLoaded = true;

  const LOCK_MS = 15 * 60 * 1000;
  let badge = null;
  let menu = null;
  let activePw = null;
  let hideTimer = null;

  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('focusout', onFocusOut, true);
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition);
  document.addEventListener('click', onDocClick, true);
  document.addEventListener('keydown', onKeydown, true);

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || msg.type !== 'VAULTIX_FILL') return;
    sendResponse({ ok: fillCredentials(msg.username, msg.password) });
  });

  async function getCachedCreds() {
    try {
      const data = await chrome.storage.session.get('cache');
      if (data.cache && Date.now() - data.cache.ts < LOCK_MS) {
        return data.cache.creds || [];
      }
    } catch {
      /* session storage not shared with content scripts yet */
    }
    return [];
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
      return new URL(
        entryUrl.includes('://') ? entryUrl : `https://${entryUrl}`
      ).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  function matchesSite(cred) {
    const tabHost = location.hostname.replace(/^www\./, '');
    if (!tabHost) return false;
    const credHost = urlHost(cred.url);
    if (
      credHost &&
      (credHost === tabHost ||
        credHost.endsWith(`.${tabHost}`) ||
        tabHost.endsWith(`.${credHost}`))
    ) {
      return true;
    }
    const base = tabHost.split('.')[0];
    return base.length > 2 && cred.name.toLowerCase().includes(base);
  }

  function isVisible(el) {
    if (!el || !el.getClientRects().length) return false;
    const style = window.getComputedStyle(el);
    return (
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      !el.disabled &&
      !el.readOnly
    );
  }

  function findPasswordInput() {
    const candidates = [...document.querySelectorAll('input[type="password"]')].filter(
      isVisible
    );
    return candidates[0] || null;
  }

  function findUsernameInput(pwField) {
    const inputs = [
      ...document.querySelectorAll(
        'input[type="text"], input[type="email"], input[type="tel"], input:not([type])'
      ),
    ].filter(isVisible);

    let best = null;
    for (const el of inputs) {
      if (el.compareDocumentPosition(pwField) & Node.DOCUMENT_POSITION_FOLLOWING) {
        best = el;
      }
    }
    return best;
  }

  function setNativeValue(el, value) {
    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function fillCredentials(username, password) {
    const pwField = findPasswordInput();
    if (!pwField) return false;
    const userField = findUsernameInput(pwField);
    if (userField && username) setNativeValue(userField, username);
    setNativeValue(pwField, password);
    pwField.focus();
    closeMenu();
    return true;
  }

  function onFocusIn(e) {
    if (!e.target || e.target.tagName !== 'INPUT' || e.target.type !== 'password') return;
    activePw = e.target;
    setTimeout(showBadge, 60);
  }

  function onFocusOut(e) {
    if (e.target !== activePw) return;
    hideTimer = setTimeout(() => {
      if (menu && menu.matches(':hover')) return;
      removeBadge();
    }, 180);
  }

  function onDocClick(e) {
    if (badge && (badge === e.target || badge.contains(e.target))) return;
    if (menu && (menu === e.target || menu.contains(e.target))) return;
    closeMenu();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') closeMenu();
  }

  function removeBadge() {
    badge?.remove();
    badge = null;
    closeMenu();
  }

  function closeMenu() {
    menu?.remove();
    menu = null;
  }

  function reposition() {
    if (!badge || !activePw || !document.contains(activePw)) {
      if (!document.contains(activePw)) removeBadge();
      else reposition();
      return;
    }
    positionBadge();
    if (menu) positionMenu();
  }

  function positionBadge() {
    const r = activePw.getBoundingClientRect();
    badge.style.top = `${r.top + window.scrollY + (r.height - 22) / 2}px`;
    badge.style.left = `${r.right + window.scrollX - 26}px`;
  }

  function positionMenu() {
    const r = activePw.getBoundingClientRect();
    menu.style.top = `${r.bottom + window.scrollY + 6}px`;
    menu.style.left = `${r.right + window.scrollX - 280}px`;
  }

  async function showBadge() {
    removeBadge();
    const creds = await getCachedCreds();
    if (!creds.length) return;

    badge = document.createElement('div');
    badge.textContent = '🔑';
    badge.title = 'Vaultix — click to autofill';
    Object.assign(badge.style, {
      position: 'absolute',
      zIndex: '2147483646',
      width: '22px',
      height: '22px',
      borderRadius: '50%',
      background: '#4f46e5',
      color: '#fff',
      fontSize: '12px',
      lineHeight: '22px',
      textAlign: 'center',
      cursor: 'pointer',
      boxShadow: '0 1px 4px rgba(0,0,0,.4)',
      userSelect: 'none',
    });
    document.documentElement.appendChild(badge);
    positionBadge();

    badge.addEventListener('mousedown', (e) => e.preventDefault());
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menu) {
        closeMenu();
      } else {
        openMenu(creds);
      }
    });
  }

  function openMenu(creds) {
    closeMenu();

    const host = hostOf(location.href);
    const matched = creds.filter(matchesSite);
    const others = creds.filter((c) => !matched.includes(c));
    const ordered = [...matched, ...others].slice(0, 30);

    menu = document.createElement('div');
    Object.assign(menu.style, {
      position: 'absolute',
      zIndex: '2147483647',
      width: '280px',
      maxHeight: '240px',
      overflowY: 'auto',
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '10px',
      boxShadow: '0 8px 24px rgba(0,0,0,.45)',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#e2e8f0',
      padding: '4px',
    });

    const head = document.createElement('div');
    head.textContent = 'Vaultix';
    Object.assign(head.style, {
      padding: '6px 10px',
      fontWeight: '700',
      color: '#818cf8',
      borderBottom: '1px solid #334155',
      marginBottom: '4px',
    });
    menu.appendChild(head);

    if (!ordered.length) {
      const empty = document.createElement('div');
      empty.textContent = 'No vault items. Unlock in the extension popup.';
      Object.assign(empty.style, { padding: '10px', color: '#94a3b8' });
      menu.appendChild(empty);
    }

    for (const cred of ordered) {
      const isMatch = matched.includes(cred);
      const row = document.createElement('div');
      Object.assign(row.style, {
        padding: '7px 10px',
        borderRadius: '7px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      });
      row.addEventListener('mouseenter', () => (row.style.background = '#334155'));
      row.addEventListener('mouseleave', () => (row.style.background = 'transparent'));

      const dot = document.createElement('span');
      dot.textContent = isMatch ? '●' : '○';
      dot.title = isMatch ? 'Matches this site' : 'Other item';
      dot.style.color = isMatch ? '#818cf8' : '#475569';

      const textWrap = document.createElement('div');
      textWrap.style.cssText = 'flex:1;min-width:0;';
      const nameEl = document.createElement('div');
      nameEl.textContent = cred.name;
      nameEl.style.cssText = 'font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      const loginEl = document.createElement('div');
      loginEl.textContent = cred.login || '(no username)';
      loginEl.style.cssText = 'font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      textWrap.append(nameEl, loginEl);

      row.append(dot, textWrap);
      row.addEventListener('click', () => {
        fillCredentials(cred.login, cred.password);
      });
      menu.appendChild(row);
    }

    document.documentElement.appendChild(menu);
    positionMenu();
  }
})();
