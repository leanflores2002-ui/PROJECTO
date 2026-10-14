/* ROMIX Support Widget – Floating help button and panel
   Brand: ROMIX (#f72585) — Panel background #fff5fa
   Usage: include this file at the end of <body> or with defer
*/
(function(){
  const CONFIG = {
    phoneE164: '5491122223333', // +54 9 11 2222 3333
    email: 'soporte@romix.com',
    title: '¿Necesitás ayuda con tu pedido ROMIX?',
    brand: 'ROMIX',
    brandColor: '#f72585',
    panelBg: '#fff5fa',
    logoSrc: '/images/optimized/branding/romix-logo-360.webp',
    defaultMessage: '¡Hola! Necesito ayuda con mi pedido ROMIX.'
  };

  if (document.getElementById('romix-support-root')) return;

  const css = `
  #romix-support-root{position:relative}
  #romix-support-fab{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:999px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:${CONFIG.brandColor};color:#fff;box-shadow:0 10px 24px rgba(0,0,0,.18),0 2px 6px rgba(0,0,0,.08);z-index:9999;transition:transform .18s ease, box-shadow .18s ease}
  #romix-support-fab:hover{transform:translateY(-1px)}
  #romix-support-fab:active{transform:translateY(0)}
  #romix-support-fab:focus-visible{outline:3px solid #fff;outline-offset:3px}
  #romix-support-fab .romix-ico{width:22px;height:22px;display:inline-block}

  #romix-support-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);opacity:0;visibility:hidden;transition:opacity .2s ease, visibility .2s step-end;z-index:9998}

  #romix-support-panel{position:fixed;right:20px;bottom:86px;width:360px;max-width:92vw;background:${CONFIG.panelBg};border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.22),0 6px 16px rgba(0,0,0,.14);opacity:0;transform:translateY(8px) scale(.98);transition:opacity .22s ease, transform .22s ease, visibility .22s step-end;visibility:hidden;z-index:9999;font-family: Inter, Poppins, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif}
  #romix-support-panel .romix-support-header{display:flex;align-items:center;gap:10px;padding:12px 14px 10px 14px;border-bottom:1px solid rgba(0,0,0,.06)}
  #romix-support-panel .romix-support-header .romix-logo{width:92px;height:30px;border-radius:0;object-fit:contain;background:#fff;box-shadow:none}
  #romix-support-panel .romix-support-header h3{font-size:1rem;line-height:1.2;margin:0;color:#1b1f24;font-weight:800}
  #romix-support-panel .romix-close{margin-left:auto;border:none;background:transparent;cursor:pointer;color:#6c757d;width:36px;height:36px;border-radius:8px}
  #romix-support-panel .romix-close:hover{background:rgba(0,0,0,.05)}
  #romix-support-panel .romix-support-body{padding:12px 14px 16px 14px}
  #romix-support-panel .romix-tabs{display:flex;gap:8px;margin:10px 14px 2px}
  #romix-support-panel .romix-tab{flex:0 0 auto;border:none;cursor:pointer;border-radius:999px;padding:6px 10px;font-weight:800;background:#fff;color:${CONFIG.brandColor};box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)}
  #romix-support-panel .romix-tab.active{background:${CONFIG.brandColor};color:#fff}
  #romix-support-panel .romix-group{padding:0 14px 12px}
  #romix-support-panel .romix-action{display:flex;align-items:center;gap:10px;text-decoration:none;border-radius:12px;padding:12px 14px;font-weight:800;margin-top:10px}
  #romix-support-panel .romix-action svg{width:20px;height:20px}
  #romix-support-panel .romix-action.whatsapp{background:${CONFIG.brandColor};color:#fff}
  #romix-support-panel .romix-action.email{background:#fff;border:1px solid rgba(0,0,0,.08);color:#1b1f24}
  #romix-support-panel .romix-note{margin-top:12px;color:#6c757d;font-size:.85rem}
  #romix-support-panel .romix-faq{display:none}
  #romix-support-panel .romix-faq a{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:10px;padding:10px 12px;text-decoration:none;color:#1b1f24;font-weight:700;margin-top:8px}
  #romix-support-panel .romix-faq a:hover{background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.06)}

  /* Open state */
  #romix-support-root.romix-open #romix-support-overlay{opacity:1;visibility:visible;transition:opacity .22s ease, visibility .22s step-start}
  #romix-support-root.romix-open #romix-support-panel{opacity:1;transform:translateY(0) scale(1);visibility:visible;transition:opacity .22s ease, transform .22s ease, visibility .22s step-start}

  @media (max-width:480px){
    #romix-support-panel{right:12px;left:12px;bottom:84px;width:auto}
  }
  @media (prefers-reduced-motion: reduce){
    #romix-support-fab, #romix-support-panel, #romix-support-overlay{transition:none !important}
  }
  `;

  const style = document.createElement('style');
  style.id = 'romix-support-style';
  style.textContent = css;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'romix-support-root';
  root.setAttribute('data-romix-widget', '1');

  // Floating button
  const fab = document.createElement('button');
  fab.id = 'romix-support-fab';
  fab.className = 'romix-icon-btn';
  fab.type = 'button';
  fab.setAttribute('aria-label', 'Abrir ayuda ROMIX');
  fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = `
    <span class="romix-ico" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 12a8 8 0 0 1-8 8H6l-2 2v-4a8 8 0 1 1 16-6Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>`;

  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'romix-support-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  // Panel
  const panel = document.createElement('section');
  panel.id = 'romix-support-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'romix-support-title');

  const header = document.createElement('div');
  header.className = 'romix-support-header';
  const logo = document.createElement('img');
  logo.className = 'romix-logo';
  logo.src = CONFIG.logoSrc;
  logo.alt = CONFIG.brand;
  logo.addEventListener('error', ()=>{ logo.remove(); });
  const title = document.createElement('h3');
  title.id = 'romix-support-title';
  title.textContent = CONFIG.title;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'romix-icon-btn romix-close';
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Cerrar ayuda');
  closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6 6 18M6 6l12 12" stroke="#6c757d" stroke-width="2" stroke-linecap="round"/></svg>';
  header.append(logo, title, closeBtn);

  const body = document.createElement('div');
  body.className = 'romix-support-body';

  const tabs = document.createElement('div');
  tabs.className = 'romix-tabs';
  const tabContacts = document.createElement('button');
  tabContacts.type = 'button'; tabContacts.className = 'romix-btn romix-btn--ghost romix-tab active'; tabContacts.textContent = 'Contactos';
  const tabFaq = document.createElement('button');
  tabFaq.type = 'button'; tabFaq.className = 'romix-btn romix-btn--ghost romix-tab'; tabFaq.textContent = 'FAQ interactivo';
  tabs.append(tabContacts, tabFaq);

  const contactsWrap = document.createElement('div');
  contactsWrap.className = 'romix-group romix-contacts';

  const waLink = document.createElement('a');
  waLink.className = 'romix-btn romix-btn--primary romix-action whatsapp';
  waLink.target = '_blank';
  waLink.rel = 'noopener noreferrer';
  const waMsg = encodeURIComponent(CONFIG.defaultMessage);
  waLink.href = `https://wa.me/${CONFIG.phoneE164}?text=${waMsg}`;
  waLink.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 20l1.5-4A8 8 0 1 1 20 11.5 8 8 0 0 1 8.5 20L3 20Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <span>Chatear con ROMIX</span>`;
  waLink.setAttribute('aria-label', 'Chatear con ROMIX por WhatsApp');

  const mailLink = document.createElement('a');
  mailLink.className = 'romix-btn romix-btn--secondary romix-action email';
  mailLink.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent('Ayuda con mi pedido ROMIX')}`;
  mailLink.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm0 0 8 7 8-7" stroke="#1b1f24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <span>Enviar correo a ROMIX</span>`;
  mailLink.setAttribute('aria-label', 'Enviar correo a ROMIX');

  const note = document.createElement('p');
  note.className = 'romix-note';
  note.textContent = 'Respondemos de Lunes a Viernes 7:00–16:30.';

  contactsWrap.append(waLink, mailLink, note);

  const faqWrap = document.createElement('div');
  faqWrap.className = 'romix-group romix-faq';
  faqWrap.innerHTML = `
    <a href="ayuda.html#size-guide"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 6v6l4 2" stroke="#1b1f24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Guía de talles</span></a>
    <a href="ayuda.html#returns"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4h16v16H4z" stroke="#1b1f24" stroke-width="2"/></svg><span>Política de Cambios</span></a>
    <a href="#contacto"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 10c0 6-9 11-9 11S3 16 3 10a9 9 0 1 1 18 0Z" stroke="#1b1f24" stroke-width="2"/></svg><span>Ver contacto y ubicación</span></a>
  `;

  body.append(tabs, contactsWrap, faqWrap);
  panel.append(header, body);

  // Attach
  root.append(fab, overlay, panel);
  document.body.appendChild(root);

  // Behavior
  const open = () => {
    root.classList.add('romix-open');
    fab.setAttribute('aria-expanded', 'true');
    // focus the close button shortly after animation begins
    setTimeout(()=>{ closeBtn.focus(); }, 30);
  };
  const close = () => {
    root.classList.remove('romix-open');
    fab.setAttribute('aria-expanded', 'false');
    fab.focus();
  };
  const toggle = () => {
    if (root.classList.contains('romix-open')) close(); else open();
  };

  fab.addEventListener('click', toggle);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') close(); });

  // Tabs behavior
  const activateContacts = () => {
    tabContacts.classList.add('active');
    tabFaq.classList.remove('active');
    contactsWrap.style.display = '';
    faqWrap.style.display = 'none';
  };
  const activateFaq = () => {
    tabFaq.classList.add('active');
    tabContacts.classList.remove('active');
    contactsWrap.style.display = 'none';
    faqWrap.style.display = '';
  };
  tabContacts.addEventListener('click', activateContacts);
  tabFaq.addEventListener('click', activateFaq);
  activateContacts();

  // Expose public API
  window.romixSupport = { open, close, toggle };
})();


