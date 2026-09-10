(function () {
  const DATA_URL = "assets/data/products.json";
  const PLACEHOLDER = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="540" height="700"><rect width="100%" height="100%" fill="#fff7fb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#b7a6af" font-family="Segoe UI, Arial" font-size="24">ROMIX</text></svg>');
  const COLOR_LIMIT = 8;
  const SIZE_BASE = ["1", "2", "3", "4", "5", "6"];
  const imageUtils = window.romixImageUtils || {};
  const pricing = window.romixPricing || {};
  const cardImageSize = imageUtils.dimensions && imageUtils.dimensions.productCard
    ? imageUtils.dimensions.productCard
    : { width: 720, height: 960 };
  const CARD_IMAGE_SIZES = "(max-width: 640px) calc(50vw - 22px), (max-width: 960px) calc(50vw - 28px), (max-width: 1200px) calc(33vw - 26px), 280px";

  const PAGE_CONFIG = {
    mujer: { title: "Mujer", label: "Mujer" },
    hombre: { title: "Hombre", label: "Hombre" },
    ninos: { title: "Niños", label: "Niños" },
    novedades: { title: "Novedades", label: null },
    catalogo: { title: "Catalogo", label: null }
  };

  const SECTION_OPTIONS = [
    { key: "mujer", label: "Mujer" },
    { key: "hombre", label: "Hombre" },
    { key: "ninos", label: "Niños" }
  ];

  const CATEGORY_OPTIONS = [
    { key: "buzos", label: "Buzos" },
    { key: "calzas", label: "Calzas" },
    { key: "camperas", label: "Camperas" },
    { key: "palazos", label: "Palazos" },
    { key: "pantalones", label: "Pantalones" },
    { key: "remeras", label: "Remeras" },
    { key: "tops", label: "Tops" }
  ];

  const SEASON_OPTIONS = [
    { key: "media-estacion", label: "Media estación" },
    { key: "invierno", label: "Invierno" },
    { key: "verano", label: "Verano" }
  ];

  const SORT_OPTIONS = [
    { key: "recommended", label: "Recomendados" },
    { key: "price-asc", label: "Menor a mayor precio" },
    { key: "price-desc", label: "Mayor a menor precio" }
  ];

  const NINO_AUDIENCE_PRODUCT_SLUGS = new Set([
    "campera-frizada-algodon-nino",
    "pantalon-frizado-algodon-premium-nino-recto",
    "pantalon-algodon-rustico-chico",
    "camiseta-termica-de-nino"
  ]);

  const STOCK_META = {
    unknown: { label: "Consultar disponibilidad", css: "status-unknown" },
    available: { label: "Disponible", css: "status-available" },
    low: { label: "Por agotarse", css: "status-low" },
    out: { label: "Sin stock", css: "status-out" }
  };

  const COLOR_DEFINITIONS = [
    { key: "multicolor", label: "Multicolor", hex: "#f7c948", aliases: ["multicolor", "estampado", "estampada", "print", "floreado"] },
    { key: "negro", label: "Negro", hex: "#000000", aliases: ["negro", "black", "hex", "name"] },
    { key: "blanco", label: "Blanco", hex: "#ffffff", aliases: ["blanco", "white"] },
    { key: "azul", label: "Azul", hex: "#007bff", aliases: ["azul", "azul jaspeado", "azul oscuro", "azul marino", "francia"] },
    { key: "rosa", label: "Rosa", hex: "#ff69b4", aliases: ["rosa", "fucsia"] },
    { key: "verde", label: "Verde", hex: "#28a745", aliases: ["verde", "verde jaspeado"] },
    { key: "rojo", label: "Rojo", hex: "#dc3545", aliases: ["rojo", "rojo jaspeado"] },
    { key: "morado", label: "Violeta", hex: "#6f42c1", aliases: ["violeta", "morado", "purpura"] },
    { key: "naranja", label: "Naranja", hex: "#fd7e14", aliases: ["naranja"] },
    { key: "amarillo", label: "Amarillo", hex: "#ffc107", aliases: ["amarillo"] },
    { key: "marron", label: "Marron", hex: "#795548", aliases: ["marron", "chocolate", "caqui"] },
    { key: "gris", label: "Gris", hex: "#adb5bd", aliases: ["gris", "gris jaspeado", "gris oscuro", "gris medio"] },
    { key: "otros", label: "Otros", hex: "#b9b2b8", aliases: [] }
  ];

  const RAW_COLOR_FALLBACK_HEX = {
    negro: "#000000",
    blanco: "#ffffff",
    gris: "#9aa0a6",
    "gris oscuro": "#4b4b4b",
    "gris melange": "#a9a9a9",
    "azul marino": "#0b1f5b",
    azul: "#1f4f9f",
    "azul francia": "#2f4ee8",
    rojo: "#c0392b",
    bordo: "#7a1b2a",
    verde: "#2e7d32",
    "verde oscuro": "#2f5f3f",
    fucsia: "#d91a78",
    rosa: "#ff8ab9",
    salmon: "#f28f82",
    lila: "#9f86c0",
    violeta: "#7b5ba1",
    camel: "#ba8a4f",
    beige: "#c9b79f",
    marron: "#6f4f37"
  };

  const state = {
    scope: "catalogo",
    products: [],
    view: [],
    compactVariantViewport: window.innerWidth <= 768,
    sortBy: "recommended",
    searchQueryRaw: "",
    searchQueryNorm: "",
    searchTokens: [],
    searchAnyTokens: [],
    searchExcludeTokens: [],
    selected: {
      audiences: new Set(),
      sections: new Set(),
      colors: new Set(),
      categories: new Set(),
      types: new Set(),
      seasons: new Set(),
      sizes: new Set()
    },
    optionLabels: {
      audiences: new Map(),
      sections: new Map(),
      colors: new Map(),
      categories: new Map(),
      types: new Map(),
      seasons: new Map(),
      sizes: new Map()
    },
    showAllColors: false,
    showAllSizes: false,
    sizeValues: [],
    visibleCount: window.innerWidth <= 768 ? 8 : 12
  };
  let filterLastFocus = null;

  function isCompactVariantViewport() {
    return window.innerWidth <= 768;
  }

  function getInitialVisibleProducts() {
    return window.innerWidth <= 768 ? 8 : 12;
  }

  function getLoadMoreStep() {
    return window.innerWidth <= 768 ? 8 : 12;
  }

  function getCardImagePriority(index) {
    if (window.innerWidth <= 768) {
      return index < 2
        ? { loading: "eager", fetchpriority: "high" }
        : { loading: "lazy", fetchpriority: "low" };
    }

    return index < 4
      ? { loading: "eager", fetchpriority: "high" }
      : { loading: "lazy", fetchpriority: "low" };
  }

  function stripAccents(value) {
    const raw = value == null ? "" : String(value);
    try {
      return raw.normalize("NFD").replace(/\p{Diacritic}+/gu, "");
    } catch (_error) {
      return raw;
    }
  }

  function normalizeText(value) {
    return stripAccents(value).toLowerCase().trim();
  }

  function resolveColorDefinitionByKey(key) {
    return COLOR_DEFINITIONS.find((entry) => entry.key === key) || COLOR_DEFINITIONS[COLOR_DEFINITIONS.length - 1];
  }

  function normalizeColorToFilterKey(value) {
    const key = normalizeText(value);
    if (!key) return "otros";

    if (key.includes("estamp") || key.includes("print") || key.includes("floread") || key.includes("multicolor")) {
      return "multicolor";
    }

    for (const definition of COLOR_DEFINITIONS) {
      if (!Array.isArray(definition.aliases) || !definition.aliases.length) continue;
      const match = definition.aliases.some((alias) => {
        const aliasKey = normalizeText(alias);
        if (!aliasKey) return false;
        return key === aliasKey || key.includes(aliasKey);
      });
      if (match) return definition.key;
    }

    return "otros";
  }

  function setOptionLabel(group, value, label) {
    const target = state.optionLabels[group];
    if (!target) return;
    target.set(String(value || ""), String(label || value || ""));
  }

  function getOptionLabel(group, value) {
    const target = state.optionLabels[group];
    const key = String(value || "");
    if (target && target.has(key)) return target.get(key);
    if (group === "audiences") {
      if (key === "nina") return "Niña";
      if (key === "nino") return "Niño";
    }
    if (group === "sizes") return key;
    return titleCase(key);
  }

  function getActiveFilters() {
    const result = [];
    Object.keys(state.selected).forEach((group) => {
      state.selected[group].forEach((value) => {
        result.push({
          group,
          value,
          label: getOptionLabel(group, value)
        });
      });
    });
    return result;
  }

  function slugify(value) {
    return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "producto";
  }

  function titleCase(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function toStartCase(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    return text
      .split(/[\s\-_]+/)
      .filter(Boolean)
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(" ");
  }

  function formatPrice(value) {
    const amount = Number(value || 0);
    return "$" + amount.toLocaleString("es-AR");
  }

  function parseJsonText(text) {
    const cleaned = String(text || "").replace(/^\uFEFF/, "");
    return JSON.parse(cleaned);
  }

  function normalizeSection(value) {
    const key = normalizeText(value);
    if (["mujer", "mujeres", "dama", "damas"].includes(key)) return "mujer";
    if (["hombre", "hombres", "caballero", "caballeros"].includes(key)) return "hombre";
    if (["ninos", "ninas", "nino", "nina", "ninos y ninas", "nino y nina"].includes(key)) return "ninos";
    return key || "catalogo";
  }

  function sectionLabel(sectionKey) {
    if (sectionKey === "mujer") return "Mujer";
    if (sectionKey === "hombre") return "Hombre";
    if (sectionKey === "ninos") return "Ninos";
    return "Catalogo";
  }

  function normalizeSeason(value, fallbackName) {
    const key = normalizeText(value);
    if (key.includes("media")) return "media-estacion";
    if (key.includes("invierno")) return "invierno";
    if (key.includes("verano")) return "verano";

    const nameKey = normalizeText(fallbackName);
    if (nameKey.includes("termic") || nameKey.includes("frizado") || nameKey.includes("corder")) {
      return "invierno";
    }
    return "media-estacion";
  }

  function categoryKeyFromType(typeValue) {
    const key = normalizeText(typeValue);
    if (!key) return "";
    if (key.includes("buzo")) return "buzos";
    if (key.includes("calza")) return "calzas";
    if (key.includes("campera")) return "camperas";
    if (key.includes("palazo")) return "palazos";
    if (key.includes("pantalon") || key.includes("babucha") || key.includes("jogger")) return "pantalones";
    if (key.includes("remera") || key.includes("camiseta") || key.includes("musculosa") || key.includes("sudadera")) return "remeras";
    if (key.includes("top")) return "tops";
    return key;
  }

  function normalizeCategoryFilterValue(value) {
    const key = normalizeText(value);
    if (!key) return "";
    if (key.includes("buzo")) return "buzos";
    if (key.includes("calza")) return "calzas";
    if (key.includes("campera")) return "camperas";
    if (key.includes("palazo")) return "palazos";
    if (key.includes("pantalon") || key.includes("babucha") || key.includes("jogger") || key.includes("short")) return "pantalones";
    if (key.includes("remera") || key.includes("camiseta") || key.includes("musculosa") || key.includes("sudadera") || key.includes("conjunto") || key.includes("deporte")) return "remeras";
    if (key.includes("top")) return "tops";
    return categoryKeyFromType(key);
  }

  function normalizeTypeFilterValue(value) {
    return normalizeText(value).replace(/\s+/g, " ").trim();
  }

  function normalizeSeasonFilterValue(value) {
    const key = normalizeText(value);
    if (!key) return "";
    if (key.includes("verano")) return "verano";
    if (key.includes("invierno")) return "invierno";
    if (key.includes("media")) return "media-estacion";
    if (key.includes("estacion")) return "media-estacion";
    if (key.includes("entretiempo")) return "media-estacion";
    return "";
  }

  function normalizeSectionFilterValue(value) {
    const key = normalizeSection(value);
    if (key === "mujer" || key === "hombre" || key === "ninos") return key;
    return "";
  }

  function normalizeAudienceFilterValue(value) {
    const key = normalizeText(value);
    if (key === "nino" || key === "nina") return key;
    return "";
  }

  function normalizeSizeFilterValue(value) {
    const raw = normalizeText(value)
      .replace(/\banos?\b/g, "")
      .replace(/\baños?\b/g, "")
      .trim();
    if (!raw) return "";
    const match = raw.match(/\d+/);
    if (match && match[0]) return match[0];
    return raw.replace(/\s+/g, " ");
  }

  function tokenizeSearch(value) {
    return normalizeText(value).split(/[^a-z0-9]+/).filter(Boolean);
  }

  function compactSearch(value) {
    return normalizeText(value).replace(/[^a-z0-9]+/g, "");
  }

  function readInitialSearchQuery() {
    let params = null;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (_error) {
      return "";
    }

    const raw = params.get("q") || params.get("query") || params.get("search") || "";
    return String(raw || "").trim();
  }

  function readInitialSortKey() {
    let params = null;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (_error) {
      return "recommended";
    }

    const requested = normalizeText(params.get("sort") || params.get("order") || "recommended");
    const aliases = {
      recomendados: "recommended",
      recomendado: "recommended",
      recommended: "recommended",
      "price-asc": "price-asc",
      "price-desc": "price-desc"
    };
    const normalized = aliases[requested] || requested;
    return SORT_OPTIONS.some((entry) => entry.key === normalized) ? normalized : "recommended";
  }

  function readInitialSearchAnyTokens() {
    let params = null;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (_error) {
      return [];
    }

    const tokens = [];
    ["q_any", "any", "keywords", "tags"].forEach((param) => {
      params.getAll(param).forEach((value) => {
        String(value || "")
          .split(/[,\|;]+/)
          .map((token) => normalizeText(token))
          .filter(Boolean)
          .forEach((token) => tokens.push(token));
      });
    });

    return Array.from(new Set(tokens));
  }

  function readInitialSearchExcludeTokens() {
    let params = null;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (_error) {
      return [];
    }

    const tokens = [];
    ["q_not", "exclude", "exclude_keywords", "exclude_tags"].forEach((param) => {
      params.getAll(param).forEach((value) => {
        String(value || "")
          .split(/[,\|;]+/)
          .map((token) => normalizeText(token))
          .filter(Boolean)
          .forEach((token) => tokens.push(token));
      });
    });

    return Array.from(new Set(tokens));
  }

  function readInitialCategoryFilterKeys() {
    let params = null;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (_error) {
      return [];
    }

    const keys = [];
    ["categories", "categoria", "categorias", "category", "cat"].forEach((param) => {
      params.getAll(param).forEach((value) => {
        String(value || "")
          .split(",")
          .map((token) => token.trim())
          .filter(Boolean)
          .forEach((token) => {
            const normalized = normalizeCategoryFilterValue(token);
            if (normalized) keys.push(normalized);
          });
      });
    });

    return Array.from(new Set(keys));
  }

  function readInitialTypeFilterKeys() {
    let params = null;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (_error) {
      return [];
    }

    const keys = [];
    ["types", "type", "tipos", "tipo"].forEach((param) => {
      params.getAll(param).forEach((value) => {
        String(value || "")
          .split(",")
          .map((token) => token.trim())
          .filter(Boolean)
          .forEach((token) => {
            const normalized = normalizeTypeFilterValue(token);
            if (normalized) keys.push(normalized);
          });
      });
    });

    return Array.from(new Set(keys));
  }

  function readInitialSeasonFilterKeys() {
    let params = null;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (_error) {
      return [];
    }

    const keys = [];
    ["seasons", "season", "temporada", "temp"].forEach((param) => {
      params.getAll(param).forEach((value) => {
        String(value || "")
          .split(",")
          .map((token) => token.trim())
          .filter(Boolean)
          .forEach((token) => {
            const normalized = normalizeSeasonFilterValue(token);
            if (normalized) keys.push(normalized);
          });
      });
    });

    return Array.from(new Set(keys));
  }

  function readInitialSectionFilterKeys() {
    let params = null;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (_error) {
      return [];
    }

    const keys = [];
    ["sections", "section", "secciones", "seccion"].forEach((param) => {
      params.getAll(param).forEach((value) => {
        String(value || "")
          .split(",")
          .map((token) => token.trim())
          .filter(Boolean)
          .forEach((token) => {
            const normalized = normalizeSectionFilterValue(token);
            if (normalized) keys.push(normalized);
          });
      });
    });

    return Array.from(new Set(keys));
  }

  function readInitialSizeFilterKeys() {
    let params = null;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (_error) {
      return [];
    }

    const keys = [];
    ["sizes", "size", "talles", "talle", "edad", "edades"].forEach((param) => {
      params.getAll(param).forEach((value) => {
        String(value || "")
          .split(",")
          .map((token) => token.trim())
          .filter(Boolean)
          .forEach((token) => {
            const normalized = normalizeSizeFilterValue(token);
            if (normalized) keys.push(normalized);
          });
      });
    });

    return Array.from(new Set(keys));
  }

  function readInitialAudienceFilterKeys() {
    let params = null;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (_error) {
      return [];
    }

    const keys = [];
    ["audiencia", "audience"].forEach((param) => {
      params.getAll(param).forEach((value) => {
        String(value || "")
          .split(",")
          .map((token) => token.trim())
          .filter(Boolean)
          .forEach((token) => {
            const normalized = normalizeAudienceFilterValue(token);
            if (normalized) keys.push(normalized);
          });
      });
    });

    return Array.from(new Set(keys));
  }

  function applyInitialFiltersFromQuery() {
    const requestedAudiences = readInitialAudienceFilterKeys();
    const requestedSections = readInitialSectionFilterKeys();
    const requestedCategories = readInitialCategoryFilterKeys();
    const requestedTypes = readInitialTypeFilterKeys();
    const requestedSeasons = readInitialSeasonFilterKeys();
    const requestedSizes = readInitialSizeFilterKeys();

    if (requestedAudiences.length) {
      const audienceKey = requestedAudiences[0];
      state.selected.audiences.add(audienceKey);
      setOptionLabel("audiences", audienceKey, audienceKey === "nina" ? "Niña" : "Niño");
    }

    if (state.scope === "catalogo" && requestedSections.length) {
      const availableSections = new Set(SECTION_OPTIONS.map((option) => option.key));
      requestedSections.forEach((key) => {
        if (availableSections.has(key)) state.selected.sections.add(key);
      });
    }

    if (requestedCategories.length) {
      const availableCategories = new Set(collectCategoryOptions(state.products).map((option) => option.key));
      requestedCategories.forEach((key) => {
        if (availableCategories.has(key)) state.selected.categories.add(key);
      });
    }

    if (requestedTypes.length) {
      const availableTypes = new Map();
      state.products.forEach((product) => {
        const key = normalizeTypeFilterValue(product && product.typeKey ? product.typeKey : product && product.type);
        if (!key || availableTypes.has(key)) return;
        availableTypes.set(key, product.typeLabel || toStartCase(product.type || key));
      });

      requestedTypes.forEach((key) => {
        if (!availableTypes.has(key)) return;
        state.selected.types.add(key);
        setOptionLabel("types", key, availableTypes.get(key));
      });
    }

    if (requestedSeasons.length) {
      const availableSeasons = new Set(SEASON_OPTIONS.map((option) => option.key));
      requestedSeasons.forEach((key) => {
        if (availableSeasons.has(key)) state.selected.seasons.add(key);
      });
    }

    if (requestedSizes.length) {
      let sizeSource = state.products.slice();
      if (state.scope === "catalogo") {
        const selectedSection = Array.from(state.selected.sections)[0] || "";
        if (!selectedSection) return;
        sizeSource = state.products.filter((product) => product.section === selectedSection);
      }

      const availableSizes = new Set(collectSizes(sizeSource, { includeBase: false }).map((value) => String(value)));
      requestedSizes.forEach((key) => {
        if (!availableSizes.has(String(key))) return;
        state.selected.sizes.add(String(key));
        setOptionLabel("sizes", String(key), String(key));
      });
    }
  }

  function applyInitialSearchFromQuery() {
    const searchQuery = readInitialSearchQuery();
    state.searchQueryRaw = searchQuery;
    state.searchQueryNorm = normalizeText(searchQuery);
    state.searchTokens = tokenizeSearch(searchQuery);
    state.searchAnyTokens = readInitialSearchAnyTokens();
    state.searchExcludeTokens = readInitialSearchExcludeTokens();
  }

  function matchesSearchQuery(product) {
    if (!state.searchQueryNorm && !state.searchAnyTokens.length && !state.searchExcludeTokens.length) return true;
    if (!product) return false;

    const fields = [
      product.name,
      product.type,
      product.typeLabel,
      product.badge,
      product.featuredBadge,
      product.section,
      product.sectionLabel,
      product.categoryKey
    ];

    if (Array.isArray(product.colors)) {
      product.colors.forEach((entry) => {
        if (entry && entry.name) fields.push(entry.name);
      });
    }

    const haystack = normalizeText(fields.join(" "));
    const compactHaystack = compactSearch(haystack);
    const compactQuery = compactSearch(state.searchQueryNorm);
    const words = haystack.split(/[^a-z0-9]+/).filter(Boolean);

    if (state.searchQueryNorm) {
      let matchesMainQuery = false;
      if (compactQuery && compactHaystack.includes(compactQuery)) {
        matchesMainQuery = true;
      } else {
        matchesMainQuery = state.searchTokens.every((token) => {
          return haystack.includes(token) || words.some((word) => word.startsWith(token));
        });
      }

      if (!matchesMainQuery) return false;
    }

    if (state.searchAnyTokens.length) {
      const matchesAny = state.searchAnyTokens.some((token) => {
        return haystack.includes(token) || words.some((word) => word.startsWith(token));
      });
      if (!matchesAny) return false;
    }

    if (state.searchExcludeTokens.length) {
      const hasExcluded = state.searchExcludeTokens.some((token) => {
        return haystack.includes(token) || words.some((word) => word.startsWith(token));
      });
      if (hasExcluded) return false;
    }

    return true;
  }

  function normalizeStatus(rawStatus) {
    const key = normalizeText(rawStatus);
    if (!key || key.includes("unknown") || key.includes("consult")) return "unknown";
    if (key.includes("sin") || key.includes("agot") || key.includes("out") || key.includes("unavail")) return "out";
    if (key.includes("low") || key.includes("poco") || key.includes("por")) return "low";
    if (key.includes("available") || key.includes("disponible") || key.includes("stock")) return "available";
    return "unknown";
  }

  function getRawImageMap(product) {
    return typeof imageUtils.getProductLegacyImageMap === "function"
      ? imageUtils.getProductLegacyImageMap(product)
      : null;
  }

  function getRawImageList(product) {
    return typeof imageUtils.getProductImageList === "function"
      ? imageUtils.getProductImageList(product)
      : [];
  }

  function thumbSetFromSources(src, fallbackSrc, avifSrc) {
    const primary = String(src || "").trim();
    const ext = typeof imageUtils.extension === "function" ? imageUtils.extension(primary) : "";
    const avif = String(avifSrc || "").trim();
    const fallback = String(fallbackSrc || "").trim()
      || (typeof imageUtils.fallbackRasterPath === "function" ? imageUtils.fallbackRasterPath(primary) : primary);
    const derivedWebp = typeof imageUtils.replaceExtension === "function" ? imageUtils.replaceExtension(primary, "webp") : primary;
    const derivedAvif = "";
    const webp = /\.webp$/i.test(primary) ? primary : (ext && ext !== "avif" ? derivedWebp : "");
    const modernAvif = /\.avif$/i.test(primary) ? primary : (avif || derivedAvif);
    const resolvedFallback = ext === "webp" || ext === "avif"
      ? ((typeof imageUtils.fallbackRasterPath === "function" ? imageUtils.fallbackRasterPath(primary) : fallback) || fallback)
      : (primary || fallback || PLACEHOLDER);

    return {
      src: resolvedFallback,
      fallbackSrc: resolvedFallback,
      webpSrc: webp,
      avifSrc: modernAvif
    };
  }

  function resolveThumbSet(product, color) {
    if (typeof imageUtils.getProductThumbSet === "function") {
      const resolved = imageUtils.getProductThumbSet(product, color);
      if (resolved && (resolved.src || resolved.webpSrc || resolved.avifSrc)) {
        return {
          src: resolved.src || resolved.originalSrc || PLACEHOLDER,
          fallbackSrc: resolved.fallbackSrc || resolved.src || resolved.originalSrc || PLACEHOLDER,
          webpSrc: resolved.webpSrc || "",
          avifSrc: resolved.avifSrc || "",
          originalSrc: resolved.originalSrc || resolved.src || PLACEHOLDER
        };
      }
    }
    const primaryImage = String(product && product.image || "").trim() || PLACEHOLDER;
    return thumbSetFromSources(primaryImage, primaryImage, "");
  }

  function statusFromSizes(sizes) {
    if (!Array.isArray(sizes) || !sizes.length) return "unknown";
    let available = 0;
    let low = 0;
    let unknown = 0;

    sizes.forEach((entry) => {
      const status = normalizeStatus(entry && entry.status);
      if (status === "available") available += 1;
      if (status === "low") {
        available += 1;
        low += 1;
      }
      if (status === "unknown") unknown += 1;
    });

    if (unknown > 0) return "unknown";
    if (available === 0) return "out";
    if (low > 0) return "low";
    return "available";
  }

  function buildColors(product) {
    const entries = typeof imageUtils.resolveProductColorEntries === "function"
      ? imageUtils.resolveProductColorEntries(product)
      : [];
    const fallbackImage = (typeof imageUtils.getProductMainImage === "function"
      ? imageUtils.getProductMainImage(product)
      : String(product && product.image || "").trim()) || PLACEHOLDER;

    if (!entries.length) {
      return [{
        key: "unico",
        name: "Unico",
        hex: "#dddddd",
        image: fallbackImage,
        thumb: typeof imageUtils.getThumbPath === "function" ? imageUtils.getThumbPath(fallbackImage) : fallbackImage,
        thumbFallback: fallbackImage,
        thumbAvif: "",
        swatchImage: typeof imageUtils.getThumbPath === "function" ? imageUtils.getThumbPath(fallbackImage) : fallbackImage
      }];
    }

    return entries.map((entry) => {
      const name = String(entry && (entry.name || entry.value) || "Unico").trim() || "Unico";
      const key = normalizeText(name) || "unico";
      const resolvedImage = (typeof imageUtils.getColorImage === "function"
        ? imageUtils.getColorImage(entry, product)
        : String(entry && entry.image || "").trim()) || fallbackImage;
      const thumb = String(entry && entry.thumb || "").trim()
        || (typeof imageUtils.getThumbPath === "function" ? imageUtils.getThumbPath(resolvedImage) : "");
      const thumbFallback = String(entry && entry.thumbFallback || "").trim()
        || resolvedImage;
      const thumbAvif = String(entry && entry.thumbAvif || "").trim();
      return Object.assign({}, entry, {
        key,
        name,
        hex: entry && entry.hex ? entry.hex : (RAW_COLOR_FALLBACK_HEX[key] || "#d9d4da"),
        image: resolvedImage,
        thumb,
        thumbFallback,
        thumbAvif,
        swatchImage: thumb || resolvedImage
      });
    });
  }

  function buildSizes(product) {
    const list = [];
    const seen = new Set();
    const source = Array.isArray(product && product.sizes) ? product.sizes : [];

    source.forEach((entry) => {
      const value = String((entry && entry.size) || entry || "").trim();
      if (!value || seen.has(value)) return;
      seen.add(value);
      list.push({
        value,
        status: normalizeStatus(entry && entry.status)
      });
    });

    return list;
  }

  function normalizeProduct(raw) {
    const section = normalizeSection(raw && raw.section);
    const name = String((raw && raw.name) || "Producto ROMIX").trim();
    const typeRaw = String((raw && raw.type) || (raw && raw.category) || "Indumentaria").trim();
    const typeLabel = titleCase(typeRaw);
    const typeKey = normalizeTypeFilterValue(typeRaw);
    const categoryKey = categoryKeyFromType(typeRaw);
    const sizes = buildSizes(raw);
    const colors = buildColors(raw);
    const filterColorKeys = Array.from(new Set(colors.map((entry) => normalizeColorToFilterKey(entry.name)).filter(Boolean)));
    const seasonKey = normalizeSeason(raw && raw.season, name);
    const baseStock = raw && raw.stockStatus ? normalizeStatus(raw.stockStatus) : "";
    const galleryImages = getRawImageList(raw);
    const rawImageMap = getRawImageMap(raw);
    const coverImage = (typeof imageUtils.getProductMainImage === "function"
      ? imageUtils.getProductMainImage(raw)
      : "")
      || (colors[0] && colors[0].image)
      || (galleryImages[0] || ((raw && raw.image) || PLACEHOLDER));
    const rawThumbnail = String(raw && raw.thumbnail || "").trim();
    const rawThumbnailFallback = String(raw && raw.thumbnailFallback || "").trim();
    const rawThumbnailAvif = String(raw && raw.thumbnailAvif || "").trim();
    const coverThumb = rawThumbnail
      || (colors[0] && colors[0].thumb)
      || (typeof imageUtils.getThumbPath === "function" && coverImage !== PLACEHOLDER ? imageUtils.getThumbPath(coverImage) : "")
      || coverImage;
    const coverThumbFallback = rawThumbnailFallback
      || (colors[0] && colors[0].thumbFallback)
      || coverImage;
    const saleInfo = typeof pricing.getSaleInfo === "function"
      ? pricing.getSaleInfo(raw)
      : {
          currentPrice: Number((raw && (raw.price || raw.base_price || raw.basePrice)) || 0),
          originalPrice: Number((raw && (raw.originalPrice || raw.compare_at_price || raw.compareAtPrice)) || 0)
        };

    return {
      id: String((raw && raw.id) || (section + "-" + slugify(name))),
      slug: slugify(name),
      name,
      section,
      sectionLabel: sectionLabel(section),
      type: typeRaw,
      typeKey,
      typeLabel,
      categoryKey,
      image: coverImage,
      thumb: coverThumb || coverImage,
      thumbFallback: coverThumbFallback || coverThumb || coverImage,
      thumbnail: coverThumb || coverImage,
      thumbnailFallback: coverThumbFallback || coverThumb || coverImage,
      thumbnailAvif: rawThumbnailAvif || (colors[0] && colors[0].thumbAvif) || "",
      imageMap: rawImageMap,
      images: galleryImages,
      price: saleInfo.currentPrice,
      originalPrice: saleInfo.originalPrice,
      badge: String((raw && raw.badge) || "").trim(),
      featuredBadge: String((raw && raw.featuredBadge) || "").trim(),
      seasonKey,
      featured: !!(raw && raw.featured === true),
      colors,
      filterColorKeys: filterColorKeys.length ? filterColorKeys : ["otros"],
      sizes,
      stockStatus: baseStock || statusFromSizes(sizes)
    };
  }

  async function loadProducts() {
    if (window.romixProductsStore && typeof window.romixProductsStore.load === "function") {
      const data = await window.romixProductsStore.load();
      return Array.isArray(data) ? data : [];
    }

    const response = await fetch(new URL(DATA_URL, window.location.href));
    const text = await response.text();
    const parsed = parseJsonText(text);
    return (Array.isArray(parsed) ? parsed : []).filter((product) => product && product.visible !== false);
  }

  function productsByScope(list, scope) {
    if (scope === "mujer") {
      return list.filter((item) => item.section === "mujer");
    }
    if (scope === "hombre") {
      return list.filter((item) => item.section === "hombre");
    }
    if (scope === "ninos") {
      return list.filter((item) => item.section === "ninos");
    }
    if (scope === "novedades") {
      const featured = list.filter((item) => item.featured === true);
      return featured.length ? featured : list.slice(0, 20);
    }
    return list;
  }

  function collectColorOptions(list) {
    const map = new Map();
    list.forEach((product) => {
      const keys = Array.isArray(product.filterColorKeys) ? product.filterColorKeys : [];
      keys.forEach((key) => {
        const definition = resolveColorDefinitionByKey(key);
        if (!map.has(definition.key)) {
          map.set(definition.key, {
            key: definition.key,
            name: definition.label,
            hex: definition.hex,
            count: 0
          });
        }
        map.get(definition.key).count += 1;
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    });
  }

  function collectSizes(list, options) {
    const opts = options || {};
    const includeBase = opts.includeBase !== false;
    const values = new Set(includeBase ? SIZE_BASE : []);
    list.forEach((product) => {
      product.sizes.forEach((entry) => {
        if (entry && entry.value) values.add(String(entry.value));
      });
    });

    return Array.from(values).sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  }

  function collectCategoryOptions(list) {
    const predefinedOrder = new Map(CATEGORY_OPTIONS.map((entry, index) => [entry.key, index]));
    const predefinedLabels = new Map(CATEGORY_OPTIONS.map((entry) => [entry.key, entry.label]));
    const map = new Map();

    list.forEach((product) => {
      const key = String(product && product.categoryKey ? product.categoryKey : "").trim();
      if (!key) return;

      if (!map.has(key)) {
        const knownLabel = predefinedLabels.get(key);
        const derivedLabel = toStartCase(product && product.typeLabel ? product.typeLabel : key);
        map.set(key, {
          key,
          label: knownLabel || derivedLabel || toStartCase(key),
          count: 0,
          order: predefinedOrder.has(key) ? predefinedOrder.get(key) : Number.MAX_SAFE_INTEGER
        });
      }

      map.get(key).count += 1;
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, "es", { sensitivity: "base" });
    });
  }

  function detailUrl(product) {
    const id = encodeURIComponent(product.id || product.slug);
    const slug = encodeURIComponent(product.slug || slugify(product.name));
    const name = encodeURIComponent(product.name || "");
    return "product.html?id=" + id + "&slug=" + slug + "&name=" + name;
  }

  function getFirstColor(product) {
    return (product.colors && product.colors[0]) || { key: "unico", name: "Unico", image: product.image || PLACEHOLDER };
  }

  function getFirstAvailableSize(product) {
    if (!product.sizes.length) return "U";
    const available = product.sizes.find((entry) => entry.status !== "out");
    return String((available && available.value) || product.sizes[0].value || "U");
  }

  function showToast(message) {
    const toast = document.getElementById("catalog-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    if (showToast.timer) clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2100);
  }

  function addToCart(product, selectedColor) {
    if (!window.romixCart || typeof window.romixCart.addToCart !== "function") {
      window.location.href = detailUrl(product);
      return;
    }

    const fallbackColor = getFirstColor(product);
    const color = selectedColor || fallbackColor;
    const size = getFirstAvailableSize(product);
    const image = color && color.image ? color.image : product.image;

    window.romixCart.addToCart({
      productId: product.id,
      id: product.id,
      name: product.name,
      type: product.typeLabel,
      price: product.price,
      image,
      color: color.name,
      colorName: color.name,
      size,
      talle: size,
      qty: 1
    });

    if (typeof window.romixCart.updateBadge === "function") {
      window.romixCart.updateBadge("#cart-count");
    }
  }

  function renderSummary() {
    const target = document.getElementById("products-summary");
    if (!target) return;

    const visible = Math.min(state.visibleCount, state.view.length);
    target.innerHTML = "Mostrando <strong>" + visible + "</strong> de <strong>" + state.view.length + "</strong> productos";
  }

  function ensureLoadMoreControls() {
    const grid = document.getElementById("product-grid");
    if (!grid || !grid.parentElement) return null;

    let wrap = document.getElementById("catalog-load-more-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "catalog-load-more-wrap";
      wrap.className = "catalog-load-more";
      const button = document.createElement("button");
      button.id = "catalog-load-more-btn";
      button.type = "button";
      button.className = "catalog-load-more-btn";
      button.addEventListener("click", function () {
        state.visibleCount = Math.min(state.visibleCount + getLoadMoreStep(), state.view.length);
        renderGrid();
      });
      wrap.appendChild(button);
      grid.parentElement.appendChild(wrap);
    }

    return {
      wrap,
      button: wrap.querySelector("button")
    };
  }

  function updateLoadMoreControls() {
    const controls = ensureLoadMoreControls();
    if (!controls || !controls.wrap || !controls.button) return;

    const visible = Math.min(state.visibleCount, state.view.length);
    const remaining = Math.max(0, state.view.length - visible);
    controls.wrap.hidden = remaining <= 0;
    controls.button.hidden = remaining <= 0;
    const step = getLoadMoreStep();
    controls.button.textContent = remaining > step ? "Ver " + step + " mas" : "Ver mas";
  }

  function buildSortSelect(id, extraClassName) {
    const select = document.createElement("select");
    select.id = id;
    select.className = "products-sort-select" + (extraClassName ? " " + extraClassName : "");
    select.setAttribute("aria-label", "Ordenar productos");
    select.dataset.sortControl = "true";

    SORT_OPTIONS.forEach((option) => {
      const item = document.createElement("option");
      item.value = option.key;
      item.textContent = option.label;
      select.appendChild(item);
    });

    select.value = state.sortBy;
    return select;
  }

  function syncSortControlValues(source) {
    document.querySelectorAll("[data-sort-control='true']").forEach((control) => {
      if (control === source) return;
      control.value = state.sortBy;
    });
  }

  function ensureMobileFilterTrigger() {
    const openBtn = document.getElementById("open-filters");
    const heading = document.getElementById("page-title");
    const breadcrumb = document.getElementById("catalog-breadcrumb");
    if (!openBtn && !heading) return;

    const triggerMarkup =
      '<span class="filters-open-btn-icon" aria-hidden="true">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none">' +
          '<path d="M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
          '<path d="M7 12H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
          '<path d="M10 17H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
        '</svg>' +
      '</span>' +
      '<span class="filters-open-btn-text">Filtrar y ordenar</span>' +
      '<span class="filters-open-btn-chevron" aria-hidden="true">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none">' +
          '<path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>' +
        '</svg>' +
      '</span>';

    if (openBtn && openBtn.dataset.mobileReady !== "1") {
      openBtn.dataset.mobileReady = "1";
      openBtn.setAttribute("aria-label", "Filtrar y ordenar");
      openBtn.setAttribute("aria-controls", "filters-sidebar");
      openBtn.setAttribute("aria-expanded", "false");
      openBtn.innerHTML = triggerMarkup;
    }

    if (!heading) return;

    let mobileTrigger = document.getElementById("catalog-mobile-filter-trigger");
    if (!mobileTrigger) {
      mobileTrigger = document.createElement("button");
      mobileTrigger.type = "button";
      mobileTrigger.id = "catalog-mobile-filter-trigger";
      mobileTrigger.className = "catalog-mobile-filter-trigger";
      mobileTrigger.setAttribute("aria-label", "Filtrar y ordenar");
      mobileTrigger.setAttribute("aria-controls", "filters-sidebar");
      mobileTrigger.setAttribute("aria-expanded", "false");
      mobileTrigger.innerHTML = triggerMarkup;
    }

    if (heading.nextSibling !== mobileTrigger) {
      heading.parentNode.insertBefore(mobileTrigger, heading.nextSibling);
    }
  }

  function getSingleSelectedValue(group) {
    const selectedSet = state.selected[group];
    if (!(selectedSet instanceof Set) || selectedSet.size !== 1) return "";
    return Array.from(selectedSet)[0] || "";
  }

  function getBreadcrumbSectionLabel() {
    if (state.scope === "catalogo") {
      const sectionValue = getSingleSelectedValue("sections");
      if (sectionValue) return getOptionLabel("sections", sectionValue);
      return "Catalogo";
    }

    const pageConfig = PAGE_CONFIG[state.scope] || PAGE_CONFIG.catalogo;
    return pageConfig.title || "Catalogo";
  }

  function renderBreadcrumb() {
    const main = document.getElementById("main-content");
    const heading = document.getElementById("page-title");
    if (!main || !heading) return;

    let breadcrumb = document.getElementById("catalog-breadcrumb");
    if (!breadcrumb) {
      breadcrumb = document.createElement("nav");
      breadcrumb.id = "catalog-breadcrumb";
      breadcrumb.className = "catalog-breadcrumb";
      breadcrumb.setAttribute("aria-label", "Breadcrumb");
      main.insertBefore(breadcrumb, heading);
    }

    const parts = [{ label: "Inicio", href: "index.html" }];
    const sectionLabel = getBreadcrumbSectionLabel();
    if (sectionLabel) parts.push({ label: sectionLabel });

    const categoryValue = getSingleSelectedValue("categories");
    if (categoryValue) {
      parts.push({ label: getOptionLabel("categories", categoryValue) });
    }

    const audienceValue = getSingleSelectedValue("audiences");
    if (audienceValue) {
      parts.push({ label: getOptionLabel("audiences", audienceValue) });
    }

    breadcrumb.innerHTML = "";
    parts.forEach((part, index) => {
      const node = part.href ? document.createElement("a") : document.createElement("span");
      if (part.href) node.href = part.href;
      node.textContent = part.label;
      breadcrumb.appendChild(node);

      if (index < parts.length - 1) {
        const sep = document.createElement("span");
        sep.className = "catalog-breadcrumb-sep";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = ">";
        breadcrumb.appendChild(sep);
      }
    });

    ensureMobileFilterTrigger();
  }

  function compareOriginalOrder(a, b) {
    const aRank = Number.isFinite(a && a.sortRank) ? a.sortRank : 0;
    const bRank = Number.isFinite(b && b.sortRank) ? b.sortRank : 0;
    return aRank - bRank;
  }

  function sortProductsView() {
    if (state.sortBy === "recommended" && typeof window.recommendedSort === "function") {
      state.view = window.recommendedSort(state.view);
      return;
    }

    state.view.sort(function (a, b) {
      if (state.sortBy === "price-asc") {
        if (a.price !== b.price) return a.price - b.price;
        return compareOriginalOrder(a, b);
      }
      if (state.sortBy === "price-desc") {
        if (a.price !== b.price) return b.price - a.price;
        return compareOriginalOrder(a, b);
      }
      return compareOriginalOrder(a, b);
    });
  }

  function ensureSortControl() {
    const topBar = document.querySelector(".products-top");
    const sidebarScroll = document.querySelector(".filters-scroll");
    let controls = [];

    if (topBar) {
      let select = document.getElementById("products-sort");
      if (!select) {
        const wrapper = document.createElement("label");
        wrapper.className = "products-sort";
        wrapper.setAttribute("for", "products-sort");

        const text = document.createElement("span");
        text.className = "products-sort-label";
        text.textContent = "Ordenar por";

        select = buildSortSelect("products-sort");
        wrapper.appendChild(text);
        wrapper.appendChild(select);

        const openBtn = document.getElementById("open-filters");
        if (openBtn && openBtn.parentElement === topBar) topBar.insertBefore(wrapper, openBtn);
        else topBar.appendChild(wrapper);
      }

      select.value = state.sortBy;
      controls.push(select);
    }

    if (sidebarScroll) {
      let mobileSelect = document.getElementById("products-sort-mobile");
      if (!mobileSelect) {
        const mobileGroup = document.createElement("section");
        mobileGroup.className = "filters-group mobile-sort-group";
        mobileGroup.setAttribute("aria-labelledby", "mobile-sort-title");

        const title = document.createElement("h3");
        title.id = "mobile-sort-title";
        title.className = "mobile-sort-title";
        title.textContent = "ORDENAR";

        mobileSelect = buildSortSelect("products-sort-mobile", "mobile-sort-select");

        mobileGroup.appendChild(title);
        mobileGroup.appendChild(mobileSelect);
        sidebarScroll.insertBefore(mobileGroup, sidebarScroll.firstChild);
      }

      mobileSelect.value = state.sortBy;
      controls.push(mobileSelect);
    }

    ensureMobileFilterTrigger();
    return controls;
  }

  function renderGrid() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;
    const allowVariantPreview = state.scope === "catalogo" || state.scope === "mujer" || state.scope === "hombre" || state.scope === "ninos" || state.scope === "novedades";
    const variantPreviewLimit = isCompactVariantViewport() ? 3 : 4;
    grid.innerHTML = "";

    if (!state.view.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      if (state.searchQueryRaw) {
        empty.textContent = "No encontramos resultados para \"" + state.searchQueryRaw + "\".";
      } else {
        empty.textContent = "No hay productos para los filtros seleccionados.";
      }
      grid.appendChild(empty);
      renderSummary();
      updateLoadMoreControls();
      return;
    }

    const visibleProducts = state.view.slice(0, state.visibleCount);

    visibleProducts.forEach((product, index) => {
      const card = document.createElement("article");
      card.className = "product-card";
      const productDetailUrl = detailUrl(product);
      card.setAttribute("role", "link");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", "Ver detalles de " + product.name);

      function isInteractiveTarget(target) {
        return !!(target && target.closest("a, button, input, select, textarea, label"));
      }

      card.addEventListener("click", function (event) {
        if (isInteractiveTarget(event.target)) return;
        window.location.href = productDetailUrl;
      });

      card.addEventListener("keydown", function (event) {
        if (isInteractiveTarget(event.target)) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        window.location.href = productDetailUrl;
      });

      const thumb = document.createElement("div");
      thumb.className = "product-thumb";
      let selectedColor = getFirstColor(product);
      const imagePriority = getCardImagePriority(index);
      const defaultThumbSet = resolveThumbSet(product, null);
      const initialThumbSet = resolveThumbSet(product, selectedColor);
      const media = typeof imageUtils.createPicture === "function"
        ? imageUtils.createPicture({
            src: initialThumbSet.src,
            fallbackSrc: initialThumbSet.fallbackSrc,
            webpSrc: initialThumbSet.webpSrc,
            avifSrc: initialThumbSet.avifSrc,
            alt: selectedColor && selectedColor.name ? (product.name + " - " + selectedColor.name) : product.name,
            width: cardImageSize.width,
            height: cardImageSize.height,
            loading: imagePriority.loading,
            decoding: "async",
            fetchpriority: imagePriority.fetchpriority,
            sizes: CARD_IMAGE_SIZES
          })
        : null;
      const image = media ? media.img : document.createElement("img");
      const picture = media ? media.picture : null;

      function syncPictureSource(type, src) {
        if (!picture) return;
        const selector = 'source[type="' + type + '"]';
        const current = picture.querySelector(selector);
        if (!src) {
          if (current) current.remove();
          return;
        }
        if (current) {
          current.srcset = src;
          return;
        }
        const source = document.createElement("source");
        source.type = type;
        source.srcset = src;
        if (type === "image/avif") {
          picture.insertBefore(source, picture.firstChild);
          return;
        }
        const imgTag = picture.querySelector("img");
        picture.insertBefore(source, imgTag || null);
      }

      function setMainImage(colorOption, colorName) {
        const nextSet = resolveThumbSet(product, colorOption);
        image.onerror = function onImageError() {
          image.onerror = null;
          syncPictureSource("image/avif", "");
          syncPictureSource("image/webp", "");
          if (nextSet.originalSrc && image.src !== nextSet.originalSrc) {
            image.src = nextSet.originalSrc;
            image.alt = colorName ? (product.name + " - " + colorName) : product.name;
            thumb.classList.add("is-loaded");
            return;
          }
          if (image.src !== defaultThumbSet.fallbackSrc) {
            image.src = defaultThumbSet.fallbackSrc;
            image.alt = product.name;
            thumb.classList.add("is-loaded");
            return;
          }
          image.src = PLACEHOLDER;
          image.alt = product.name;
          thumb.classList.add("is-loaded");
        };

        syncPictureSource("image/avif", nextSet.avifSrc);
        syncPictureSource("image/webp", nextSet.webpSrc);
        image.src = nextSet.src;
        image.alt = colorName ? (product.name + " - " + colorName) : product.name;
      }

      image.addEventListener("load", function () {
        thumb.classList.add("is-loaded");
      });

      image.addEventListener("error", function () {
        thumb.classList.add("is-loaded");
      });

      if (!media) {
        image.loading = imagePriority.loading;
        image.decoding = "async";
        image.width = cardImageSize.width;
        image.height = cardImageSize.height;
        image.sizes = CARD_IMAGE_SIZES;
        image.setAttribute("fetchpriority", imagePriority.fetchpriority);
        thumb.appendChild(image);
      } else {
        thumb.appendChild(picture);
      }

      setMainImage(selectedColor, selectedColor && selectedColor.name);

      const badgeLabel = product.badge || product.featuredBadge;
      if (badgeLabel) {
        const tag = document.createElement("span");
        tag.className = "product-tag";
        tag.textContent = badgeLabel;
        thumb.appendChild(tag);
      }

      const body = document.createElement("div");
      body.className = "product-body";

      if (allowVariantPreview && Array.isArray(product.colors) && product.colors.length > 0) {
        const variants = document.createElement("div");
        variants.className = "product-variants";
        const visibleColors = product.colors.slice(0, variantPreviewLimit);

        visibleColors.forEach((color, index) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "variant-chip" + (index === 0 ? " is-active" : "");
          button.setAttribute("aria-label", "Seleccionar color " + color.name);
          button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
          button.title = color.name;
          button.dataset.colorName = color.name;
          button.dataset.colorIndex = String(index);
          button.style.backgroundColor = color.hex || "#efecf3";
          if (color.swatchImage) {
            button.style.backgroundImage = "url('" + String(color.swatchImage).replace(/'/g, "%27") + "')";
          }
          button.classList.add("variant-chip--color");
          button.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            selectedColor = color;
            variants.querySelectorAll(".variant-chip").forEach((chip) => {
              chip.classList.remove("is-active");
              chip.setAttribute("aria-pressed", "false");
            });
            button.classList.add("is-active");
            button.setAttribute("aria-pressed", "true");
            thumb.classList.remove("is-loaded");
            setMainImage(color, color.name);
          });

          variants.appendChild(button);
        });

        if (product.colors.length > visibleColors.length) {
          const more = document.createElement("span");
          more.className = "variant-more";
          more.textContent = "+" + (product.colors.length - visibleColors.length);
          more.setAttribute("aria-label", "Hay " + (product.colors.length - visibleColors.length) + " colores adicionales");
          variants.appendChild(more);
        }

        body.appendChild(variants);
      }

      const name = document.createElement("p");
      name.className = "product-name";
      name.textContent = product.name;

      const meta = document.createElement("p");
      meta.className = "product-meta";
      const pageConfig = PAGE_CONFIG[state.scope] || PAGE_CONFIG.catalogo;
      const sectionLabelText = pageConfig.label || product.sectionLabel;
      meta.textContent = sectionLabelText + " | " + (product.typeLabel || "Indumentaria");

      const priceRow = document.createElement("div");
      priceRow.className = "price-row";
      const priceDisplay = typeof pricing.createPriceDisplay === "function"
        ? pricing.createPriceDisplay(product, {
            currentClass: "product-price",
            currentTag: "span"
          })
        : null;

      const price = priceDisplay || document.createElement("p");
      if (!priceDisplay) {
        price.className = "product-price";
        price.textContent = formatPrice(product.price);
      }

      const stock = document.createElement("p");
      const stockInfo = STOCK_META[product.stockStatus] || STOCK_META.unknown;
      stock.className = "stock-note " + stockInfo.css;
      stock.textContent = stockInfo.label;

      priceRow.appendChild(price);
      priceRow.appendChild(stock);

      body.appendChild(name);
      body.appendChild(meta);
      body.appendChild(priceRow);

      card.appendChild(thumb);
      card.appendChild(body);
      grid.appendChild(card);
    });

    renderSummary();
    updateLoadMoreControls();
  }

  function matchFilters(product) {
    if (state.selected.audiences.size) {
      const selectedAudience = getSingleSelectedValue("audiences");
      const isNinosProduct = product.section === "ninos";
      const isNinoProduct = NINO_AUDIENCE_PRODUCT_SLUGS.has(product.slug);

      if (selectedAudience === "nino" && (!isNinosProduct || !isNinoProduct)) return false;
      if (selectedAudience === "nina" && (!isNinosProduct || isNinoProduct)) return false;
    }

    if (state.scope === "catalogo" && state.selected.sections.size) {
      if (!state.selected.sections.has(product.section)) return false;
    }

    if (state.selected.colors.size) {
      const colorKeys = Array.isArray(product.filterColorKeys) ? product.filterColorKeys : [];
      const hasColor = colorKeys.some((key) => state.selected.colors.has(key));
      if (!hasColor) return false;
    }

    if (state.selected.categories.size) {
      if (!state.selected.categories.has(product.categoryKey)) return false;
    }

    if (state.selected.types.size) {
      if (!state.selected.types.has(product.typeKey)) return false;
    }

    if (state.selected.seasons.size) {
      if (!state.selected.seasons.has(product.seasonKey)) return false;
    }

    if (state.selected.sizes.size) {
      const sizeValues = product.sizes.map((entry) => String(entry.value));
      const hasSize = sizeValues.some((value) => state.selected.sizes.has(value));
      if (!hasSize) return false;
    }

    if (!matchesSearchQuery(product)) return false;

    return true;
  }

  function syncCheckboxState(group, value, checked) {
    const selector = ".filters-sidebar input[data-group='" + group + "']";
    const inputs = Array.from(document.querySelectorAll(selector));
    const target = inputs.find((input) => String(input.value || "") === String(value || ""));
    if (target) target.checked = checked;
  }

  function renderActiveFilters() {
    const bar = document.getElementById("active-filters-bar");
    const title = document.getElementById("active-filters-title");
    const list = document.getElementById("active-filters-list");
    const clear = document.getElementById("active-filters-clear");
    if (!bar || !title || !list || !clear) return;

    const activeFilters = getActiveFilters().sort((a, b) => {
      return a.label.localeCompare(b.label, "es", { sensitivity: "base" });
    });

    const hasActiveFilters = activeFilters.length > 0;
    title.textContent = "Filtros activos (" + activeFilters.length + ")";
    clear.disabled = !hasActiveFilters;
    bar.hidden = !hasActiveFilters;
    bar.classList.toggle("is-empty", !hasActiveFilters);

    list.innerHTML = "";

    if (!hasActiveFilters) return;

    activeFilters.forEach((item) => {
      const chip = document.createElement("span");
      chip.className = "active-filter-chip";

      const text = document.createElement("span");
      text.className = "active-filter-chip-text";
      text.textContent = item.label;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "active-filter-chip-remove";
      remove.dataset.group = item.group;
      remove.dataset.value = item.value;
      remove.setAttribute("aria-label", "Quitar filtro " + item.label);
      remove.textContent = "X";

      chip.appendChild(text);
      chip.appendChild(remove);
      list.appendChild(chip);
    });
  }

  function applyFilters() {
    state.view = state.products.filter(matchFilters);
    sortProductsView();
    state.visibleCount = getInitialVisibleProducts();
    renderGrid();
    renderActiveFilters();
    renderBreadcrumb();
    syncFilterUrl();
  }

  function syncFilterUrl() {
    if (!window.history || typeof window.history.replaceState !== "function") return;
    const params = new URLSearchParams(window.location.search || "");
    const filterKeys = [
      "categories", "categoria", "categorias", "category", "cat",
      "types", "type", "tipos", "tipo", "seasons", "season", "temporada", "temp",
      "sections", "section", "secciones", "seccion", "sizes", "size", "talles", "talle",
      "edad", "edades", "audiencia", "audience", "colors", "color", "colores", "sort", "order"
    ];
    filterKeys.forEach((key) => params.delete(key));
    const mapping = {
      categories: state.selected.categories,
      types: state.selected.types,
      seasons: state.selected.seasons,
      sections: state.selected.sections,
      sizes: state.selected.sizes,
      audience: state.selected.audiences,
      colors: state.selected.colors
    };
    Object.entries(mapping).forEach(([key, values]) => {
      const list = Array.from(values || []).sort();
      if (list.length) params.set(key, list.join(","));
    });
    if (state.sortBy !== "recommended") params.set("sort", state.sortBy);
    const query = params.toString();
    const nextUrl = window.location.pathname + (query ? "?" + query : "") + window.location.hash;
    window.history.replaceState(window.history.state, "", nextUrl);
  }

  function onFilterChange(event) {
    const input = event.target;
    if (!input || (input.type !== "checkbox" && input.type !== "radio")) return;

    const group = input.dataset.group;
    const value = String(input.value || "");
    if (!group || !state.selected[group]) return;

    if (group === "sections") {
      state.selected.sections.clear();
      if (input.checked) state.selected.sections.add(value);
      state.selected.sizes.clear();
      state.showAllSizes = false;
      renderSizeFilters();
      applyFilters();
      return;
    }

    if (input.checked) state.selected[group].add(value);
    else state.selected[group].delete(value);

    applyFilters();
  }

  function resetFilters() {
    Object.keys(state.selected).forEach((key) => state.selected[key].clear());
    state.showAllSizes = false;
    document.querySelectorAll(".filters-sidebar input[data-group]").forEach((input) => {
      input.checked = false;
    });
    renderSizeFilters();
    applyFilters();
  }

  function removeActiveFilter(group, value) {
    if (!group || !state.selected[group]) return;
    const safeValue = String(value || "");
    state.selected[group].delete(safeValue);
    syncCheckboxState(group, safeValue, false);
    if (group === "sections") {
      state.selected.sizes.clear();
      state.showAllSizes = false;
      renderSizeFilters();
    }
    applyFilters();
  }

  function toggleExtraOptions(group, showAll) {
    const selector = group === "colors" ? "#color-options .filter-option" : "#size-options .size-chip";
    const limit = group === "colors" ? COLOR_LIMIT : SIZE_BASE.length;
    const rows = Array.from(document.querySelectorAll(selector));

    rows.forEach((row, index) => {
      if (index < limit) {
        row.classList.remove("is-hidden");
        return;
      }
      row.classList.toggle("is-hidden", !showAll);
    });

    const buttonId = group === "colors" ? "color-more-btn" : "size-more-btn";
    const button = document.getElementById(buttonId);
    if (!button) return;

    const hasMore = rows.length > limit;
    button.classList.toggle("is-hidden", !hasMore);
    if (!hasMore) return;

    button.textContent = showAll ? "Ver menos" : "+ Ver mas";
  }

  function renderColorFilters() {
    const container = document.getElementById("color-options");
    if (!container) return;

    container.innerHTML = "";
    const options = collectColorOptions(state.products);
    state.optionLabels.colors.clear();

    options.forEach((option, index) => {
      const label = document.createElement("label");
      label.className = "filter-option" + (index >= COLOR_LIMIT && !state.showAllColors ? " is-hidden" : "");

      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.group = "colors";
      input.value = option.key;
      input.checked = state.selected.colors.has(option.key);

      const dot = document.createElement("span");
      dot.className = "color-dot";
      dot.style.background = option.hex;

      const text = document.createElement("span");
      text.textContent = option.name;
      setOptionLabel("colors", option.key, option.name);

      label.appendChild(input);
      label.appendChild(dot);
      label.appendChild(text);
      container.appendChild(label);
    });

    toggleExtraOptions("colors", state.showAllColors);
  }

  function renderCategoryFilters() {
    const container = document.getElementById("category-options");
    if (!container) return;

    container.innerHTML = "";
    state.optionLabels.categories.clear();
    const options = collectCategoryOptions(state.products);

    options.forEach((option) => {
      const label = document.createElement("label");
      label.className = "filter-option";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.group = "categories";
      input.value = option.key;
      input.checked = state.selected.categories.has(option.key);

      const text = document.createElement("span");
      text.textContent = option.label;
      setOptionLabel("categories", option.key, option.label);

      label.appendChild(input);
      label.appendChild(text);
      container.appendChild(label);
    });
  }

  function renderSeasonFilters() {
    const container = document.getElementById("season-options");
    if (!container) return;

    container.innerHTML = "";
    state.optionLabels.seasons.clear();

    SEASON_OPTIONS.forEach((option) => {
      const label = document.createElement("label");
      label.className = "filter-option";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.group = "seasons";
      input.value = option.key;
      input.checked = state.selected.seasons.has(option.key);

      const text = document.createElement("span");
      text.textContent = option.label;
      setOptionLabel("seasons", option.key, option.label);

      label.appendChild(input);
      label.appendChild(text);
      container.appendChild(label);
    });
  }

  function renderSectionFilters() {
    const container = document.getElementById("section-options");
    const group = document.getElementById("section-filter-group");
    if (!container || !group || state.scope !== "catalogo") return;

    container.innerHTML = "";
    state.optionLabels.sections.clear();

    const counts = { mujer: 0, hombre: 0, ninos: 0 };
    state.products.forEach((product) => {
      if (counts[product.section] != null) counts[product.section] += 1;
    });

    SECTION_OPTIONS.forEach((option) => {
      const count = counts[option.key] || 0;
      if (!count) return;

      const label = document.createElement("label");
      label.className = "filter-option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "catalog-section";
      input.dataset.group = "sections";
      input.value = option.key;
      input.checked = state.selected.sections.has(option.key);

      const text = document.createElement("span");
      text.textContent = option.label;
      setOptionLabel("sections", option.key, option.label);

      label.appendChild(input);
      label.appendChild(text);
      container.appendChild(label);
    });
  }

  function renderSizeFilters() {
    const container = document.getElementById("size-options");
    if (!container) return;
    const group = document.getElementById("size-filter-group");
    const helper = document.getElementById("size-helper");
    const sizeMoreButton = document.getElementById("size-more-btn");

    if (state.scope === "catalogo") {
      const selectedSection = Array.from(state.selected.sections)[0] || "";
      if (!selectedSection) {
        state.sizeValues = [];
        state.selected.sizes.clear();
        container.innerHTML = "";
        if (sizeMoreButton) {
          sizeMoreButton.classList.add("is-hidden");
          sizeMoreButton.disabled = true;
          sizeMoreButton.setAttribute("aria-disabled", "true");
        }
        if (group) {
          group.classList.add("is-disabled", "is-collapsed");
          group.setAttribute("aria-disabled", "true");
        }
        if (helper) {
          helper.hidden = false;
          helper.textContent = "Seleccioná una sección para ver los talles disponibles";
        }
        return;
      }

      if (group) {
        group.classList.remove("is-disabled", "is-collapsed");
        group.removeAttribute("aria-disabled");
      }
      if (helper) helper.hidden = true;
      if (sizeMoreButton) {
        sizeMoreButton.disabled = false;
        sizeMoreButton.removeAttribute("aria-disabled");
      }

      const sectionProducts = state.products.filter((product) => product.section === selectedSection);
      state.sizeValues = collectSizes(sectionProducts, { includeBase: false });
      const allowedSizes = new Set(state.sizeValues);
      state.selected.sizes.forEach((value) => {
        if (!allowedSizes.has(value)) state.selected.sizes.delete(value);
      });
    } else {
      if (group) {
        group.classList.remove("is-disabled", "is-collapsed");
        group.removeAttribute("aria-disabled");
      }
      if (helper) helper.hidden = true;
      if (sizeMoreButton) {
        sizeMoreButton.disabled = false;
        sizeMoreButton.removeAttribute("aria-disabled");
      }
      state.sizeValues = collectSizes(state.products);
    }

    container.innerHTML = "";
    state.optionLabels.sizes.clear();

    if (!state.sizeValues.length) {
      if (helper && state.scope === "catalogo") {
        helper.hidden = false;
        helper.textContent = "No hay talles disponibles para la sección seleccionada";
      }
      if (sizeMoreButton) sizeMoreButton.classList.add("is-hidden");
      return;
    }

    state.sizeValues.forEach((value, index) => {
      const holder = document.createElement("div");
      holder.className = "size-chip" + (index >= SIZE_BASE.length && !state.showAllSizes ? " is-hidden" : "");

      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = "size-filter-" + value;
      input.dataset.group = "sizes";
      input.value = value;
      input.checked = state.selected.sizes.has(value);

      const label = document.createElement("label");
      label.setAttribute("for", input.id);
      label.textContent = value;
      setOptionLabel("sizes", value, value);

      holder.appendChild(input);
      holder.appendChild(label);
      container.appendChild(holder);
    });

    toggleExtraOptions("sizes", state.showAllSizes);
  }

  function initPageHeader() {
    const config = PAGE_CONFIG[state.scope] || PAGE_CONFIG.catalogo;
    const title = document.getElementById("page-title");
    if (title) {
      if (state.scope === "catalogo") title.textContent = "Catálogo ROMIX";
      else if (state.scope === "novedades") title.textContent = "Novedades destacadas ROMIX";
      else title.textContent = "Catálogo " + config.title + " ROMIX";
    }

    document.querySelectorAll(".catalog-nav a[data-scope]").forEach((link) => {
      const active = link.dataset.scope === state.scope;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    ensureMobileFilterTrigger();
    renderBreadcrumb();
  }

  function closeSidebar() {
    const sidebar = document.getElementById("filters-sidebar");
    const overlay = document.getElementById("filters-overlay");
    const wasOpen = document.body.classList.contains("filters-open");
    document.body.classList.remove("filters-open");
    document.querySelectorAll("#open-filters, #catalog-mobile-filter-trigger").forEach((trigger) => {
      trigger.setAttribute("aria-expanded", "false");
    });
    if (sidebar) {
      sidebar.setAttribute("aria-hidden", "true");
      sidebar.removeAttribute("aria-modal");
      sidebar.removeAttribute("role");
    }
    if (overlay) overlay.setAttribute("aria-hidden", "true");
    if (wasOpen && filterLastFocus && typeof filterLastFocus.focus === "function") {
      requestAnimationFrame(() => filterLastFocus.focus());
    }
  }

  function openSidebar() {
    const sidebar = document.getElementById("filters-sidebar");
    const overlay = document.getElementById("filters-overlay");
    filterLastFocus = document.activeElement;
    document.body.classList.add("filters-open");
    document.querySelectorAll("#open-filters, #catalog-mobile-filter-trigger").forEach((trigger) => {
      trigger.setAttribute("aria-expanded", "true");
    });
    if (sidebar) {
      sidebar.setAttribute("role", "dialog");
      sidebar.setAttribute("aria-modal", "true");
      sidebar.setAttribute("aria-hidden", "false");
    }
    if (overlay) overlay.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      const close = document.getElementById("close-filters");
      if (close) close.focus();
    });
  }

  function wireUiEvents() {
    const sortControls = ensureSortControl();
    sortControls.forEach((sortSelect) => {
      if (!sortSelect || sortSelect.dataset.sortBound === "1") return;
      sortSelect.dataset.sortBound = "1";

      sortSelect.addEventListener("change", function () {
        const nextValue = String(sortSelect.value || "recommended");
        const allowed = SORT_OPTIONS.some((entry) => entry.key === nextValue);
        state.sortBy = allowed ? nextValue : "recommended";
        sortSelect.value = state.sortBy;
        syncSortControlValues(sortSelect);
        applyFilters();
      });
    });

    const sidebar = document.getElementById("filters-sidebar");
    if (sidebar) sidebar.addEventListener("change", onFilterChange);

    const clearBtn = document.getElementById("clear-filters");
    if (clearBtn) clearBtn.addEventListener("click", resetFilters);

    const activeFiltersClearBtn = document.getElementById("active-filters-clear");
    if (activeFiltersClearBtn) activeFiltersClearBtn.addEventListener("click", resetFilters);

    const activeFiltersList = document.getElementById("active-filters-list");
    if (activeFiltersList) {
      activeFiltersList.addEventListener("click", function (event) {
        const target = event.target;
        if (!target || typeof target.closest !== "function") return;
        const removeButton = target.closest(".active-filter-chip-remove");
        if (!removeButton) return;
        removeActiveFilter(removeButton.dataset.group, removeButton.dataset.value);
      });
    }

    const colorMore = document.getElementById("color-more-btn");
    if (colorMore) {
      colorMore.addEventListener("click", function () {
        state.showAllColors = !state.showAllColors;
        toggleExtraOptions("colors", state.showAllColors);
      });
    }

    const sizeMore = document.getElementById("size-more-btn");
    if (sizeMore) {
      sizeMore.addEventListener("click", function () {
        state.showAllSizes = !state.showAllSizes;
        toggleExtraOptions("sizes", state.showAllSizes);
      });
    }

    const openBtn = document.getElementById("open-filters");
    if (openBtn) {
      openBtn.addEventListener("click", openSidebar);
    }

    const mobileTrigger = document.getElementById("catalog-mobile-filter-trigger");
    if (mobileTrigger) {
      mobileTrigger.addEventListener("click", openSidebar);
    }

    const closeBtn = document.getElementById("close-filters");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeSidebar);
    }

    const overlay = document.getElementById("filters-overlay");
    if (overlay) {
      overlay.addEventListener("click", closeSidebar);
    }

    document.addEventListener("keydown", function (event) {
      if (!document.body.classList.contains("filters-open")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeSidebar();
        return;
      }
      if (event.key !== "Tab") return;
      const sidebar = document.getElementById("filters-sidebar");
      if (!sidebar) return;
      const focusable = Array.from(sidebar.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'))
        .filter((element) => !element.hidden && element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 960) closeSidebar();
      const nextCompactVariantViewport = isCompactVariantViewport();
      if (state.compactVariantViewport !== nextCompactVariantViewport) {
        state.compactVariantViewport = nextCompactVariantViewport;
        renderGrid();
      }
    });
  }

  async function init() {
    const scope = document.body && document.body.dataset ? document.body.dataset.catalogScope : "catalogo";
    state.scope = PAGE_CONFIG[scope] ? scope : "catalogo";
    state.sortBy = readInitialSortKey();

    initPageHeader();
    wireUiEvents();

    try {
      const raw = await loadProducts();
      const normalized = raw
        .map(normalizeProduct)
        .filter(Boolean);
      state.products = productsByScope(normalized, state.scope);
      state.products.forEach((item, index) => {
        item.sortRank = index;
      });
      state.view = state.products.slice();
      applyInitialSearchFromQuery();
      applyInitialFiltersFromQuery();

      renderColorFilters();
      renderSectionFilters();
      renderCategoryFilters();
      renderSeasonFilters();
      renderSizeFilters();
      applyFilters();
    } catch (error) {
      const grid = document.getElementById("product-grid");
      if (grid) {
        grid.innerHTML = "";
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No se pudieron cargar los productos.";
        grid.appendChild(empty);
      }
      renderSummary();
      console.error("[romix-catalog]", error);
    }

    if (window.romixCart && typeof window.romixCart.updateBadge === "function") {
      window.romixCart.updateBadge("#cart-count");
    }
  }

  window.addEventListener("DOMContentLoaded", init);
})();
