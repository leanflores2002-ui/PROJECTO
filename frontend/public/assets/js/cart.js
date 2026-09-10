(() => {
  const STORAGE_KEY = 'romix_cart';
  const LEGACY_KEYS = ['cart'];
  const PANEL_AUTO_HIDE_MS = 6500;
  const PANEL_HIDE_MS = 320;
  const PANEL_STYLE_ID = 'romix-cart-added-panel-style';
  const PANEL_IMAGE_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="100%" height="100%" fill="#f6f6f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#888" font-family="Segoe UI, Arial" font-size="18">ROMIX</text></svg>')}`;

  const panelState = {
    hideTimer: null,
    settleTimer: null,
    root: null,
    image: null,
    name: null,
    type: null,
    meta: null,
    price: null,
    cartLink: null,
    checkoutLink: null,
  };
  let lastSavePersisted = true;

  const normalize = (value) => {
    if (value == null) return '';
    try {
      return value
        .toString()
        .normalize('NFD')
        .replace(/\p{Diacritic}+/gu, '')
        .toLowerCase()
        .trim();
    } catch {
      return value.toString().toLowerCase().trim();
    }
  };

  const readLocal = (key) => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const persist = (cart) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      return true;
    } catch {
      return false;
    }
  };

  const buildKey = (item) => {
    const productId = item.productId ?? item.pid ?? item.id ?? item.slug ?? item.sku ?? '';
    const color = item.color ?? item.colorName ?? item.colorKey ?? '';
    const size = item.size ?? item.talle ?? item.sizeValue ?? '';
    return [String(productId || ''), normalize(color), normalize(size)].join('|');
  };

  const normalizeItem = (item) => {
    if (!item || typeof item !== 'object') return null;
    const qty = Math.max(1, Number(item.qty ?? item.quantity ?? 1) || 1);
    const price = Number(item.price || 0);
    const productId = item.productId ?? item.pid ?? item.id ?? item.slug ?? item.sku ?? '';
    const color = item.color ?? item.colorName ?? item.colorKey ?? 'Unico';
    const size = item.size ?? item.talle ?? item.sizeValue ?? 'U';
    const key = item.key || buildKey({ productId, color, size });

    return {
      key,
      productId: productId ? String(productId) : '',
      name: item.name ?? '',
      type: item.type ?? '',
      price,
      image: item.image ?? '',
      color,
      colorName: item.colorName ?? color,
      size,
      talle: size,
      qty,
      quantity: qty,
      subtotal: price * qty,
    };
  };

  const formatPrice = (value) => {
    const amount = Number(value || 0);
    return `$${amount.toLocaleString('es-AR')}`;
  };

  const addPanelStyles = () => {
    if (!document || !document.head) return;
    if (document.getElementById(PANEL_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = PANEL_STYLE_ID;
    style.textContent = `
      .romix-cart-added-panel {
        position: fixed;
        top: 16px;
        right: 16px;
        width: min(94vw, 390px);
        background: #fff;
        border-radius: 16px;
        border: 1px solid #ededed;
        box-shadow: 0 24px 40px rgba(0, 0, 0, 0.14);
        padding: 14px;
        z-index: 2200;
        opacity: 0;
        transform: translate3d(110%, 0, 0);
        pointer-events: none;
        transition: transform .32s ease, opacity .24s ease;
      }
      .romix-cart-added-panel.is-visible {
        opacity: 1;
        transform: translate3d(0, 0, 0);
        pointer-events: auto;
      }
      .romix-cart-added-panel__close {
        position: absolute;
        top: 10px;
        right: 10px;
        border: 0;
        background: transparent;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        font-size: 20px;
        line-height: 1;
        color: #5f5f5f;
        cursor: pointer;
      }
      .romix-cart-added-panel__close:hover {
        background: #f2f2f2;
      }
      .romix-cart-added-panel__header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 28px 10px 0;
      }
      .romix-cart-added-panel__icon {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #20a052;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
      }
      .romix-cart-added-panel__status {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        color: #222;
      }
      .romix-cart-added-panel__content {
        display: grid;
        grid-template-columns: 78px 1fr;
        gap: 12px;
        align-items: start;
      }
      .romix-cart-added-panel__image {
        width: 78px;
        height: 78px;
        border-radius: 10px;
        object-fit: cover;
        background: #f5f5f5;
      }
      .romix-cart-added-panel__name {
        margin: 0 0 4px;
        font-size: 14px;
        font-weight: 700;
        color: #181818;
      }
      .romix-cart-added-panel__type,
      .romix-cart-added-panel__meta {
        margin: 0;
        font-size: 12px;
        color: #666;
      }
      .romix-cart-added-panel__price {
        margin: 7px 0 0;
        font-size: 15px;
        font-weight: 800;
        color: #111;
      }
      .romix-cart-added-panel__actions {
        margin-top: 12px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .romix-cart-added-panel__btn {
        border-radius: 10px;
        text-decoration: none;
        text-align: center;
        padding: 10px 12px;
        font-size: 13px;
        font-weight: 700;
      }
      .romix-cart-added-panel__btn--secondary {
        border: 1px solid #d9d9d9;
        color: #222;
        background: #fff;
      }
      .romix-cart-added-panel__btn--primary {
        border: 1px solid #111;
        color: #fff;
        background: #111;
      }
      @media (max-width: 680px) {
        .romix-cart-added-panel {
          top: 10px;
          right: 10px;
          left: 10px;
          width: auto;
          padding: 12px;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const ensurePanel = () => {
    if (!document || !document.body) return null;
    if (panelState.root) return panelState;

    addPanelStyles();

    const panel = document.createElement('section');
    panel.className = 'romix-cart-added-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-live', 'polite');
    panel.setAttribute('aria-atomic', 'true');
    panel.innerHTML = `
      <button type="button" class="romix-cart-added-panel__close" aria-label="Cerrar">x</button>
      <div class="romix-cart-added-panel__header">
        <span class="romix-cart-added-panel__icon" aria-hidden="true">&#10003;</span>
        <p class="romix-cart-added-panel__status">Agregado a la bolsa de compra</p>
      </div>
      <div class="romix-cart-added-panel__content">
        <img class="romix-cart-added-panel__image" src="${PANEL_IMAGE_PLACEHOLDER}" alt="Producto agregado" loading="lazy" decoding="async" width="720" height="960" />
        <div class="romix-cart-added-panel__info">
          <p class="romix-cart-added-panel__name">Producto</p>
          <p class="romix-cart-added-panel__type">Indumentaria</p>
          <p class="romix-cart-added-panel__meta">Talle: U</p>
          <p class="romix-cart-added-panel__price">$0</p>
        </div>
      </div>
      <div class="romix-cart-added-panel__actions">
        <a class="romix-cart-added-panel__btn romix-cart-added-panel__btn--secondary" href="cart.html">Ver carrito</a>
        <a class="romix-cart-added-panel__btn romix-cart-added-panel__btn--primary" href="cart.html#order-btn">Comprar</a>
      </div>
    `;
    document.body.appendChild(panel);

    panelState.root = panel;
    panelState.image = panel.querySelector('.romix-cart-added-panel__image');
    panelState.name = panel.querySelector('.romix-cart-added-panel__name');
    panelState.type = panel.querySelector('.romix-cart-added-panel__type');
    panelState.meta = panel.querySelector('.romix-cart-added-panel__meta');
    panelState.price = panel.querySelector('.romix-cart-added-panel__price');
    panelState.cartLink = panel.querySelector('.romix-cart-added-panel__btn--secondary');
    panelState.checkoutLink = panel.querySelector('.romix-cart-added-panel__btn--primary');

    const close = panel.querySelector('.romix-cart-added-panel__close');
    if (close) close.addEventListener('click', () => hideAddedPanel(true));

    return panelState;
  };

  const hideAddedPanel = (immediate = false) => {
    const state = ensurePanel();
    if (!state || !state.root) return;
    if (state.hideTimer) clearTimeout(state.hideTimer);
    if (state.settleTimer) clearTimeout(state.settleTimer);

    const panel = state.root;
    panel.classList.remove('is-visible');
    if (immediate) {
      panel.hidden = true;
      return;
    }
    state.settleTimer = setTimeout(() => {
      panel.hidden = true;
    }, PANEL_HIDE_MS);
  };

  const showAddedPanel = (item) => {
    const state = ensurePanel();
    if (!state || !state.root || !item || typeof item !== 'object') return;

    const panel = state.root;
    const title = item.name || 'Producto';
    const type = item.type || 'Indumentaria';
    const size = item.talle || item.size || 'U';
    const color = item.colorName || item.color || '';
    const meta = color ? `Talle: ${size} | Color: ${color}` : `Talle: ${size}`;
    const image = item.image || PANEL_IMAGE_PLACEHOLDER;

    if (state.image) {
      state.image.src = image;
      state.image.alt = title;
      state.image.onerror = () => {
        state.image.onerror = null;
        state.image.src = PANEL_IMAGE_PLACEHOLDER;
      };
    }
    if (state.name) state.name.textContent = title;
    if (state.type) state.type.textContent = type;
    if (state.meta) state.meta.textContent = meta;
    if (state.price) state.price.textContent = formatPrice(item.price);
    if (state.cartLink) state.cartLink.href = 'cart.html';
    if (state.checkoutLink) state.checkoutLink.href = 'cart.html#order-btn';

    panel.hidden = false;
    if (state.settleTimer) clearTimeout(state.settleTimer);
    if (state.hideTimer) clearTimeout(state.hideTimer);

    panel.classList.remove('is-visible');
    // Restart entrance transition when another product is added.
    void panel.offsetWidth;
    panel.classList.add('is-visible');

    state.hideTimer = setTimeout(() => hideAddedPanel(), PANEL_AUTO_HIDE_MS);
  };

  const notifyItemAdded = (item) => {
    showAddedPanel(item);
    try {
      window.dispatchEvent(new CustomEvent('romix:cart-item-added', { detail: { item } }));
    } catch {
      /* ignore */
    }
  };

  const migrateFromLegacy = () => {
    for (const key of LEGACY_KEYS) {
      const legacy = readLocal(key);
      if (legacy.length) {
        const normalized = legacy
          .map((item) => normalizeItem(item))
          .filter(Boolean);
        persist(normalized);
        try {
          localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
        return normalized;
      }
    }
    return [];
  };

  const getCart = () => {
    const stored = readLocal(STORAGE_KEY);
    if (stored.length) {
      const normalized = stored.map((item) => normalizeItem(item)).filter(Boolean);
      persist(normalized);
      return normalized;
    }
    return migrateFromLegacy();
  };

  const saveCart = (cart) => {
    const normalized = (Array.isArray(cart) ? cart : [])
      .map((item) => normalizeItem(item))
      .filter(Boolean);
    const persisted = persist(normalized);
    lastSavePersisted = persisted;
    try {
      window.dispatchEvent(new CustomEvent('romix:cart-changed', { detail: { cart: normalized, persisted } }));
      if (!persisted) window.dispatchEvent(new CustomEvent('romix:cart-storage-error'));
    } catch {
      /* CustomEvent is optional in legacy browsers. */
    }
    return normalized;
  };

  const getCartTotals = (cart = getCart()) => {
    const totals = cart.reduce(
      (acc, item) => {
        const qty = Number(item.qty ?? item.quantity) || 0;
        const price = Number(item.price) || 0;
        acc.totalItems += qty;
        acc.totalPrice += qty * price;
        return acc;
      },
      { totalItems: 0, totalPrice: 0 },
    );
    return totals;
  };

  const addToCart = (product) => {
    const cart = getCart();
    const newItem = normalizeItem(product);
    if (!newItem) return cart;

    let addedItem = newItem;
    const existingIndex = cart.findIndex((item) => item.key === newItem.key);
    if (existingIndex >= 0) {
      const existing = cart[existingIndex];
      const qty = (Number(existing.qty) || Number(existing.quantity) || 0) + newItem.qty;
      cart[existingIndex] = {
        ...existing,
        ...newItem,
        qty,
        quantity: qty,
        subtotal: qty * newItem.price,
      };
      addedItem = cart[existingIndex];
    } else {
      cart.push(newItem);
      addedItem = newItem;
    }

    const saved = saveCart(cart);
    const persistedItem = saved.find((entry) => entry.key === addedItem.key) || addedItem;
    if (lastSavePersisted) notifyItemAdded(persistedItem);
    return saved;
  };

  const removeFromCart = (key) => {
    const filtered = getCart().filter((item) => item.key !== key);
    return saveCart(filtered);
  };

  const updateQty = (key, qty) => {
    const nextQty = Math.max(1, Number(qty) || 1);
    const updated = getCart().map((item) => {
      if (item.key !== key) return item;
      return {
        ...item,
        qty: nextQty,
        quantity: nextQty,
        subtotal: nextQty * (Number(item.price) || 0),
      };
    });
    return saveCart(updated);
  };

  const clearCart = () => saveCart([]);

  const updateBadge = (selector = '#cart-count') => {
    const badge = document.querySelector(selector);
    if (!badge) return;
    const { totalItems } = getCartTotals();
    badge.textContent = String(totalItems);
  };

  const decodeCartText = (value) => {
    if (value == null) return '';
    const text = String(value);
    try {
      return decodeURIComponent(text);
    } catch {
      return text;
    }
  };

  const buildWhatsAppMessage = (cart = getCart()) => {
    if (!Array.isArray(cart) || !cart.length) return '';
    let total = 0;
    const lines = cart.map((item) => {
      const qty = Number(item.qty ?? item.quantity) || 0;
      const price = Number(item.price) || 0;
      total += qty * price;
      const name = decodeCartText(item.name) || 'Producto';
      const type = decodeCartText(item.type);
      const color = decodeCartText(item.colorName ?? item.color);
      const size = decodeCartText(item.talle ?? item.size);
      const label = type ? `${name} (${type})` : name;
      const parts = [
        `- ${label}`,
        color ? `Color: ${color}` : '',
        size ? `Talle: ${size}` : '',
        `Cant: ${qty}`,
      ].filter(Boolean);
      return parts.join(' | ');
    });
    lines.push('', `Total: $${total.toFixed(2)}`);
    return encodeURIComponent(lines.join('\n'));
  };

  window.romixCart = {
    STORAGE_KEY,
    getCart,
    saveCart,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    getCartTotals,
    buildKey,
    buildWhatsAppMessage,
    updateBadge,
    getStatus() { return { persisted: lastSavePersisted }; },
  };

  // Backwards-compatible helpers for existing inline code
  window.safeGetCart = getCart;
  window.safeSetCart = saveCart;
  window.updateCartCount = updateBadge;

  document.addEventListener('DOMContentLoaded', () => {
    updateBadge();
    ensurePanel();
  });

  window.addEventListener('storage', (event) => {
    if (event && event.key === STORAGE_KEY) updateBadge();
  });
  window.addEventListener('romix:cart-changed', () => updateBadge());
})();
