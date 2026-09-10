import { apiRequest } from './lib/api';
import { supabase } from './lib/supabase';

const REMOVED_NAV = new Set([
  'Categorías',
  'Colecciones',
  'Pedidos',
  'Banners',
  'Guía de talles',
  'Configuración',
  'Usuarios admin',
  'Actividad',
  'Reportes',
]);

const IMPACT_MARK = 'data-romix-product-focus';
let scanQueued = false;

function installStyles() {
  if (document.getElementById('romix-product-focus-styles')) return;
  const style = document.createElement('style');
  style.id = 'romix-product-focus-styles';
  style.textContent = `
    .romix-impact-panel { margin: 0 0 18px; }
    .romix-impact-panel__head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:14px; }
    .romix-impact-panel__head h2 { margin:0 0 4px; font-size:1rem; }
    .romix-impact-panel__head p { margin:0; color:var(--muted, #687180); font-size:.88rem; }
    .romix-impact-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px; }
    .romix-impact-card { border:1px solid rgba(120,130,145,.18); border-radius:12px; padding:11px 12px; background:rgba(255,255,255,.55); min-width:0; }
    .romix-impact-card span { display:block; color:#6b7280; font-size:.72rem; text-transform:uppercase; letter-spacing:.04em; margin-bottom:4px; }
    .romix-impact-card strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.92rem; }
    .romix-impact-note { margin:12px 0 0; font-size:.82rem; color:#667085; }
    .romix-editor-note { margin:.55rem 0 0; color:#667085; font-size:.8rem; line-height:1.45; }
    .romix-sku-helper { display:flex; gap:8px; align-items:center; margin-top:6px; }
    .romix-sku-helper button { flex:0 0 auto; }
    .romix-hide-product { white-space:nowrap; }
    .romix-focus-dashboard { margin-top:18px; }
    .romix-focus-dashboard ul { margin:10px 0 0 18px; color:#5f6672; line-height:1.65; }
    @media (max-width: 900px) { .romix-impact-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @media (max-width: 560px) { .romix-impact-grid { grid-template-columns:1fr 1fr; } .romix-impact-panel__head { flex-direction:column; } }
  `;
  document.head.appendChild(style);
}

function pruneNavigation() {
  document.querySelectorAll('.sidebar nav button').forEach((button) => {
    const label = button.querySelector('span')?.textContent?.trim() || button.textContent.trim();
    if (REMOVED_NAV.has(label)) button.remove();
  });
}

function simplifyDashboard() {
  const heading = [...document.querySelectorAll('.page-heading h1')].find((node) => node.textContent.trim() === 'Dashboard');
  if (!heading) return;
  const page = heading.closest('.page');
  if (!page || page.classList.contains('page--statistics')) return;

  const intro = heading.parentElement?.querySelector('p');
  if (intro) intro.textContent = 'Control rápido de productos publicados, borradores y stock.';

  if (page.classList.contains('page--statistics')) return;
  if (page.querySelector('.romix-focus-dashboard')) return;

  const panel = document.createElement('section');
  panel.className = 'panel romix-focus-dashboard';
  const title = document.createElement('h2');
  title.textContent = 'Panel enfocado en catálogo';
  const copy = document.createElement('p');
  copy.textContent = 'La administración queda concentrada en lo que impacta directamente en la tienda.';
  const list = document.createElement('ul');
  [
    'Productos: contenido, precio, imágenes, publicación y detalle.',
    'Inventario / Stock: disponibilidad real por color y talle.',
    'La tienda pública consume estos cambios desde la API de catálogo.',
  ].forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);
  });
  panel.append(title, copy, list);
  page.appendChild(panel);
}

function labelControl(prefix) {
  const normalized = prefix.toLowerCase();
  const label = [...document.querySelectorAll('.editor-page label')].find((item) =>
    item.textContent.trim().toLowerCase().startsWith(normalized)
  );
  return { label, control: label?.querySelector('input, select, textarea') || null };
}


function setReactInputValue(input, value) {
  if (!input) return;
  const prototype = input instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  if (descriptor?.set) descriptor.set.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function slugPart(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

function enhanceSku() {
  const { label, control: sku } = labelControl('SKU');
  if (!label || !sku || label.querySelector('.romix-sku-helper')) return;
  const helper = document.createElement('div');
  helper.className = 'romix-sku-helper';
  const generate = document.createElement('button');
  generate.type = 'button';
  generate.className = 'button button--secondary button--small';
  generate.textContent = 'Generar SKU';
  const hint = document.createElement('small');
  hint.textContent = 'Identificador interno estable del artículo.';
  generate.addEventListener('click', () => {
    const name = labelControl('Nombre del producto').control?.value || 'PRODUCTO';
    const suffix = String(Date.now()).slice(-5);
    setReactInputValue(sku, `ROMIX-${slugPart(name) || 'PRODUCTO'}-${suffix}`);
  });
  helper.append(generate, hint);
  label.appendChild(helper);
}

function addSectionNotes() {
  document.querySelectorAll('.editor-section').forEach((section) => {
    if (section.querySelector('.romix-editor-note')) return;
    const title = section.querySelector('h2')?.textContent?.trim();
    const messages = {
      'Imágenes del producto': 'La imagen marcada como Principal se usa como portada del artículo; el resto forma la galería del detalle.',
      'Información básica': 'Nombre, categoría, descripción y tags alimentan la ficha pública del producto.',
      'Variantes': 'Cada combinación de talle + color tiene su propio stock. La tienda muestra disponibilidad a partir de estas variantes.',
      'Especificaciones': 'Composición, origen y cuidados se envían al detalle técnico público del artículo.',
    };
    if (!messages[title]) return;
    const note = document.createElement('p');
    note.className = 'romix-editor-note';
    note.textContent = messages[title];
    section.querySelector('h2')?.insertAdjacentElement('afterend', note);
  });
}

function statusLabel() {
  const forced = document.querySelector('.editor-page')?.dataset.romixForcedStatus;
  if (forced === 'hidden') return 'Oculto';
  const selected = document.querySelector('input[name="status"]:checked')?.value;
  return { published: 'Publicado', draft: 'Borrador', hidden: 'Oculto' }[selected] || 'Sin definir';
}

function money(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(number);
}

function currentImpact() {
  const name = labelControl('Nombre del producto').control?.value?.trim() || 'Sin nombre';
  const price = labelControl('Precio base').control?.value || 0;
  const variantRows = [...document.querySelectorAll('.variant-table tbody tr')];
  const stock = variantRows.reduce((total, row) => {
    const numberInputs = [...row.querySelectorAll('input[type="number"]')];
    return total + Number(numberInputs[0]?.value || 0);
  }, 0);
  const images = document.querySelectorAll('.image-strip figure').length;
  return { name, price, stock, images, variants: variantRows.length, status: statusLabel() };
}

function impactCard(label, value) {
  const card = document.createElement('div');
  card.className = 'romix-impact-card';
  const small = document.createElement('span');
  small.textContent = label;
  const strong = document.createElement('strong');
  strong.dataset.impactValue = label;
  strong.textContent = value;
  card.append(small, strong);
  return card;
}

function updateImpact(panel) {
  const state = currentImpact();
  const values = {
    'Estado público': state.status,
    'Producto': state.name,
    'Precio': money(state.price),
    'Stock total': String(state.stock),
    'Variantes / fotos': `${state.variants} / ${state.images}`,
  };
  panel.querySelectorAll('[data-impact-value]').forEach((node) => {
    node.textContent = values[node.dataset.impactValue] ?? '—';
  });
}

function ensureImpactPanel() {
  const editor = document.querySelector('.editor-page');
  const heading = editor?.querySelector('.editor-heading');
  if (!editor || !heading) return;
  let panel = editor.querySelector('.romix-impact-panel');
  if (!panel) {
    panel = document.createElement('section');
    panel.className = 'panel romix-impact-panel';
    panel.setAttribute(IMPACT_MARK, '1');

    const head = document.createElement('div');
    head.className = 'romix-impact-panel__head';
    const copy = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = 'Lo que verá el cliente';
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Resumen en vivo del artículo que estás editando.';
    copy.append(title, subtitle);

    const badge = document.createElement('span');
    badge.className = 'status-pill status-pill--published';
    badge.textContent = 'Tienda pública';
    head.append(copy, badge);

    const grid = document.createElement('div');
    grid.className = 'romix-impact-grid';
    grid.append(
      impactCard('Estado público', '—'),
      impactCard('Producto', '—'),
      impactCard('Precio', '—'),
      impactCard('Stock total', '—'),
      impactCard('Variantes / fotos', '—'),
    );

    const note = document.createElement('p');
    note.className = 'romix-impact-note';
    note.textContent = 'Después de Guardar y publicar, la tienda puede tardar hasta 60 segundos en refrescar el catálogo por caché.';
    panel.append(head, grid, note);
    heading.insertAdjacentElement('afterend', panel);

    editor.addEventListener('input', () => updateImpact(panel));
    editor.addEventListener('change', () => updateImpact(panel));
  }
  updateImpact(panel);
}

async function authToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || '';
}

async function resolveProduct(auth) {
  const sku = String(labelControl('SKU').control?.value || '').trim();
  if (!sku) throw new Error('Guardá primero el producto con un SKU.');
  const result = await apiRequest(`/api/admin/products?search=${encodeURIComponent(sku)}&page=1&page_size=50`, { token: auth });
  const row = (result.items || []).find((item) => String(item.sku || '').toLowerCase() === sku.toLowerCase());
  if (!row) throw new Error('No se encontró el producto guardado.');
  return apiRequest(`/api/admin/products/${row.id}`, { token: auth });
}

function writePayload(detail, status) {
  return {
    expected_updated_at: detail.updated_at,
    name: detail.name,
    slug: detail.slug,
    sku: detail.sku,
    barcode: detail.barcode || null,
    audience: detail.audience,
    category_id: detail.category_id || null,
    season_key: detail.season_key || null,
    description_html: detail.description_html || '',
    status,
    base_price: Number(detail.base_price || 0),
    compare_at_price: detail.compare_at_price == null ? null : Number(detail.compare_at_price),
    tags: Array.isArray(detail.tags) ? detail.tags : [],
    featured: Boolean(detail.featured),
    specifications: detail.specifications || {},
    collection_ids: detail.collection_ids || [],
    price_groups: Object.fromEntries(Object.entries(detail.price_groups || {}).map(([key, value]) => [key, Number(value)])),
    variants: (detail.variants || []).map((variant) => ({
      id: variant.id,
      size: variant.size,
      color: variant.color,
      color_hex: variant.color_hex || null,
      stock: null,
      updated_at: variant.updated_at,
      sku: variant.sku, barcode: variant.barcode, low_stock_threshold: variant.low_stock_threshold,
      price_override: variant.price_override == null ? null : Number(variant.price_override),
      status: variant.status || 'active',
    })),
  };
}

function editorMessage(text, kind = 'success') {
  let box = document.querySelector('.romix-product-focus-message');
  if (!box) {
    box = document.createElement('div');
    box.className = 'romix-product-focus-message';
    document.querySelector('.romix-impact-panel')?.insertAdjacentElement('afterend', box);
  }
  box.className = `romix-product-focus-message inline-alert inline-alert--${kind}`;
  box.textContent = text;
}

function enhanceSaveBar() {
  const saveBar = document.querySelector('.editor-page .save-bar');
  if (!saveBar || saveBar.dataset.romixFocusReady === '1') return;
  saveBar.dataset.romixFocusReady = '1';

  const actionGroup = saveBar.querySelector('div');
  if (!actionGroup) return;
  const hide = document.createElement('button');
  hide.type = 'button';
  hide.className = 'button button--ghost romix-hide-product';
  hide.textContent = 'Ocultar de la tienda';
  hide.addEventListener('click', async () => {
    if (!window.confirm('¿Ocultar este producto de la tienda pública? No se elimina y podés volver a publicarlo después.')) return;
    hide.disabled = true;
    try {
      const auth = await authToken();
      const detail = await resolveProduct(auth);
      await apiRequest(`/api/admin/products/${detail.id}`, {
        token: auth,
        method: 'PUT',
        body: writePayload(detail, 'hidden'),
      });
      const editor = document.querySelector('.editor-page');
      if (editor) editor.dataset.romixForcedStatus = 'hidden';
      updateImpact(document.querySelector('.romix-impact-panel'));
      editorMessage('Producto ocultado. Dejará de aparecer en la tienda pública cuando venza la caché.');
    } catch (error) {
      editorMessage(error.message || 'No se pudo ocultar el producto.', 'error');
    } finally {
      hide.disabled = false;
    }
  });
  actionGroup.prepend(hide);

  const publish = [...actionGroup.querySelectorAll('button')].find((button) => button.textContent.includes('Guardar y publicar'));
  if (publish) publish.title = 'Guarda todos los cambios y deja el artículo visible en la tienda.';
  const draft = [...actionGroup.querySelectorAll('button')].find((button) => button.textContent.includes('Guardar borrador'));
  if (draft) draft.title = 'Guarda los cambios sin mostrar el artículo en la tienda.';
}

function enhanceStatusPanel() {
  const panel = [...document.querySelectorAll('.editor-aside .side-panel')].find((item) => item.querySelector('h2')?.textContent.trim() === 'Estado del producto');
  if (!panel || panel.querySelector('.romix-status-note')) return;
  const note = document.createElement('p');
  note.className = 'romix-editor-note romix-status-note';
  note.textContent = 'El estado final lo define la acción inferior: Guardar borrador, Guardar y publicar u Ocultar de la tienda.';
  panel.appendChild(note);
}

function enhanceEditor() {
  const editor = document.querySelector('.editor-page');
  if (!editor) return;
  // Collection editing is owned by the React product editor.
  enhanceSku();
  addSectionNotes();
  ensureImpactPanel();
  enhanceSaveBar();

  enhanceStatusPanel();
}

function scan() {
  installStyles();
  pruneNavigation();
  simplifyDashboard();
  enhanceEditor();
}

function queueScan() {
  if (scanQueued) return;
  scanQueued = true;
  requestAnimationFrame(() => {
    scanQueued = false;
    scan();
  });
}

const observer = new MutationObserver(queueScan);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', queueScan);
queueScan();
