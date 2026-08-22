import { apiRequest } from './lib/api';
import { supabase } from './lib/supabase';

const MARK = 'data-romix-module-ready';

async function token() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || '';
}

function button(label, className = 'button button--secondary button--small') {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.textContent = label;
  return el;
}

function field(labelText, control) {
  const label = document.createElement('label');
  label.textContent = labelText;
  label.appendChild(control);
  return label;
}

function input(type = 'text', value = '') {
  const el = document.createElement('input');
  el.type = type;
  el.value = value ?? '';
  return el;
}

function select(options, value = '') {
  const el = document.createElement('select');
  options.forEach(([optionValue, label]) => {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = label;
    el.appendChild(option);
  });
  el.value = value;
  return el;
}

function alertBox(text, kind = 'success') {
  const box = document.createElement('div');
  box.className = `inline-alert inline-alert--${kind}`;
  box.textContent = text;
  return box;
}

function replacePlaceholder(title, subtitle) {
  const heading = [...document.querySelectorAll('.page-heading h1')].find((node) => node.textContent.trim() === title);
  if (!heading) return null;
  const page = heading.closest('.page');
  const panel = page?.querySelector('.placeholder-panel');
  if (!panel || panel.hasAttribute(MARK)) return null;
  panel.setAttribute(MARK, '1');
  const copy = heading.parentElement?.querySelector('p');
  if (copy) copy.textContent = subtitle;
  panel.replaceChildren();
  panel.classList.remove('placeholder-panel');
  return panel;
}

async function renderCategories(panel) {
  const auth = await token();
  const rows = await apiRequest('/api/admin/categories', { token: auth });
  const messageSlot = document.createElement('div');

  const form = document.createElement('div');
  form.className = 'form-grid';
  const name = input();
  name.placeholder = 'Ej. Remeras';
  const audience = select([['mujer', 'Mujer'], ['hombre', 'Hombre'], ['ninos', 'Niños']], 'mujer');
  const status = select([['active', 'Activa'], ['hidden', 'Oculta']], 'active');
  const order = input('number', '0');
  order.min = '0';
  const save = button('Crear categoría', 'button button--primary');
  form.append(field('Nombre', name), field('Público', audience), field('Estado', status), field('Orden', order), save);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = '<thead><tr><th>Nombre</th><th>Público</th><th>Estado</th><th>Orden</th><th></th></tr></thead><tbody></tbody>';
  const tbody = table.querySelector('tbody');
  tableWrap.appendChild(table);

  async function refresh() {
    const fresh = await apiRequest('/api/admin/categories', { token: auth });
    rows.splice(0, rows.length, ...fresh);
    draw();
  }

  function draw() {
    tbody.replaceChildren();
    rows.forEach((category) => {
      const tr = document.createElement('tr');
      const nameCell = document.createElement('td');
      const nameInput = input('text', category.name);
      nameCell.appendChild(nameInput);
      const audienceCell = document.createElement('td');
      const audienceSelect = select([['mujer', 'Mujer'], ['hombre', 'Hombre'], ['ninos', 'Niños']], category.audience);
      audienceCell.appendChild(audienceSelect);
      const statusCell = document.createElement('td');
      const statusSelect = select([['active', 'Activa'], ['hidden', 'Oculta']], category.status);
      statusCell.appendChild(statusSelect);
      const orderCell = document.createElement('td');
      const orderInput = input('number', category.display_order);
      orderInput.min = '0';
      orderCell.appendChild(orderInput);
      const actionCell = document.createElement('td');
      const update = button('Guardar');
      update.addEventListener('click', async () => {
        update.disabled = true;
        try {
          await apiRequest(`/api/admin/categories/${category.id}`, {
            token: auth,
            method: 'PUT',
            body: { name: nameInput.value, audience: audienceSelect.value, status: statusSelect.value, display_order: Number(orderInput.value || 0) },
          });
          messageSlot.replaceChildren(alertBox('Categoría actualizada.'));
          await refresh();
        } catch (error) {
          messageSlot.replaceChildren(alertBox(error.message, 'error'));
        } finally { update.disabled = false; }
      });
      actionCell.appendChild(update);
      tr.append(nameCell, audienceCell, statusCell, orderCell, actionCell);
      tbody.appendChild(tr);
    });
  }

  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      await apiRequest('/api/admin/categories', {
        token: auth,
        method: 'POST',
        body: { name: name.value, audience: audience.value, status: status.value, display_order: Number(order.value || 0) },
      });
      name.value = '';
      messageSlot.replaceChildren(alertBox('Categoría creada.'));
      await refresh();
    } catch (error) {
      messageSlot.replaceChildren(alertBox(error.message, 'error'));
    } finally { save.disabled = false; }
  });

  panel.append(messageSlot, form, tableWrap);
  draw();
}

async function renderCollections(panel) {
  const auth = await token();
  let rows = await apiRequest('/api/admin/collections', { token: auth });
  const messageSlot = document.createElement('div');

  const form = document.createElement('div');
  form.className = 'form-grid';
  const name = input();
  name.placeholder = 'Ej. Invierno 2026';
  const status = select([['active', 'Activa'], ['hidden', 'Oculta']], 'active');
  const description = input();
  description.placeholder = 'Descripción opcional';
  const save = button('Crear colección', 'button button--primary');
  form.append(field('Nombre', name), field('Estado', status), field('Descripción', description), save);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = '<thead><tr><th>Nombre</th><th>Estado</th><th>Descripción</th><th></th></tr></thead><tbody></tbody>';
  const tbody = table.querySelector('tbody');
  tableWrap.appendChild(table);

  async function refresh() {
    rows = await apiRequest('/api/admin/collections', { token: auth });
    draw();
  }

  function draw() {
    tbody.replaceChildren();
    rows.forEach((collection) => {
      const tr = document.createElement('tr');
      const nameCell = document.createElement('td');
      const nameInput = input('text', collection.name);
      nameCell.appendChild(nameInput);
      const statusCell = document.createElement('td');
      const statusSelect = select([['active', 'Activa'], ['hidden', 'Oculta']], collection.status);
      statusCell.appendChild(statusSelect);
      const descriptionCell = document.createElement('td');
      const descriptionInput = input('text', collection.description || '');
      descriptionCell.appendChild(descriptionInput);
      const actionCell = document.createElement('td');
      const update = button('Guardar');
      update.addEventListener('click', async () => {
        update.disabled = true;
        try {
          await apiRequest(`/api/admin/collections/${collection.id}`, {
            token: auth,
            method: 'PUT',
            body: { name: nameInput.value, status: statusSelect.value, description: descriptionInput.value || null },
          });
          messageSlot.replaceChildren(alertBox('Colección actualizada.'));
          await refresh();
        } catch (error) {
          messageSlot.replaceChildren(alertBox(error.message, 'error'));
        } finally { update.disabled = false; }
      });
      actionCell.appendChild(update);
      tr.append(nameCell, statusCell, descriptionCell, actionCell);
      tbody.appendChild(tr);
    });
  }

  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      await apiRequest('/api/admin/collections', {
        token: auth,
        method: 'POST',
        body: { name: name.value, status: status.value, description: description.value || null },
      });
      name.value = '';
      description.value = '';
      messageSlot.replaceChildren(alertBox('Colección creada.'));
      await refresh();
    } catch (error) {
      messageSlot.replaceChildren(alertBox(error.message, 'error'));
    } finally { save.disabled = false; }
  });

  panel.append(messageSlot, form, tableWrap);
  draw();
}

const ORDER_LABELS = {
  submitted: 'Recibido',
  confirmed: 'Confirmado',
  prepared: 'Preparado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

async function renderOrders(panel) {
  const auth = await token();
  let rows = await apiRequest('/api/admin/orders', { token: auth });
  const messageSlot = document.createElement('div');
  const tableWrap = document.createElement('div');
  tableWrap.className = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = '<thead><tr><th>Pedido</th><th>Fecha</th><th>Unidades</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody></tbody>';
  const tbody = table.querySelector('tbody');
  tableWrap.appendChild(table);

  async function refresh() {
    rows = await apiRequest('/api/admin/orders', { token: auth });
    draw();
  }

  function draw() {
    tbody.replaceChildren();
    if (!rows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.textContent = 'Todavía no hay pedidos registrados.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    rows.forEach((order) => {
      const tr = document.createElement('tr');
      const ref = document.createElement('td'); ref.textContent = order.reference;
      const date = document.createElement('td'); date.textContent = new Date(order.created_at).toLocaleString('es-AR');
      const count = document.createElement('td'); count.textContent = order.item_count;
      const total = document.createElement('td'); total.textContent = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(order.total || 0);
      const statusCell = document.createElement('td');
      const statusSelect = select(Object.entries(ORDER_LABELS), order.status);
      statusCell.appendChild(statusSelect);
      const actionCell = document.createElement('td');
      const view = button('Ver detalle');
      const save = button('Guardar estado');
      save.addEventListener('click', async () => {
        save.disabled = true;
        try {
          await apiRequest(`/api/admin/orders/${order.id}/status`, { token: auth, method: 'PATCH', body: { status: statusSelect.value } });
          messageSlot.replaceChildren(alertBox('Estado del pedido actualizado.'));
          await refresh();
        } catch (error) {
          messageSlot.replaceChildren(alertBox(error.message, 'error'));
        } finally { save.disabled = false; }
      });
      view.addEventListener('click', async () => {
        view.disabled = true;
        try {
          const detail = await apiRequest(`/api/admin/orders/${order.id}`, { token: auth });
          const detailRow = document.createElement('tr');
          const cell = document.createElement('td');
          cell.colSpan = 6;
          const inner = document.createElement('table');
          inner.className = 'variant-table';
          inner.innerHTML = '<thead><tr><th>Producto</th><th>Color</th><th>Talle</th><th>Cantidad</th><th>Unitario</th><th>Subtotal</th></tr></thead><tbody></tbody>';
          const body = inner.querySelector('tbody');
          (detail.items || []).forEach((item) => {
            const itemRow = document.createElement('tr');
            [item.product_name, item.color, item.size, item.quantity, item.unit_price, item.subtotal].forEach((value, index) => {
              const td = document.createElement('td');
              td.textContent = index >= 4 ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value || 0) : value;
              itemRow.appendChild(td);
            });
            body.appendChild(itemRow);
          });
          cell.appendChild(inner);
          detailRow.appendChild(cell);
          tr.insertAdjacentElement('afterend', detailRow);
          view.textContent = 'Detalle abierto';
        } catch (error) {
          messageSlot.replaceChildren(alertBox(error.message, 'error'));
          view.disabled = false;
        }
      });
      actionCell.append(view, save);
      tr.append(ref, date, count, total, statusCell, actionCell);
      tbody.appendChild(tr);
    });
  }

  panel.append(messageSlot, tableWrap);
  draw();
}

async function scan() {
  const jobs = [
    ['Categorías', 'Creá, editá, ordená y ocultá categorías reales del catálogo.', renderCategories],
    ['Colecciones', 'Organizá productos en colecciones administrables.', renderCollections],
    ['Pedidos', 'Consultá pedidos, detalle y estado operativo.', renderOrders],
  ];

  for (const [title, subtitle, renderer] of jobs) {
    const panel = replacePlaceholder(title, subtitle);
    if (!panel) continue;
    try {
      await renderer(panel);
    } catch (error) {
      panel.replaceChildren(alertBox(error.message || 'No se pudo cargar el módulo.', 'error'));
    }
  }
}

const observer = new MutationObserver(() => scan());
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', scan);
scan();
