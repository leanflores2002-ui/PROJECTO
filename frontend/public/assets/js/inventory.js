(() => {
  const STORAGE_KEY = 'romixVariantStock';
  const DEFAULT_COLOR = 'Unico';
  const DEFAULT_SIZE = 'U';
  const STOCK_UNKNOWN = 'unknown';
  let inventoryMapCache = null;
  let syncState = { authoritative: false, status: 'idle', error: null, syncedAt: 0 };

  function normalize(value) {
    if (!value) return '';
    try {
      return value.toString().normalize('NFD').replace(/\p{Diacritic}+/gu, '').toLowerCase().trim();
    } catch {
      return value.toString().toLowerCase().trim();
    }
  }

  function buildKey(productId, color, size) {
    return [String(productId || ''), normalize(color), normalize(size)].join('|');
  }

  function sanitizeVariant(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const productId = String(entry.productId ?? entry.product_id ?? entry.pid ?? entry.slug ?? '').trim();
    const color = String(entry.color ?? entry.colorName ?? DEFAULT_COLOR).trim() || DEFAULT_COLOR;
    const size = String(entry.size ?? entry.talle ?? DEFAULT_SIZE).trim() || DEFAULT_SIZE;
    const stockValue = Number(entry.stock ?? entry.quantity ?? 0);
    const stock = Number.isFinite(stockValue) ? Math.max(0, Math.floor(stockValue)) : 0;
    return { productId, color, size, stock };
  }

  function loadStorageList() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function buildInventoryMap() {
    if (inventoryMapCache) return new Map(inventoryMapCache);
    const map = new Map();
    loadStorageList().forEach((item) => {
      const variant = sanitizeVariant(item);
      if (!variant) return;
      const key = buildKey(variant.productId, variant.color, variant.size);
      map.set(key, variant);
    });
    inventoryMapCache = map;
    return map;
  }

  function getInventory() {
    return Array.from(buildInventoryMap().values());
  }

  function saveInventory(inventory) {
    const map = new Map();
    (Array.isArray(inventory) ? inventory : []).forEach((entry) => {
      const variant = sanitizeVariant(entry);
      if (!variant) return;
      const key = buildKey(variant.productId, variant.color, variant.size);
      map.set(key, variant);
    });
    const list = Array.from(map.values());
    inventoryMapCache = map;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
    return list;
  }

  function getStock(productId, color, size) {
    if (!syncState.authoritative) return STOCK_UNKNOWN;
    const map = buildInventoryMap();
    const key = buildKey(productId, color, size);
    const variant = map.get(key);
    if (!variant || !Number.isFinite(Number(variant.stock))) {
      return STOCK_UNKNOWN;
    }
    return Number(variant.stock);
  }

  function normalizeUpdateEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const productId = String(entry.productId ?? entry.pid ?? entry.id ?? entry.slug ?? '').trim();
    const color = String(entry.color ?? entry.colorName ?? DEFAULT_COLOR).trim() || DEFAULT_COLOR;
    const size = String(entry.size ?? entry.talle ?? DEFAULT_SIZE).trim() || DEFAULT_SIZE;
    const qtyValue = Number(entry.qty ?? entry.quantity ?? 0);
    const qty = Number.isFinite(qtyValue) ? Math.max(0, Math.floor(qtyValue)) : 0;
    if (!productId || qty <= 0) return null;
    return { productId, color, size, qty };
  }

  function updateStock(items) {
    const plan = (Array.isArray(items) ? items : [])
      .map(normalizeUpdateEntry)
      .filter(Boolean);
    if (!syncState.authoritative) {
      return { success: true, warnings: ['El stock no fue confirmado por el servidor; no se modificó la caché local.'], inventory: getInventory() };
    }
    if (!plan.length) {
      return { success: true, warnings: [], inventory: getInventory() };
    }
    const map = buildInventoryMap();
    const stockPlan = new Map();
    map.forEach((variant, key) => {
      const parsedStock = Number(variant.stock);
      const currentStock = Number.isFinite(parsedStock) ? parsedStock : variant.stock;
      stockPlan.set(key, currentStock);
    });
    const warnings = [];
    plan.forEach((update) => {
      const key = buildKey(update.productId, update.color, update.size);
      if (!stockPlan.has(key)) {
        warnings.push(`Stock desconocido para ${update.productId} - ${update.color} / ${update.size}.`);
        return;
      }
      const available = Number(stockPlan.get(key));
      if (!Number.isFinite(available)) {
        warnings.push(`Stock desconocido para ${update.productId} - ${update.color} / ${update.size}.`);
        return;
      }
      const nextStock = available - update.qty;
      if (nextStock < 0) {
        warnings.push(`No se pudo descontar stock de ${update.productId} - ${update.color} / ${update.size}.`);
        return;
      }
      stockPlan.set(key, nextStock);
    });
    const updated = [];
    map.forEach((variant, key) => {
      updated.push({ ...variant, stock: stockPlan.get(key) ?? variant.stock });
    });
    return { success: warnings.length === 0, warnings, inventory: updated };
  }

  function mergeUpdates(updatedVariants, options) {
    const map = buildInventoryMap();
    (Array.isArray(updatedVariants) ? updatedVariants : []).forEach((variant) => {
      const normalized = sanitizeVariant(variant);
      if (!normalized) return;
      const key = buildKey(normalized.productId, normalized.color, normalized.size);
      map.set(key, normalized);
    });
    saveInventory(Array.from(map.values()));
    if (options && options.authoritative) {
      syncState = { authoritative: true, status: 'ready', error: null, syncedAt: Date.now() };
    }
  }

  async function syncFromApi() {
    syncState = { authoritative: false, status: 'loading', error: null, syncedAt: 0 };
    if (typeof fetch !== 'function') {
      syncState = { authoritative: false, status: 'unavailable', error: 'Fetch no disponible', syncedAt: 0 };
      return { ok: false, error: new Error('Fetch no disponible') };
    }
    try {
      const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(4000)
        : undefined;
      const res = await fetch('/api/variants', { cache: 'no-store', signal });
      if (!res.ok) throw new Error(`API variants respondió ${res.status}`);
      const list = await res.json();
      if (!Array.isArray(list)) throw new Error('API variants devolvió un formato inválido');
      inventoryMapCache = new Map();
      mergeUpdates(list, { authoritative: true });
      return { ok: true, count: list.length };
    } catch (error) {
      inventoryMapCache = null;
      syncState = { authoritative: false, status: 'unavailable', error: String(error), syncedAt: 0 };
      console.warn('[inventory] Stock remoto no disponible; se mostrará disponibilidad a confirmar.', error);
      return { ok: false, error };
    }
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', (event) => {
      if (event && event.key === STORAGE_KEY) {
        inventoryMapCache = null;
        syncState = { authoritative: false, status: 'idle', error: null, syncedAt: 0 };
      }
    });
  }

  window.romixInventory = {
    getInventory,
    saveInventory,
    updateStock,
    getStock,
    mergeUpdates,
    syncFromApi,
    getStatus() { return Object.assign({}, syncState); },
    STOCK_UNKNOWN,
  };
})();
