import { apiRequest } from './lib/api';
import { config } from './config';
import { supabase } from './lib/supabase';

const MARK = 'data-romix-enhanced';

async function accessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || '';
}

function findLabeledInput(prefix) {
  const labels = [...document.querySelectorAll('label')];
  const label = labels.find((item) => item.textContent.trim().toLowerCase().startsWith(prefix.toLowerCase()));
  return label?.querySelector('input, select, textarea') || null;
}

async function resolveCurrentProduct(token) {
  const sku = String(findLabeledInput('SKU')?.value || '').trim();
  if (!sku) throw new Error('Guardá el producto con un SKU antes de administrar imágenes.');
  const data = await apiRequest(`/api/admin/products?search=${encodeURIComponent(sku)}&page=1&page_size=50`, { token });
  const product = (data.items || []).find((item) => String(item.sku).toLowerCase() === sku.toLowerCase());
  if (!product) throw new Error('Primero guardá el producto y después subí las imágenes.');
  return product;
}

function showLocalMessage(text, kind = 'success') {
  let box = document.querySelector('.romix-enhancement-message');
  if (!box) {
    box = document.createElement('div');
    box.className = `romix-enhancement-message inline-alert inline-alert--${kind}`;
    const heading = document.querySelector('.editor-heading, .page-heading');
    heading?.insertAdjacentElement('afterend', box);
  }
  box.className = `romix-enhancement-message inline-alert inline-alert--${kind}`;
  box.textContent = text;
}

async function loadProductImages(token, productId) {
  const detail = await apiRequest(`/api/admin/products/${productId}`, { token });
  return detail.images || [];
}

function imageSrc(value) {
  const raw = String(value || '');
  return /^https?:\/\//i.test(raw) ? raw : `${config.publicSiteUrl}/${raw.replace(/^\/+/, '')}`;
}

async function renderEditorImages(token, product) {
  const strip = document.querySelector('.image-strip');
  if (!strip) return;
  const images = await loadProductImages(token, product.id);
  strip.replaceChildren();
  if (!images.length) {
    const empty = document.createElement('div');
    empty.className = 'media-empty';
    empty.textContent = 'Sin imágenes cargadas';
    strip.appendChild(empty);
    return;
  }

  images.forEach((image) => {
    const figure = document.createElement('figure');
    figure.className = 'romix-managed-image';
    const img = document.createElement('img');
    img.src = imageSrc(image.public_url);
    img.alt = image.alt_text || product.name || 'Imagen de producto';
    const caption = document.createElement('figcaption');
    caption.textContent = image.is_primary ? 'Principal' : 'Galería';
    const actions = document.createElement('div');
    actions.className = 'romix-image-actions';

    if (!image.is_primary) {
      const primary = document.createElement('button');
      primary.type = 'button';
      primary.className = 'table-action';
      primary.textContent = 'Hacer principal';
      primary.addEventListener('click', async () => {
        primary.disabled = true;
        try {
          await apiRequest(`/api/public/admin/product-images/${image.id}/primary`, { token, method: 'POST' });
          await renderEditorImages(token, product);
          showLocalMessage('Imagen principal actualizada.');
        } catch (error) {
          showLocalMessage(error.message, 'error');
          primary.disabled = false;
        }
      });
      actions.appendChild(primary);
    }

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'table-action';
    remove.textContent = 'Eliminar';
    remove.addEventListener('click', async () => {
      if (!window.confirm('¿Eliminar esta imagen del producto?')) return;
      remove.disabled = true;
      try {
        await apiRequest(`/api/public/admin/product-images/${image.id}`, { token, method: 'DELETE' });
        await renderEditorImages(token, product);
        showLocalMessage('Imagen eliminada.');
      } catch (error) {
        showLocalMessage(error.message, 'error');
        remove.disabled = false;
      }
    });
    actions.appendChild(remove);
    figure.append(img, caption, actions);
    strip.appendChild(figure);
  });
}

async function enhanceUploadButton(button) {
  if (button.hasAttribute(MARK)) return;
  button.setAttribute(MARK, '1');
  button.disabled = false;
  button.removeAttribute('title');

  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = 'image/jpeg,image/png,image/webp,image/avif';
  picker.multiple = true;
  picker.hidden = true;
  document.body.appendChild(picker);

  button.addEventListener('click', () => picker.click());
  picker.addEventListener('change', async () => {
    const files = [...(picker.files || [])];
    if (!files.length) return;
    if (files.some((file) => file.size > 10 * 1024 * 1024)) {
      showLocalMessage('Cada imagen debe pesar como máximo 10 MB.', 'error');
      picker.value = '';
      return;
    }
    button.disabled = true;
    try {
      const token = await accessToken();
      const product = await resolveCurrentProduct(token);
      const form = new FormData();
      files.forEach((file) => form.append('files', file));
      const response = await fetch(`${config.apiUrl}/api/public/admin/products/by-sku/${encodeURIComponent(product.sku)}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.detail || 'No se pudieron subir las imágenes.');
      await renderEditorImages(token, product);
      showLocalMessage(files.length === 1 ? 'Imagen subida correctamente.' : `${files.length} imágenes subidas correctamente.`);
    } catch (error) {
      showLocalMessage(error.message || 'No se pudieron subir las imágenes.', 'error');
    } finally {
      button.disabled = false;
      picker.value = '';
    }
  });

  try {
    const token = await accessToken();
    const product = await resolveCurrentProduct(token);
    await renderEditorImages(token, product);
  } catch {
    // Producto nuevo todavía no guardado: el botón seguirá disponible y explicará qué hacer al usarlo.
  }
}

function stockTone(stock) {
  const value = Number(stock || 0);
  if (value === 0) return 'Sin stock';
  if (value <= 3) return 'Stock bajo';
  return 'Disponible';
}

async function fetchAllProducts(token) {
  const first = await apiRequest('/api/admin/products?page=1&page_size=100', { token });
  if ((first.total || 0) <= 100) return first.items || [];
  const second = await apiRequest('/api/admin/products?page=2&page_size=100', { token });
  return [...(first.items || []), ...(second.items || [])];
}

async function renderInventory(panel) {
  if (panel.dataset.loading === '1') return;
  panel.dataset.loading = '1';
  panel.innerHTML = '<div class="spinner" role="status">Cargando inventario…</div>';
  try {
    const token = await accessToken();
    const products = await fetchAllProducts(token);
    panel.replaceChildren();

    const controls = document.createElement('div');
    controls.className = 'filters';
    const search = document.createElement('input');
    search.placeholder = 'Buscar por nombre o SKU';
    search.className = 'romix-inventory-search';
    controls.appendChild(search);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = '<thead><tr><th>Producto</th><th>SKU</th><th>Stock total</th><th>Estado</th><th></th></tr></thead><tbody></tbody>';
    const tbody = table.querySelector('tbody');
    tableWrap.appendChild(table);
    panel.append(controls, tableWrap);

    const draw = (filter = '') => {
      const q = filter.trim().toLowerCase();
      tbody.replaceChildren();
      products.filter((product) => !q || String(product.name).toLowerCase().includes(q) || String(product.sku).toLowerCase().includes(q)).forEach((product) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td><strong>${product.name}</strong></td><td>${product.sku}</td><td>${product.stock}</td><td>${stockTone(product.stock)}</td><td></td>`;
        const actionCell = row.lastElementChild;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'table-action';
        button.textContent = 'Gestionar stock';
        button.addEventListener('click', async () => {
          button.disabled = true;
          try {
            const detail = await apiRequest(`/api/admin/products/${product.id}`, { token });
            const detailRow = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 5;
            const variantTable = document.createElement('table');
            variantTable.className = 'variant-table romix-stock-editor';
            variantTable.innerHTML = '<thead><tr><th>Color</th><th>Talle</th><th>Stock</th><th>Estado</th><th></th></tr></thead><tbody></tbody>';
            const body = variantTable.querySelector('tbody');
            (detail.variants || []).forEach((variant) => {
              const variantRow = document.createElement('tr');
              const color = document.createElement('td'); color.textContent = variant.color;
              const size = document.createElement('td'); size.textContent = variant.size;
              const stockCell = document.createElement('td');
              const input = document.createElement('input'); input.type = 'number'; input.min = '0'; input.value = variant.stock;
              stockCell.appendChild(input);
              const state = document.createElement('td'); state.textContent = variant.status === 'active' ? 'Activa' : 'Inactiva';
              const action = document.createElement('td');
              const save = document.createElement('button'); save.type = 'button'; save.className = 'button button--secondary button--small'; save.textContent = 'Guardar';
              save.addEventListener('click', async () => {
                save.disabled = true;
                try {
                  await apiRequest(`/api/admin/inventory/${variant.id}/adjust`, { token, method: 'POST', body: { stock: Number(input.value || 0), reason: 'Ajuste desde Inventario / Stock' } });
                  save.textContent = 'Guardado';
                  product.stock = (detail.variants || []).reduce((sum, item) => sum + (item.id === variant.id ? Number(input.value || 0) : Number(item.stock || 0)), 0);
                  variant.stock = Number(input.value || 0);
                } catch (error) {
                  window.alert(error.message);
                } finally {
                  setTimeout(() => { save.disabled = false; save.textContent = 'Guardar'; }, 900);
                }
              });
              action.appendChild(save);
              variantRow.append(color, size, stockCell, state, action);
              body.appendChild(variantRow);
            });
            cell.appendChild(variantTable);
            detailRow.appendChild(cell);
            row.insertAdjacentElement('afterend', detailRow);
            button.textContent = 'Abierto';
          } catch (error) {
            window.alert(error.message);
            button.disabled = false;
          }
        });
        actionCell.appendChild(button);
        tbody.appendChild(row);
      });
    };

    search.addEventListener('input', () => draw(search.value));
    draw();
  } catch (error) {
    panel.innerHTML = `<p class="empty-copy">${error.message || 'No se pudo cargar el inventario.'}</p>`;
  } finally {
    panel.dataset.loading = '0';
  }
}

function enhanceInventoryPage() {
  const headings = [...document.querySelectorAll('.page-heading h1')];
  const heading = headings.find((node) => node.textContent.trim() === 'Inventario / Stock');
  if (!heading) return;
  const page = heading.closest('.page');
  const panel = page?.querySelector('.placeholder-panel');
  if (!panel || panel.hasAttribute(MARK)) return;
  panel.setAttribute(MARK, '1');
  const intro = heading.parentElement?.querySelector('p');
  if (intro) intro.textContent = 'Buscá productos y ajustá el stock real por color y talle.';
  renderInventory(panel);
}

async function scan() {
  document.querySelectorAll('.upload-box').forEach((button) => enhanceUploadButton(button));
  enhanceInventoryPage();
}

const observer = new MutationObserver(() => scan());
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', scan);
scan();
