(function () {
  'use strict';
  const key = 'romix.analytics-consent.v1';
  const banner = document.getElementById('cookie-consent');
  const settings = document.getElementById('cookie-settings');
  if (!banner || !settings) return;
  const status = document.getElementById('cookie-consent-status');
  const reject = document.getElementById('cookie-reject');
  const accept = document.getElementById('cookie-accept');
  let returnFocus = null;
  function readChoice() {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }
  function clearAnalyticsCookies() {
    const host = location.hostname.split('.');
    const domains = [''];
    for (let i = 0; i < host.length - 1; i++) domains.push(host.slice(i).join('.'));
    const segments = location.pathname.split('/').filter(Boolean);
    const paths = ['/'];
    for (let i = 1; i <= segments.length; i++) paths.push('/' + segments.slice(0, i).join('/'));
    document.cookie.split(';').forEach(part => {
      const name = part.split('=')[0].trim();
      if (!/^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name)) return;
      domains.forEach(domain => paths.forEach(path => {
        document.cookie = name + '=; Max-Age=0; path=' + path + (domain ? '; domain=' + domain : '') + '; SameSite=Lax';
      }));
    });
  }
  function sync() {
    const choice = readChoice();
    const known = choice === 'accepted' || choice === 'rejected';
    banner.hidden = known;
    if (choice !== 'accepted') clearAnalyticsCookies();
    settings.hidden = false;
  }
  function choose(choice) {
    try { window.localStorage.setItem(key, choice); }
    catch {
      window.dispatchEvent(new CustomEvent('romix:analytics-consent-changed', { detail: { choice: 'rejected' } }));
      clearAnalyticsCookies();
      status.textContent = 'No pudimos guardar tu elección. Desactivamos Analytics en esta página. Revisá los permisos de almacenamiento; tu elección anterior podría volver al recargar.';
      return;
    }
    const reload = choice === 'rejected' && typeof window.gtag === 'function';
    window.dispatchEvent(new CustomEvent('romix:analytics-consent-changed'));
    if (choice === 'rejected') clearAnalyticsCookies();
    banner.hidden = true;
    if (banner.contains(document.activeElement)) (returnFocus || settings).focus({ preventScroll: true });
    if (reload) location.reload();
  }
  settings.addEventListener('click', () => {
    returnFocus = settings;
    banner.hidden = false;
    const choice = readChoice();
    status.textContent = choice === 'accepted' ? 'Tu elección actual: analítica aceptada.' : choice === 'rejected' ? 'Tu elección actual: analítica rechazada.' : '';
    reject.focus({ preventScroll: true });
  });
  reject.addEventListener('click', () => choose('rejected'));
  accept.addEventListener('click', () => choose('accepted'));
  window.addEventListener('storage', e => {
    if (e.key !== key && e.key !== null) return;
    sync();
    window.dispatchEvent(new CustomEvent('romix:analytics-consent-changed'));
    if (readChoice() !== 'accepted' && typeof window.gtag === 'function') location.reload();
  });
  sync();
})();
