(function () {
  const PRODUCT_CARD_WIDTH = 720;
  const PRODUCT_CARD_HEIGHT = 960;
  const PRODUCT_FULL_WIDTH = 1200;
  const PRODUCT_FULL_HEIGHT = 1600;
  const HERO_WIDTH = 1900;
  const HERO_HEIGHT = 1267;
  const SQUARE_WIDTH = 1254;
  const SQUARE_HEIGHT = 1254;
  const PROMO_WIDTH = 1708;
  const PROMO_HEIGHT = 921;
  const LOGO_WIDTH = 752;
  const LOGO_HEIGHT = 829;
  const PRODUCTS_DIR = "images/products/";
  const THUMBS_DIR = "images/thumbs/";
  const SWATCHES_DIR = "images/swatches/";

  function normalizeColorKey(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      return raw.normalize("NFD").replace(/\p{Diacritic}+/gu, "").toLowerCase();
    } catch {
      return raw.toLowerCase();
    }
  }

  function cleanPath(value) {
    return String(value || "").trim().split(/[?#]/)[0];
  }

  function basename(value) {
    const normalized = cleanPath(value);
    const lastSlash = normalized.lastIndexOf("/");
    return lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  }

  function extension(value) {
    const fileName = basename(value);
    const dotIndex = fileName.lastIndexOf(".");
    return dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : "";
  }

  function replaceExtension(value, nextExtension) {
    const normalized = cleanPath(value);
    if (!normalized) return "";
    const safeExtension = String(nextExtension || "").replace(/^\./, "").trim();
    if (!safeExtension) return normalized;
    const dotIndex = normalized.lastIndexOf(".");
    if (dotIndex < 0) return normalized + "." + safeExtension;
    return normalized.slice(0, dotIndex + 1) + safeExtension;
  }

  function hasThumbSuffix(value) {
    return /-thumb\.(png|jpe?g|webp|avif)$/i.test(cleanPath(value));
  }

  function hasMobileSuffix(value) {
    return /-mobile\.(png|jpe?g|webp|avif)$/i.test(cleanPath(value));
  }

  function appendSuffixBeforeExtension(value, suffix, nextExtension) {
    const normalized = cleanPath(value);
    if (!normalized) return "";
    const safeSuffix = String(suffix || "").trim();
    const base = safeSuffix && normalized.includes(safeSuffix)
      ? normalized
      : normalized.replace(/(\.[^./]+)$/i, safeSuffix + "$1");
    return nextExtension ? replaceExtension(base, nextExtension) : base;
  }

  function getThumbPath(imagePath) {
    const normalized = cleanPath(imagePath);
    if (!normalized || /^data:/i.test(normalized)) return normalized;
    if (normalized.indexOf(THUMBS_DIR) === 0 || normalized.indexOf(SWATCHES_DIR) === 0) return normalized;
    if (normalized.indexOf(PRODUCTS_DIR) !== 0) return normalized;
    return THUMBS_DIR + basename(normalized).replace(/\.(png|jpe?g|avif|webp)$/i, ".webp");
  }

  function getAvifThumbPath(imagePath) {
    return getThumbPath(imagePath);
  }

  function getMobileImagePath(imagePath) {
    return cleanPath(imagePath);
  }

  function getSwatchPath(imagePath) {
    const normalized = cleanPath(imagePath);
    if (!normalized || /^data:/i.test(normalized)) return normalized;
    if (normalized.indexOf(SWATCHES_DIR) === 0) return normalized;
    if (normalized.indexOf(PRODUCTS_DIR) !== 0) return normalized;
    return SWATCHES_DIR + basename(normalized).replace(/\.(png|jpe?g|avif|webp)$/i, ".webp");
  }

  function toThumbPath(value) {
    return getThumbPath(value);
  }

  function fallbackRasterPath(value) {
    const normalized = cleanPath(value);
    if (!normalized) return "";
    const ext = extension(normalized);
    if (ext === "avif" || ext === "webp") return replaceExtension(normalized, "jpg");
    return normalized;
  }

  function getProductLegacyImageMap(product) {
    if (!product || typeof product !== "object") return null;
    if (product.imageMap && typeof product.imageMap === "object" && !Array.isArray(product.imageMap)) {
      return product.imageMap;
    }
    if (product.images && typeof product.images === "object" && !Array.isArray(product.images)) {
      return product.images;
    }
    return null;
  }

  function getProductImageList(product) {
    const result = [];
    const seen = new Set();

    function push(src) {
      const value = cleanPath(src);
      if (!value || seen.has(value)) return;
      seen.add(value);
      result.push(value);
    }

    if (product && product.image) push(product.image);

    const legacyMap = getProductLegacyImageMap(product);
    if (legacyMap) {
      Object.values(legacyMap).forEach(push);
    }

    if (Array.isArray(product && product.images)) {
      product.images.forEach(push);
    }

    return result;
  }

  function getColorImageList(color) {
    const result = [];
    const seen = new Set();
    const source = color && typeof color === "object" ? color : {};

    function push(src) {
      const value = cleanPath(src);
      if (!value || seen.has(value)) return;
      seen.add(value);
      result.push(value);
    }

    [
      source.images,
      source.imagenes,
      source.gallery,
      source.galeria,
      source.photos,
      source.fotos
    ].forEach(function (list) {
      if (Array.isArray(list)) list.forEach(push);
    });

    push(source.image);
    push(source.imagen);

    return result;
  }

  function findColorImageInLegacyMap(product, colorName) {
    const target = normalizeColorKey(colorName);
    if (!target) return "";
    const legacyMap = getProductLegacyImageMap(product);
    if (!legacyMap) return "";
    const direct = cleanPath(legacyMap[colorName]);
    if (direct) return direct;
    const key = Object.keys(legacyMap).find(function (entryName) {
      return normalizeColorKey(entryName) === target;
    });
    return key ? cleanPath(legacyMap[key]) : "";
  }

  function resolveProductColorEntries(product) {
    const legacyMap = getProductLegacyImageMap(product);
    const imageList = Array.isArray(product && product.images) ? product.images.filter(Boolean).map(cleanPath) : [];
    const mainFallback = cleanPath(product && product.image);
    const legacyValues = legacyMap ? Object.values(legacyMap).map(cleanPath).filter(Boolean) : [];
    const firstLegacyImage = legacyValues[0] || imageList[0] || mainFallback || "";
    let palette = [];

    if (Array.isArray(product && product.colors)) {
      palette = product.colors.slice();
    } else if (product && product.colors && typeof product.colors === "object") {
      const values = Object.values(product.colors);
      if (values.every(function (entry) { return entry && typeof entry === "object"; })) {
        palette = values;
      } else if (product.colors.name || product.colors.value || product.colors.image) {
        palette = [product.colors];
      }
    }

    if (palette.length) {
      return palette.map(function (entry, index) {
        const color = entry && typeof entry === "object" ? entry : { name: entry };
        const name = String(color.name || color.value || "").trim() || ("Color " + (index + 1));
        const colorImages = getColorImageList(color);
        const resolvedImage = colorImages[0]
          || findColorImageInLegacyMap(product, name)
          || cleanPath(imageList[index])
          || firstLegacyImage;
        return Object.assign({}, color, {
          index: index,
          name: name,
          image: resolvedImage,
          images: colorImages.length ? colorImages : (resolvedImage ? [resolvedImage] : [])
        });
      });
    }

    if (legacyMap) {
      return Object.keys(legacyMap).map(function (colorName, index) {
        return {
          index: index,
          name: String(colorName || "").trim() || ("Color " + (index + 1)),
          image: cleanPath(legacyMap[colorName]) || firstLegacyImage
        };
      }).filter(function (entry) {
        return !!entry.image;
      });
    }

    if (imageList.length) {
      return imageList.map(function (image, index) {
        return {
          index: index,
          name: index === 0 ? "Principal" : ("Vista " + (index + 1)),
          image: image
        };
      });
    }

    if (mainFallback) {
      return [{ index: 0, name: "Unico", image: mainFallback }];
    }

    return [];
  }

  function getProductMainImage(product) {
    const colors = resolveProductColorEntries(product);
    if (colors[0] && colors[0].image) return colors[0].image;
    return cleanPath(product && product.image)
      || getProductImageList(product)[0]
      || "";
  }

  function findProductColor(product, lookup) {
    const target = typeof lookup === "string"
      ? normalizeColorKey(lookup)
      : normalizeColorKey(lookup && (lookup.name || lookup.value));
    if (!target) return null;
    const colors = resolveProductColorEntries(product);
    return colors.find(function (entry) {
      return normalizeColorKey(entry && (entry.name || entry.value)) === target;
    }) || null;
  }

  function getColorImage(productOrColor, colorOrProduct, index) {
    let product = null;
    let color = null;
    let colorIndex = Number(index);

    if (productOrColor && typeof productOrColor === "object" && Array.isArray(productOrColor.colors)) {
      product = productOrColor;
      color = colorOrProduct;
    } else if (colorOrProduct && typeof colorOrProduct === "object" && (Array.isArray(colorOrProduct.colors) || colorOrProduct.image || colorOrProduct.imageMap || colorOrProduct.images)) {
      color = productOrColor;
      product = colorOrProduct;
    } else {
      color = productOrColor;
      product = colorOrProduct;
    }

    if (color && typeof color === "object") {
      const colorImages = getColorImageList(color);
      if (colorImages[0]) return colorImages[0];
    }

    const namedColor = findProductColor(product, color);
    if (namedColor && namedColor.image) return cleanPath(namedColor.image);

    if (color && typeof color === "object" && color.name) {
      const legacyImage = findColorImageInLegacyMap(product, color.name);
      if (legacyImage) return legacyImage;
    }

    if (Number.isFinite(colorIndex) && colorIndex >= 0) {
      const imageList = getProductImageList(product);
      if (imageList[colorIndex]) return cleanPath(imageList[colorIndex]);
    }

    return getProductMainImage(product);
  }

  function getProductThumbSet(product, color) {
    const colorEntry = color && typeof color === "object"
      ? Object.assign({}, color, { image: getColorImage(color, product) })
      : findProductColor(product, color);
    const mainImage = getColorImage(colorEntry || color, product) || getProductMainImage(product);
    const hasColorEntry = !!colorEntry;
    const explicitColorImage = cleanPath(colorEntry && colorEntry.image);
    const explicitThumbValue = cleanPath((colorEntry && (colorEntry.thumb || colorEntry.thumbnail)) || (!hasColorEntry && product && (product.thumbnail || product.thumb)));
    const explicitThumb = getThumbPath(explicitThumbValue);
    const explicitFallback = cleanPath((colorEntry && (colorEntry.thumbFallback || colorEntry.thumbnailFallback)) || (!hasColorEntry && product && (product.thumbnailFallback || product.thumbFallback)));
    const explicitAvif = cleanPath((colorEntry && (colorEntry.thumbAvif || colorEntry.thumbnailAvif)) || (!hasColorEntry && product && product.thumbnailAvif));
    const explicitThumbExt = extension(explicitThumb);
    const thumbFallback = explicitThumb && explicitThumbExt && explicitThumbExt !== "avif" ? explicitThumb : "";
    const productThumb = getThumbPath(cleanPath(product && (product.thumbnail || product.thumb)));
    const generatedThumb = getThumbPath(mainImage);
    const fallbackSrc = thumbFallback || explicitFallback || productThumb || generatedThumb || mainImage;
    const primarySrc = thumbFallback || explicitFallback || productThumb || generatedThumb || mainImage;
    const explicitWebp = explicitThumbExt === "webp" ? explicitThumb : "";
    const explicitAvifSrc = extension(explicitAvif) === "avif" ? explicitAvif : "";

    return {
      src: primarySrc || fallbackSrc || mainImage,
      fallbackSrc: fallbackSrc || mainImage,
      webpSrc: explicitColorImage ? "" : explicitWebp,
      avifSrc: explicitColorImage ? "" : explicitAvifSrc,
      originalSrc: explicitColorImage || mainImage,
      sources: uniqueSources([thumbFallback, explicitFallback, productThumb, generatedThumb, mainImage])
    };
  }

  function uniqueSources(values) {
    const result = [];
    const seen = new Set();
    function visit(value) {
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      const normalized = cleanPath(value);
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      result.push(normalized);
    }
    visit(values);
    return result;
  }

  function getColorIndex(product, colorName, index) {
    const numericIndex = Number(index);
    if (Number.isInteger(numericIndex) && numericIndex >= 0) return numericIndex;
    const colorEntry = findProductColor(product, colorName);
    if (colorEntry && Number.isInteger(Number(colorEntry.index)) && Number(colorEntry.index) >= 0) {
      return Number(colorEntry.index);
    }
    return 0;
  }

  function getImageFallbackSources(imagePath) {
    const normalized = cleanPath(imagePath);
    if (!normalized) return [];
    if (/^data:/i.test(normalized)) return [normalized];

    const result = [];
    const push = function (value) {
      const next = cleanPath(value);
      if (!next || result.includes(next)) return;
      result.push(next);
    };

    push(normalized);

    const ext = extension(normalized);
    if (normalized.includes(THUMBS_DIR) || normalized.includes(SWATCHES_DIR) || hasThumbSuffix(normalized)) {
      const originalBase = normalized
        .replace(THUMBS_DIR, PRODUCTS_DIR)
        .replace(SWATCHES_DIR, PRODUCTS_DIR)
        .replace(/-thumb(?=\.[^./]+$)/i, "");
      [
        originalBase,
        replaceExtension(originalBase, "png"),
        replaceExtension(originalBase, "jpg"),
        replaceExtension(originalBase, "jpeg"),
        replaceExtension(originalBase, "webp")
      ].forEach(push);
      return result;
    }

    if (ext === "avif" || ext === "webp") {
      [
        replaceExtension(normalized, "png"),
        replaceExtension(normalized, "jpg"),
        replaceExtension(normalized, "jpeg")
      ].forEach(push);
    }

    return result;
  }

  function getSafeProductImageSources(product, colorName, index) {
    if (!product || typeof product !== "object") return [];
    const colorEntry = findProductColor(product, colorName);
    const colorIndex = getColorIndex(product, colorName, index);
    const imageList = Array.isArray(product.images) ? product.images.map(cleanPath) : [];
    const colorLabel = colorEntry && colorEntry.name ? colorEntry.name : colorName;
    const colorImages = getColorImageList(colorEntry);

    return uniqueSources([
      colorImages,
      findColorImageInLegacyMap(product, colorLabel),
      cleanPath(colorEntry && colorEntry.image),
      imageList[colorIndex],
      cleanPath(product.image),
      cleanPath(product.thumbnailFallback),
      cleanPath(product.thumbnail),
      cleanPath(product.thumbnailAvif)
    ]);
  }

  function getSafeProductImage(product, colorName, index) {
    const sources = getSafeProductImageSources(product, colorName, index);
    return sources[0] || "";
  }

  function getSafeProductThumbSources(product, colorName, index) {
    if (!product || typeof product !== "object") return [];
    const colorEntry = findProductColor(product, colorName);
    const baseSources = getSafeProductImageSources(product, colorName, index);
    const thumbCandidates = [
      getThumbPath(cleanPath(colorEntry && (colorEntry.thumbAvif || colorEntry.thumbnailAvif))),
      getThumbPath(cleanPath(colorEntry && (colorEntry.thumb || colorEntry.thumbnail))),
      getThumbPath(cleanPath(colorEntry && (colorEntry.thumbFallback || colorEntry.thumbnailFallback))),
      baseSources.map(function (source) { return getAvifThumbPath(source); }),
      baseSources.map(function (source) { return getThumbPath(source); }),
      baseSources,
      getThumbPath(cleanPath(product.thumbnailAvif)),
      getThumbPath(cleanPath(product.thumbnail || product.thumb)),
      getThumbPath(cleanPath(product.thumbnailFallback || product.thumbFallback))
    ];

    const expanded = [];
    thumbCandidates.forEach(function (candidate) {
      getImageFallbackSources(candidate).forEach(function (value) {
        expanded.push(value);
      });
    });

    return uniqueSources(expanded.concat(baseSources));
  }

  function getSafeProductThumb(product, colorName, index) {
    const sources = getSafeProductThumbSources(product, colorName, index);
    return sources[0] || "";
  }

  function applyImageWithFallback(img, sources, altText, options) {
    if (!img) return img;
    const opts = options || {};
    const validSources = uniqueSources(sources);
    const placeholder = cleanPath(opts.placeholder);
    let cursor = 0;

    if (altText != null) {
      img.alt = String(altText || "Producto ROMIX");
    } else if (!img.alt) {
      img.alt = "Producto ROMIX";
    }
    img.classList.remove("is-placeholder");

    function next() {
      while (cursor < validSources.length) {
        const nextSrc = validSources[cursor++];
        if (!nextSrc) continue;
        if (typeof opts.onBeforeSet === "function") {
          opts.onBeforeSet(nextSrc, cursor - 1, validSources);
        }
        img.src = nextSrc;
        return;
      }

      img.onerror = null;
      if (typeof opts.onBeforeSet === "function") {
        opts.onBeforeSet("", cursor, validSources);
      }
      if (placeholder) {
        img.src = placeholder;
        img.classList.add("is-placeholder");
      } else {
        img.removeAttribute("src");
      }
    }

    img.onerror = next;
    next();
    return img;
  }

  function loadImageResource(src) {
    const normalized = cleanPath(src);
    if (!normalized || typeof Image !== "function") return Promise.resolve(false);

    return new Promise(function (resolve) {
      const probe = new Image();
      let settled = false;
      const finish = function (success) {
        if (settled) return;
        settled = true;
        probe.onload = null;
        probe.onerror = null;
        resolve(!!success);
      };

      probe.onload = function () { finish(true); };
      probe.onerror = function () { finish(false); };
      try {
        probe.src = normalized;
      } catch (_error) {
        finish(false);
        return;
      }

      if (probe.complete && probe.naturalWidth > 0) finish(true);
      if (typeof probe.decode === "function") {
        Promise.resolve(probe.decode()).then(function () {
          finish(true);
        }).catch(function () {
          if (probe.complete) finish(probe.naturalWidth > 0);
        });
      } else if (probe.complete) {
        finish(probe.naturalWidth > 0);
      }
    });
  }

  function applyImageAttributes(img, options) {
    if (!img || !options) return img;
    if (options.alt != null) img.alt = String(options.alt);
    if (options.loading) img.loading = options.loading;
    if (options.decoding) img.decoding = options.decoding;
    if (options.fetchpriority) img.setAttribute("fetchpriority", options.fetchpriority);
    if (options.width) img.width = options.width;
    if (options.height) img.height = options.height;
    if (options.className) img.className = options.className;
    if (options.sizes) img.sizes = options.sizes;
    if (options.referrerpolicy) img.referrerPolicy = options.referrerpolicy;
    return img;
  }

  // A single srcset candidate cannot contain literal URL whitespace or commas.
  // Keep existing percent escapes intact and leave the underlying filename alone.
  function srcsetUrl(value) {
    return String(value || '').replace(/[\t\n\f\r ,]/g, character => encodeURIComponent(character));
  }

  function createPicture(options) {
    const opts = options || {};
    const picture = document.createElement("picture");
    if (opts.pictureClassName) picture.className = opts.pictureClassName;

    const avifSrc = cleanPath(opts.avifSrc);
    const webpSrc = cleanPath(opts.webpSrc);
    const imgSrc = cleanPath(opts.src) || cleanPath(opts.fallbackSrc) || "";

    if (avifSrc) {
      const avif = document.createElement("source");
      avif.srcset = srcsetUrl(avifSrc);
      avif.type = "image/avif";
      picture.appendChild(avif);
    }

    if (webpSrc && webpSrc !== imgSrc) {
      const webp = document.createElement("source");
      webp.srcset = srcsetUrl(webpSrc);
      webp.type = "image/webp";
      picture.appendChild(webp);
    }

    const img = document.createElement("img");
    if (imgSrc) img.src = imgSrc;
    applyImageAttributes(img, opts);
    picture.appendChild(img);

    return { picture, img };
  }

  const api = {
    cleanPath,
    basename,
    extension,
    replaceExtension,
    getThumbPath,
    getSwatchPath,
    getAvifThumbPath,
    getMobileImagePath,
    toThumbPath,
    fallbackRasterPath,
    getProductLegacyImageMap,
    getProductImageList,
    getColorImageList,
    resolveProductColorEntries,
    getProductMainImage,
    findProductColor,
    getColorImage,
    getProductThumbSet,
    getImageFallbackSources,
    getSafeProductImageSources,
    getSafeProductImage,
    getSafeProductThumbSources,
    getSafeProductThumb,
    loadImageResource,
    applyImageWithFallback,
    createPicture,
    srcsetUrl,
    dimensions: {
      productCard: { width: PRODUCT_CARD_WIDTH, height: PRODUCT_CARD_HEIGHT },
      productFull: { width: PRODUCT_FULL_WIDTH, height: PRODUCT_FULL_HEIGHT },
      hero: { width: HERO_WIDTH, height: HERO_HEIGHT },
      square: { width: SQUARE_WIDTH, height: SQUARE_HEIGHT },
      promo: { width: PROMO_WIDTH, height: PROMO_HEIGHT },
      logo: { width: LOGO_WIDTH, height: LOGO_HEIGHT }
    }
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.romixImageUtils = api;
})();
