(() => {
  if (window.__vaultixAutofillLoaded) return;
  window.__vaultixAutofillLoaded = true;

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || msg.type !== 'VAULTIX_FILL') return;
    const ok = fillCredentials(msg.username, msg.password);
    sendResponse({ ok });
  });

  function fillCredentials(username, password) {
    const pwField = findPasswordInput();
    if (!pwField) return false;

    const userField = findUsernameInput(pwField);
    if (userField && username) setNativeValue(userField, username);
    setNativeValue(pwField, password);
    return true;
  }

  function isVisible(el) {
    if (!el || !el.getClientRects().length) return false;
    const style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none' && !el.disabled && !el.readOnly;
  }

  function findPasswordInput() {
    const candidates = [...document.querySelectorAll('input[type="password"]')].filter(isVisible);
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
      el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.focus();
  }
})();
