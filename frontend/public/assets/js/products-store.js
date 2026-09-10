(() => {
  const CACHE_VERSION = 6;
  const CACHE_KEY = `romixProductsCacheV${CACHE_VERSION}`;
  const LEGACY_CACHE_KEYS = ['romixProductsCacheV5'];
  const CACHE_TTL_MS = 30 * 60 * 1000;
  const DATA_URL = 'assets/data/products.json';
  const pricing = window.romixPricing || {};

  let memoryCache = null;
  let inFlight = null;
  let loadStatus = { source: 'none', stale: false, errors: [] };

  function normalizeText(value) {
    const raw = value == null ? '' : String(value).trim();
    if (!raw) return '';
    try {
      return raw.normalize('NFD').replace(/\p{Diacritic}+/gu, '').toLowerCase();
    } catch {
      return raw.toLowerCase();
    }
  }

  function fileToken(value) {
    return normalizeText(value)
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function cleanPath(value) {
    return String(value || '').trim().split(/[?#]/)[0];
  }

  function deriveColorImage(product, colorName) {
    if (!product || !product.imageBase) return '';
    const base = String(product.imageBase || '').trim().replace(/^\/+|\/+$/g, '');
    const color = fileToken(colorName);
    if (!base || !color) return '';
    const ext = String(product.imageExt || 'png').trim().replace(/^\./, '') || 'png';
    const dir = String(product.imageDir || 'images/products').trim().replace(/^\/+|\/+$/g, '') || 'images/products';
    return `${dir}/${base}_${color}.${ext}`;
  }

  function deriveThumbPath(imagePath) {
    const src = cleanPath(imagePath);
    if (!src || /^data:/i.test(src) || /^https?:\/\//i.test(src)) return '';
    const inProducts = src.includes('images/products/')
      ? src.replace('images/products/', 'images/thumbs/')
      : src;
    return inProducts.replace(/(\.[^./]+)$/i, '-thumb.webp');
  }

  function imageForColor(product, color, index) {
    const source = color && typeof color === 'object' ? color : { name: color };
    const directList = [
      source.images,
      source.imagenes,
      source.gallery,
      source.galeria,
      source.photos,
      source.fotos
    ].find((value) => Array.isArray(value) && value.length);
    if (directList && directList[0]) return cleanPath(directList[0]);

    const direct = cleanPath(source.image || source.imagen);
    if (direct) return direct;

    const colorName = String(source.name || source.value || '').trim();
    const imageMap = product && product.imageMap && typeof product.imageMap === 'object' && !Array.isArray(product.imageMap)
      ? product.imageMap
      : null;
    if (imageMap && colorName) {
      if (cleanPath(imageMap[colorName])) return cleanPath(imageMap[colorName]);
      const target = normalizeText(colorName);
      const key = Object.keys(imageMap).find((entry) => normalizeText(entry) === target);
      if (key && cleanPath(imageMap[key])) return cleanPath(imageMap[key]);
    }

    const derived = deriveColorImage(product, colorName);
    if (derived) return derived;

    if (Array.isArray(product && product.images) && product.images[index]) {
      return cleanPath(product.images[index]);
    }

    return cleanPath(product && product.image);
  }

  function normalizeSizes(sizes) {
    return (Array.isArray(sizes) ? sizes : []).map((entry) => {
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const size = String(entry.size ?? entry.value ?? '').trim();
        if (!size) return null;
        return Object.assign({}, entry, {
          size,
          status: String(entry.status || 'unknown').trim() || 'unknown'
        });
      }

      const size = String(entry ?? '').trim();
      return size ? { size, status: 'unknown' } : null;
    }).filter(Boolean);
  }

  function normalizeProductShape(product) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) return product;

    const normalized = Object.assign({}, product);
    if (typeof pricing.getCurrentPrice === 'function') {
      const currentPrice = pricing.getCurrentPrice(product);
      const originalPrice = pricing.getOriginalPrice(product);
      if (currentPrice > 0) normalized.price = currentPrice;
      if (originalPrice > 0) normalized.originalPrice = originalPrice;
    }
    normalized.sizes = normalizeSizes(product.sizes);

    const rawColors = Array.isArray(product.colors)
      ? product.colors
      : (product.colors && typeof product.colors === 'object' ? Object.values(product.colors) : []);

    normalized.colors = rawColors.map((entry, index) => {
      const color = entry && typeof entry === 'object'
        ? Object.assign({}, entry)
        : { name: String(entry || '').trim() };
      const name = String(color.name || color.value || `Color ${index + 1}`).trim();
      const image = imageForColor(product, color, index);
      if (image && !color.image) color.image = image;
      color.name = name;
      return color;
    });

    const generatedMap = {};
    const generatedImages = [];
    normalized.colors.forEach((color, index) => {
      const image = imageForColor(normalized, color, index);
      if (!image) return;
      generatedMap[color.name] = image;
      if (!generatedImages.includes(image)) generatedImages.push(image);
    });

    if (!normalized.imageMap || typeof normalized.imageMap !== 'object' || Array.isArray(normalized.imageMap)) {
      normalized.imageMap = generatedMap;
    }

    if (!Array.isArray(normalized.images) || !normalized.images.length) {
      normalized.images = generatedImages;
    }

    if (!cleanPath(normalized.image)) {
      normalized.image = generatedImages[0] || '';
    }

    if (!cleanPath(normalized.thumbnail) && normalized.image) {
      normalized.thumbnail = deriveThumbPath(normalized.image);
    }

    if (!cleanPath(normalized.thumbnailFallback) && normalized.image) {
      normalized.thumbnailFallback = normalized.image;
    }

    return normalized;
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

  function isVisibleProduct(product) {
    if (!product || typeof product !== 'object') return false;
    return product.visible !== false;
  }

  function localShouldHideProduct(product) {
    return !isVisibleProduct(product);
  }

  function shouldHideProduct(product) {
    return localShouldHideProduct(product);
  }

  function sanitizeList(list) {
    const source = Array.isArray(list) ? list : [];
    const base = typeof window.sanitizeProduct === 'function'
      ? source.map((item) => window.sanitizeProduct(item))
      : source;
    return (Array.isArray(base) ? base : [])
      .map(normalizeProductShape)
      .filter((item) => !shouldHideProduct(item));
  }

  function parseJsonText(text) {
    const cleaned = String(text || '').replace(/^\uFEFF/, '');
    return JSON.parse(cleaned);
  }

  function now() {
    return Date.now();
  }

  function readSessionCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.version !== CACHE_VERSION) return null;
      if (!parsed || !Array.isArray(parsed.list)) return null;
      if (typeof parsed.timestamp !== 'number') return null;
      if ((now() - parsed.timestamp) > CACHE_TTL_MS) return null;
      return {
        list: sanitizeList(parsed.list),
        source: String(parsed.source || 'cache')
      };
    } catch {
      return null;
    }
  }

  function writeSessionCache(list, source) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        version: CACHE_VERSION,
        timestamp: now(),
        source: String(source || 'unknown'),
        list: Array.isArray(list) ? list : []
      }));
    } catch {}
  }

  function fromPreloaded(options) {
    const opts = options || {};
    if (Array.isArray(opts.preloaded) && opts.preloaded.length) {
      return sanitizeList(opts.preloaded);
    }
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

  async function fetchProducts(options) {
    const opts = options || {};
    const dataUrl = new URL(opts.dataUrl || DATA_URL, location.href);
    const errors = [];

    if (opts.useApi !== false) {
      try {
        const apiRes = await fetch('/api/products', { cache: 'no-cache' });
        if (!apiRes.ok) throw new Error(`API products respondió ${apiRes.status}`);
        const payload = await apiRes.json();
        if (!Array.isArray(payload)) throw new Error('API products devolvió un formato inválido');
        const apiList = sanitizeList(payload);
        writeSessionCache(apiList, 'api');
        loadStatus = { source: 'api', stale: false, errors: [] };
        return apiList;
      } catch (error) {
        errors.push(error);
      }
    }

    try {
      const response = await fetch(dataUrl, { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error('No se pudo cargar products.json (' + response.status + ') desde ' + dataUrl.href);
      }
      const text = await response.text();
      let parsed;
      try {
        parsed = parseJsonText(text);
      } catch (error) {
        console.error('[products-store] JSON inválido en ' + dataUrl.href, error);
        throw error;
      }
      if (!Array.isArray(parsed)) throw new Error('products.json no contiene una lista');
      const fileList = sanitizeList(parsed);
      writeSessionCache(fileList, 'json');
      loadStatus = { source: 'json', stale: false, errors: errors.map(String) };
      return fileList;
    } catch (error) {
      errors.push(error);
    }

    const cached = readSessionCache();
    if (cached) {
      loadStatus = { source: cached.source, stale: true, errors: errors.map(String) };
      console.warn('[products-store] Red no disponible; se usa el último catálogo validado.', errors[errors.length - 1]);
      return cached.list;
    }

    const combined = new Error('No se pudo cargar el catálogo desde API, JSON ni caché.');
    combined.causes = errors;
    throw combined;
  }

  async function load(options) {
    const opts = options || {};
    const force = opts.force === true;

    if (!force && memoryCache !== null) return memoryCache;

    if (!force && inFlight) return inFlight;

    inFlight = fetchProducts(opts)
      .catch((error) => {
        const preloaded = fromPreloaded(opts);
        if (preloaded) {
          loadStatus = { source: 'preloaded', stale: true, errors: [String(error)] };
          return preloaded;
        }
        throw error;
      })
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
    normalizeProduct: normalizeProductShape,
    isVisible: isVisibleProduct,
    getStatus() {
      return Object.assign({}, loadStatus, { errors: loadStatus.errors.slice() });
    },
    clear() {
      memoryCache = null;
      inFlight = null;
      try { sessionStorage.removeItem(CACHE_KEY); } catch {}
    }
  };

  try {
    LEGACY_CACHE_KEYS.forEach((key) => sessionStorage.removeItem(key));
  } catch {}
})();
