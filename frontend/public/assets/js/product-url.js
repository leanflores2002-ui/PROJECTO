(function (root) {
  function slug(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'producto';
  }
  function productSlug(product) {
    const base = slug(product && (product.name || product.id));
    const id = String(product && product.id || '').trim();
    // The interactive catalog synthesizes this ID. It is not a distinct SKU.
    if (!id || id === `${slug(product.section)}-${base}`) return base;
    const suffix = slug(id);
    return suffix === base || base.endsWith(`-${suffix}`) ? base : `${base}-${suffix}`;
  }
  function detailHref(product) { return `/productos/${productSlug(product)}/`; }
  const api = {productSlug, detailHref};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.romixProductUrl = api;
})(typeof window !== 'undefined' ? window : globalThis);
