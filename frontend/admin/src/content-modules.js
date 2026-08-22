import { apiRequest } from './lib/api';
import { supabase } from './lib/supabase';

const MARK = 'data-romix-content-ready';

async function token() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || '';
}

function input(type = 'text', value = '') {
  const el = document.createElement('input');
  el.type = type;
  el.value = value ?? '';
  return el;
}

function select(options, value = '') {
  const el = document.createElement('select');
  options.forEach(([v, label]) => {
    const option = document.createElement('option');
    option.value = v;
    option.textContent = label;
    el.appendChild(option);
  });
  el.value = value;
  return el;
}

function field(labelText, control) {
  const label = document.createElement('label');
  label.textContent = labelText;
  label.appendChild(control);
  return label;
}

function button(label, className = 'button button--secondary button--small') {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.textContent = label;
  return el;
}

function message(text, kind = 'success') {
  const el = document.createElement('div');
  el.className = `inline-alert inline-alert--${kind}`;
  el.textContent = text;
  return el;
}

function panelFor(title, subtitle) {
  const heading = [...document.querySelectorAll('.page-heading h1')].find((node) => node.textContent.trim() === title);
  if (!heading) return null;
  const page = heading.closest('.page');
  const panel = page?.querySelector('.placeholder-panel');
  if (!panel || panel.hasAttribute(MARK)) return null;
  panel.setAttribute(MARK, '1');
  panel.classList.remove('placeholder-panel');
  panel.replaceChildren();
  const copy = heading.parentElement?.querySelector('p');
  if (copy) copy.textContent = subtitle;
  return panel;
}

async function renderBanners(panel) {
  const auth = await token();
  let rows = await apiRequest('/api/admin/banners', { token: auth });
  const messages = document.createElement('div');
  const form = document.createElement('div');
  form.className = 'form-grid';
  const title = input();
  const body = input();
  const url = input();
  url.placeholder = 'https://... o /images/banners/...';
  const link = input();
  link.placeholder = 'catalogo.html';
  const alt = input();
  const status = select([['draft','Borrador'],['published','Publicado'],['hidden','Oculto']], 'draft');
  const position = input('number', '0');
  const save = button('Crear banner', 'button button--primary');
  form.append(field('Título', title), field('Texto', body), field('Imagen URL', url), field('Enlace', link), field('Texto alternativo', alt), field('Estado', status), field('Orden', position), save);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = '<thead><tr><th>Banner</th><th>Imagen</th><th>Estado</th><th>Orden</th><th></th></tr></thead><tbody></tbody>';
  const tbody = table.querySelector('tbody');
  tableWrap.appendChild(table);

  async function refresh() { rows = await apiRequest('/api/admin/banners', { token: auth }); draw(); }
  function draw() {
    tbody.replaceChildren();
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      const t = input('text', row.title || '');
      const u = input('text', row.public_url || '');
      const s = select([['draft','Borrador'],['published','Publicado'],['hidden','Oculto']], row.status);
      const p = input('number', row.position || 0);
      const action = button('Guardar');
      action.addEventListener('click', async () => {
        action.disabled = true;
        try {
          await apiRequest(`/api/admin/banners/${row.id}`, { token: auth, method: 'PUT', body: {
            title: t.value || null, body: row.body || null, link_url: row.link_url || null,
            public_url: u.value, storage_path: row.storage_path || `external/${row.id}`,
            alt_text: row.alt_text || t.value || 'Banner ROMIX', status: s.value, position: Number(p.value || 0),
          }});
          messages.replaceChildren(message('Banner actualizado.'));
          await refresh();
        } catch (error) { messages.replaceChildren(message(error.message, 'error')); }
        finally { action.disabled = false; }
      });
      [t,u,s,p].forEach((control) => { const td = document.createElement('td'); td.appendChild(control); tr.appendChild(td); });
      const td = document.createElement('td'); td.appendChild(action); tr.appendChild(td); tbody.appendChild(tr);
    });
  }

  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      await apiRequest('/api/admin/banners', { token: auth, method: 'POST', body: {
        title: title.value || null, body: body.value || null, link_url: link.value || null,
        public_url: url.value, storage_path: `external/${Date.now()}`,
        alt_text: alt.value || title.value || 'Banner ROMIX', status: status.value, position: Number(position.value || 0),
      }});
      messages.replaceChildren(message('Banner creado.'));
      title.value = ''; body.value = ''; url.value = ''; link.value = ''; alt.value = '';
      await refresh();
    } catch (error) { messages.replaceChildren(message(error.message, 'error')); }
    finally { save.disabled = false; }
  });

  panel.append(messages, form, tableWrap);
  draw();
}

async function renderSizeGuides(panel) {
  const auth = await token();
  let rows = await apiRequest('/api/admin/size-guides', { token: auth });
  const messages = document.createElement('div');
  const form = document.createElement('div'); form.className = 'form-grid';
  const key = input(); key.placeholder = 'remeras-mujer';
  const title = input();
  const audience = select([['','General'],['mujer','Mujer'],['hombre','Hombre'],['ninos','Niños']], '');
  const status = select([['draft','Borrador'],['published','Publicado'],['hidden','Oculto']], 'draft');
  const content = document.createElement('textarea'); content.rows = 6; content.placeholder = '{"XS":"80-84 cm","S":"85-89 cm"}';
  const save = button('Crear guía', 'button button--primary');
  form.append(field('Clave', key), field('Título', title), field('Público', audience), field('Estado', status), field('Contenido JSON', content), save);

  const list = document.createElement('div');
  async function refresh() { rows = await apiRequest('/api/admin/size-guides', { token: auth }); draw(); }
  function draw() {
    list.replaceChildren();
    rows.forEach((row) => {
      const block = document.createElement('div'); block.className = 'panel';
      const t = input('text', row.title); const s = select([['draft','Borrador'],['published','Publicado'],['hidden','Oculto']], row.status);
      const textarea = document.createElement('textarea'); textarea.rows = 5; textarea.value = JSON.stringify(row.content || {}, null, 2);
      const update = button('Guardar cambios');
      update.addEventListener('click', async () => {
        try {
          await apiRequest(`/api/admin/size-guides/${row.id}`, { token: auth, method: 'PUT', body: {
            key: row.key, title: t.value, audience: row.audience || null, category_id: row.category_id || null,
            content: JSON.parse(textarea.value || '{}'), status: s.value,
          }});
          messages.replaceChildren(message('Guía actualizada.'));
          await refresh();
        } catch (error) { messages.replaceChildren(message(error.message, 'error')); }
      });
      block.append(field('Título', t), field('Estado', s), field('Contenido JSON', textarea), update);
      list.appendChild(block);
    });
  }
  save.addEventListener('click', async () => {
    try {
      await apiRequest('/api/admin/size-guides', { token: auth, method: 'POST', body: {
        key: key.value, title: title.value, audience: audience.value || null, category_id: null,
        content: JSON.parse(content.value || '{}'), status: status.value,
      }});
      messages.replaceChildren(message('Guía creada.'));
      await refresh();
    } catch (error) { messages.replaceChildren(message(error.message, 'error')); }
  });
  panel.append(messages, form, list); draw();
}

async function renderSettings(panel) {
  const auth = await token();
  const rows = await apiRequest('/api/admin/settings', { token: auth });
  const current = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const messages = document.createElement('div');
  const form = document.createElement('div'); form.className = 'form-grid';
  const fields = [
    ['whatsapp','WhatsApp'],['instagram','Instagram'],['facebook','Facebook'],['tiktok','TikTok'],
    ['store_location','Ubicación'],['footer_description','Texto del pie de página'],
  ];
  const controls = {};
  fields.forEach(([key, label]) => { controls[key] = input('text', current[key] ?? ''); form.appendChild(field(label, controls[key])); });
  const save = button('Guardar configuración', 'button button--primary');
  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      for (const [key] of fields) {
        await apiRequest(`/api/admin/settings/${key}`, { token: auth, method: 'PUT', body: { value: controls[key].value, is_public: true } });
      }
      messages.replaceChildren(message('Configuración guardada.'));
    } catch (error) { messages.replaceChildren(message(error.message, 'error')); }
    finally { save.disabled = false; }
  });
  form.appendChild(save); panel.append(messages, form);
}

async function scan() {
  const modules = [
    ['Banners', 'Gestioná banners publicados en la portada de la tienda.', renderBanners],
    ['Guía de talles', 'Creá y publicá guías de talles desde el Admin.', renderSizeGuides],
    ['Configuración', 'Administrá datos públicos de contacto y redes.', renderSettings],
  ];
  for (const [title, subtitle, renderer] of modules) {
    const panel = panelFor(title, subtitle);
    if (!panel) continue;
    try { await renderer(panel); }
    catch (error) { panel.replaceChildren(message(error.message || 'No se pudo cargar el módulo.', 'error')); }
  }
}

const observer = new MutationObserver(scan);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', scan);
scan();
