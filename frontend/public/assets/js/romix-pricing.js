(function (global) {
  "use strict";

  const CURRENT_PRICE_FIELDS = ["price", "base_price", "basePrice"];
  const ORIGINAL_PRICE_FIELDS = [
    "originalPrice",
    "compare_at_price",
    "compareAtPrice",
    "original_price",
    "priceOriginal"
  ];
  const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  });

  function toAmount(value) {
    if (value == null || value === "") return 0;
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  }

  function firstAmount(product, fields) {
    if (!product || typeof product !== "object") return 0;
    for (const field of fields) {
      const amount = toAmount(product[field]);
      if (amount > 0) return amount;
    }
    return 0;
  }

  function getCurrentPrice(product, override) {
    return arguments.length > 1 ? toAmount(override) : firstAmount(product, CURRENT_PRICE_FIELDS);
  }

  function getOriginalPrice(product) {
    return firstAmount(product, ORIGINAL_PRICE_FIELDS);
  }

  function getSaleInfo(product, currentPriceOverride) {
    const hasOverride = arguments.length > 1;
    const currentPrice = hasOverride
      ? getCurrentPrice(product, currentPriceOverride)
      : getCurrentPrice(product);
    const originalPrice = getOriginalPrice(product);
    const isOnSale = currentPrice > 0 && originalPrice > currentPrice;

    if (!isOnSale) {
      return {
        isOnSale: false,
        currentPrice,
        originalPrice,
        discountPercent: 0,
        savings: 0
      };
    }

    return {
      isOnSale: true,
      currentPrice,
      originalPrice,
      discountPercent: Math.round(((originalPrice - currentPrice) / originalPrice) * 100),
      savings: originalPrice - currentPrice
    };
  }

  function isProductOnSale(product, currentPriceOverride) {
    return arguments.length > 1
      ? getSaleInfo(product, currentPriceOverride).isOnSale
      : getSaleInfo(product).isOnSale;
  }

  function getDiscountPercent(product, currentPriceOverride) {
    return arguments.length > 1
      ? getSaleInfo(product, currentPriceOverride).discountPercent
      : getSaleInfo(product).discountPercent;
  }

  function getProductSavings(product, currentPriceOverride) {
    return arguments.length > 1
      ? getSaleInfo(product, currentPriceOverride).savings
      : getSaleInfo(product).savings;
  }

  function formatPrice(value) {
    const amount = toAmount(value);
    if (!amount) return "";
    return currencyFormatter.format(amount).replace(/\$\s+/u, "$");
  }

  function appendClasses(element, value) {
    String(value || "")
      .split(/\s+/)
      .filter(Boolean)
      .forEach((className) => element.classList.add(className));
  }

  function renderInto(container, product, options) {
    if (!container) return null;
    const opts = options || {};
    const hasOverride = Object.prototype.hasOwnProperty.call(opts, "currentPrice");
    const sale = hasOverride
      ? getSaleInfo(product, opts.currentPrice)
      : getSaleInfo(product);
    const currentLabel = formatPrice(sale.currentPrice) || "$0";

    container.replaceChildren();
    container.classList.add("romix-price-display");
    container.classList.toggle("romix-price-display--sale", sale.isOnSale);
    container.classList.toggle("romix-price-display--detail", opts.variant === "detail");
    container.classList.toggle("romix-price-display--mini", opts.variant === "mini");
    container.dataset.onSale = sale.isOnSale ? "true" : "false";

    const primary = document.createElement("span");
    primary.className = "romix-price-primary";

    const current = document.createElement(opts.currentTag || "span");
    current.className = "romix-price-current";
    appendClasses(current, opts.currentClass);
    if (opts.currentId) current.id = opts.currentId;
    current.textContent = currentLabel;
    primary.appendChild(current);

    if (sale.isOnSale) {
      const discount = document.createElement("span");
      discount.className = "discount-pill romix-discount-pill";
      discount.textContent = sale.discountPercent + "% OFF";
      discount.setAttribute("aria-label", sale.discountPercent + " por ciento de descuento");
      primary.appendChild(discount);
    }

    container.appendChild(primary);

    if (sale.isOnSale) {
      const original = document.createElement("span");
      original.className = "romix-price-original";
      original.setAttribute("aria-label", "Precio anterior: " + formatPrice(sale.originalPrice));
      if (opts.showBeforeLabel) {
        const before = document.createElement("span");
        before.className = "romix-price-before";
        before.textContent = "Antes: ";
        original.appendChild(before);
      }
      original.appendChild(document.createTextNode(formatPrice(sale.originalPrice)));

      const savings = document.createElement("span");
      savings.className = "savings-label romix-savings-label";
      savings.textContent = "Ahorrás " + formatPrice(sale.savings);

      container.appendChild(original);
      container.appendChild(savings);
    }

    return sale;
  }

  function createPriceDisplay(product, options) {
    const container = document.createElement((options && options.rootTag) || "div");
    if (options && options.rootClass) appendClasses(container, options.rootClass);
    if (options && options.rootId) container.id = options.rootId;
    renderInto(container, product, options);
    return container;
  }

  global.romixPricing = Object.freeze({
    getCurrentPrice,
    getOriginalPrice,
    getSaleInfo,
    isProductOnSale,
    getDiscountPercent,
    getProductSavings,
    formatPrice,
    renderInto,
    createPriceDisplay
  });
})(window);
