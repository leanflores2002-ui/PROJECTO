// Shared utilities for ROMIX pages so slug generation and sanitization stay consistent.
(function(global){
  function fixUtf8(s){
    if (!s || typeof s !== 'string') return s;
    let out = s;
    const map = {'ω':'ú','▋':'ó','½':'ó','ï':'í','Â·':'·','Â ':'','Â':'','Ã¡':'á','Ã©':'é','Ãí':'í','Ã­':'í','Ã³':'ó','Ãº':'ú','Ãñ':'ñ','Ã¼':'ü'};
    try { out = decodeURIComponent(escape(out)); } catch {}
    Object.keys(map).forEach(k => { out = out.split(k).join(map[k]); });
    return out;
  }

  function romixSlug(name){
    const clean = fixUtf8(String(name || '')).trim();
    try {
      return clean
        .normalize('NFD')
        .replace(/\p{Diacritic}+/gu,'')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g,'-')
        .replace(/^-+|-+$/g,'');
    } catch {
      return clean
        .toLowerCase()
        .replace(/[^a-z0-9]+/g,'-')
        .replace(/^-+|-+$/g,'');
    }
  }

  function productId(p){
    if (p && p.id) return String(p.id);
    return romixSlug(p && p.name ? p.name : '');
  }

  function sanitizeProduct(p){
    if (!p) return p;
    const copy = Object.assign({}, p);
    ['name','type','section','badge','description'].forEach(k => {
      if (copy[k]) copy[k] = fixUtf8(String(copy[k]));
    });
    if (Array.isArray(copy.colors)) {
      copy.colors = copy.colors.map(c => Object.assign({}, c, { name: fixUtf8(c && c.name) }));
    }
    return copy;
  }
  function shouldHideProduct(p){
    return !p || typeof p !== 'object' || p.visible === false;
  }

  function sanitizeList(list){
    return (Array.isArray(list) ? list.map(sanitizeProduct) : []).filter(item => !shouldHideProduct(item));
  }

  global.fixUtf8 = fixUtf8;
  global.romixSlug = romixSlug;
  global.productId = productId;
  global.sanitizeProduct = sanitizeProduct;
  global.sanitizeList = sanitizeList;
  global.romixSlugify = romixSlug;
  global.slugify = romixSlug;
  global.romix = global.romix || {};
  global.romix.slugify = romixSlug;
  global.romix.shouldHideProduct = shouldHideProduct;
  global.romixShouldHideProduct = shouldHideProduct;
  global.shouldHideProduct = shouldHideProduct;
})(window);
