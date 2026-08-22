(() => {
  const CACHE_KEY = 'romixProductsCacheV3';
  const CACHE_TTL_MS = 60 * 1000;
  const DATA_URL = 'assets/data/products.json';
  const DEFAULT_API_ORIGIN = 'https://projecto-drth.onrender.com';
  const BLOCKED_SEASON_KEY = 'verano';

  let memoryCache = null;
  let inFlight = null;

  function normalizeText(value) {
    const raw = value == null ? '' : String(value).trim();
    if (!raw) return '';
    try {
      return raw.normalize('NFD').replace(/\p{Diacritic}+/gu, '').toLowerCase();
    } catch {
      return raw.toLowerCase();
    }
  }

  function seasonKey(product) {
    const fromSeason = normalizeText(product && product.season).replace(/[^a-z0-9]+/g, '');
    if (fromSeason.includes('verano')) return 'verano';
    if (fromSeason.includes('invierno')) return 'invierno';
    if (fromSeason === 'mediaestacion') return 'media-estacion';

    const fromSeasonKey = normalizeText(product && product.seasonKey).replace(/[^a-z0-9-]+/g, '');
    if (fromSeasonKey.includes('verano')) return 'verano';
    if (fromSeasonKey.includes('invierno')) return 'invierno';
    if (fromSeasonKey.replace(/-/g, '') === 'mediaestacion') return 'media-estacion';
    return '';
  }

  function localShouldHideProduct(product) {
    if (!product || typeof product !== 'object') return false;
    if (product.hidden === true || product.hide === true || product.oculto === true) return true;

    if (Object.prototype.hasOwnProperty.call(product, 'visible')) {
      const visible = normalizeText(product.visible);
      if (visible === 'false' || visible === '0' || visible === 'no') return true;
    }

    if (Object.prototype.hasOwnProperty.call(product, 'active')) {
      const active = normalizeText(product.active);
      if (active === 'false' || active === '0' || active === 'no') return true;
    }

    const state = normalizeText(product.visibility || product.state || product.publish);
    if (['hidden', 'oculto', 'draft', 'archived', 'inactive', 'inactivo'].includes(state)) return true;
    return seasonKey(product) === BLOCKED_SEASON_KEY;
  }

  function shouldHideProduct(product) {
    if (typeof window.shouldHideProduct === 'function') {
      try {
        if (window.shouldHideProduct(product)) return true;
      } catch {}
    }
    return localShouldHideProduct(product);
  }

  function sanitizeList(list) {
    const source = Array.isArray(list) ? list : [];
    const base = typeof window.sanitizeList === 'function' ? window.sanitizeList(source) : source;
    return (Array.isArray(base) ? base : []).filter((item) => !shouldHideProduct(item));
  }

  function parseJsonText(text) {
    return JSON.parse(String(text || '').replace(/^\uFEFF/, ''));
  }

  function now() {
    return Date.now();
  }

  function readSessionCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.list) || typeof parsed.timestamp !== 'number') return null;
      if ((now() - parsed.timestamp) > CACHE_TTL_MS) return null;
      return sanitizeList(parsed.list);
    } catch {
      return null;
    }
  }

  function writeSessionCache(list) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: now(), list: Array.isArray(list) ? list : [] }));
    } catch {}
  }

  function fromPreloaded(options) {
    const opts = options || {};
    if (Array.isArray(opts.preloaded) && opts.preloaded.length) return sanitizeList(opts.preloaded);
    if (!opts.preloadedScriptId) return null;
    try {
      const el = document.getElementById(opts.preloadedScriptId);
      if (!el) return null;
      const raw = (el.textContent || el.innerText || '').trim();
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return sanitizeList(Array.isArray(parsed) ? parsed : []);
    } catch {
      return null;
    }
  }

  function apiCandidates(options) {
    const opts = options || {};
    const configuredOrigin = String(opts.apiOrigin || window.ROMIX_API_URL || DEFAULT_API_ORIGIN || '').replace(/\/+$/, '');
    const urls = ['/api/public/catalog'];
    if (configuredOrigin && configuredOrigin !== location.origin) urls.push(`${configuredOrigin}/api/public/catalog`);
    urls.push('/api/products');
    return [...new Set(urls)];
  }

  async function fetchApiProducts(options) {
    for (const url of apiCandidates(options)) {
      try {
        const response = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!response.ok) continue;
        const list = sanitizeList(await response.json());
        if (list.length) return list;
      } catch (error) {
        console.warn('[products-store] API no disponible en ' + url, error);
      }
    }
    return null;
  }

  async function fetchProducts(options) {
    const opts = options || {};
    const dataUrl = new URL(opts.dataUrl || DATA_URL, location.href);

    if (opts.useApi !== false) {
      const apiList = await fetchApiProducts(opts);
      if (apiList && apiList.length) {
        writeSessionCache(apiList);
        return apiList;
      }
    }

    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error('No se pudo cargar products.json (' + response.status + ') desde ' + dataUrl.href);
    const text = await response.text();
    let parsed;
    try {
      parsed = parseJsonText(text);
    } catch (error) {
      console.error('[products-store] JSON invalido en ' + dataUrl.href, error);
      throw error;
    }
    const fileList = sanitizeList(Array.isArray(parsed) ? parsed : []);
    writeSessionCache(fileList);
    return fileList;
  }

  async function load(options) {
    const opts = options || {};
    const force = opts.force === true;

    if (!force && memoryCache && memoryCache.length) return memoryCache;

    // En produccion priorizamos API para que los cambios del Admin aparezcan enseguida.
    // El preload historico queda como fallback cuando se pide explicitamente useApi=false.
    if (!force && opts.useApi === false) {
      const preloaded = fromPreloaded(opts);
      if (preloaded && preloaded.length) {
        memoryCache = preloaded;
        writeSessionCache(memoryCache);
        return memoryCache;
      }
    }

    if (!force) {
      const sessionCached = readSessionCache();
      if (sessionCached && sessionCached.length) {
        memoryCache = sessionCached;
        return memoryCache;
      }
    }

    if (!force && inFlight) return inFlight;

    inFlight = fetchProducts(opts)
      .then((list) => {
        memoryCache = sanitizeList(list);
        return memoryCache;
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  }

  window.romixProductsStore = {
    load,
    clear() {
      memoryCache = null;
      inFlight = null;
      try { sessionStorage.removeItem(CACHE_KEY); } catch {}
    }
  };
})();
