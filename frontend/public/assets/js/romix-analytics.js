function initAnalytics(environment) {
  'use strict';
  const { window, location, document } = environment;
  // Only the public production host sends analytics; previews and local tests do not.
  if (location.hostname !== 'romix-ropas.vercel.app' || window.romixAnalytics) return;
  const measurementId = 'G-JJB0XY6PPR';
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  const cleanUrl = (value) => {
    try { const url = new URL(value); return url.origin + url.pathname; } catch { return ''; }
  };
  const pageUrl = new URL(location.href);
  const productId = pageUrl.searchParams.get('id');
  const pageLocation = cleanUrl(location.href) + (productId ? '?id=' + encodeURIComponent(productId) : '');
  gtag('js', new Date());
  const config = {
    page_location: pageLocation,
    page_referrer: cleanUrl(document.referrer),
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  };
  for (const [parameter, field] of [["utm_source", "campaign_source"], ["utm_medium", "campaign_medium"], ["utm_campaign", "campaign_name"]]) {
    const value = pageUrl.searchParams.get(parameter);
    if (value) config[field] = value.slice(0, 100);
  }
  gtag("config", measurementId, config);
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  document.head.appendChild(script);
  const item = (product, quantity = 1) => ({
    item_id: String(product.productId || product.id || ''),
    item_name: String(product.name || ''),
    item_brand: 'ROMIX',
    item_category: String(product.type || product.category || ''),
    price: Math.max(0, Number(product.price) || 0),
    quantity: Math.max(1, Number(quantity) || 1)
  });
  const event = (name, products) => {
    const items = products.map(product => item(product, product.qty || product.quantity || 1));
    gtag('event', name, { currency: 'ARS', value: items.reduce((total, entry) => total + entry.price * entry.quantity, 0), items });
  };
  let viewedId = '';
  const viewProduct = product => {
    if (!product || String(product.id) === viewedId) return;
    viewedId = String(product.id);
    event('view_item', [{ ...product, qty: 1 }]);
  };
  window.romixAnalytics = { trackWhatsApp: cart => event('whatsapp_order_click', cart) };
  window.addEventListener('romix:product-viewed', e => viewProduct(e.detail.product));
  window.addEventListener('romix:analytics-cart-added', e => event('add_to_cart', [e.detail.item]));
  if (window.romixViewedProduct) viewProduct(window.romixViewedProduct);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { initAnalytics };
} else {
  initAnalytics({ window, location, document });
}
