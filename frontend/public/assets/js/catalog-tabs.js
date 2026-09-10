(function(){
  const imageUtils = window.romixImageUtils || {};
  const cardImageSize = imageUtils.dimensions && imageUtils.dimensions.productCard
    ? imageUtils.dimensions.productCard
    : { width: 720, height: 960 };
  function qs(name){ const p = new URLSearchParams(location.search); return (p.get(name)||'').trim(); }
  function cap(s){ if(s==='hombre') return 'Hombre'; if(s==='ninos') return 'Niños'; return 'Mujer'; }
  function money(n){ return `$${Number(n||0).toLocaleString('es-AR')}`; }
  function computeTotalStock(p){
    if (p && p.stockByColor) {
      let total=0; for(const k of Object.keys(p.stockByColor)){ const m=p.stockByColor[k]||{}; for(const t of Object.keys(m)) total += Number(m[t]||0); } return total;
    }
    const st=(p.sizes||[]).map(x=>String(x.status||'').toLowerCase());
    return st.reduce((a,s)=> a + (s.includes('unavail')?0:s.includes('low')?2:5), 0);
  }
  function stateFromStock(n){ if(n<=0) return 'out'; if(n<=3) return 'low'; return 'available'; }
  function slugForProduct(product){
    const fallback = (product && product.name) ? product.name : '';
    const romixFn = typeof window.romixSlug === 'function'
      ? window.romixSlug
      : (typeof window.romixSlugify === 'function' ? window.romixSlugify : (typeof window.slugify === 'function' ? window.slugify : null));
    if (romixFn) return romixFn(fallback);
    return defaultSlugify(fallback);
  }
  function hideProduct(product){
    if (!product || typeof product !== 'object') return true;
    if (window.romixProductsStore && typeof window.romixProductsStore.isVisible === 'function') {
      return !window.romixProductsStore.isVisible(product);
    }
    if (typeof window.romixShouldHideProduct === 'function') {
      return window.romixShouldHideProduct(product);
    }
    return product.visible === false;
  }
  function filterVisibleProducts(list){
    return (Array.isArray(list) ? list : []).filter(p => !hideProduct(p));
  }
  function detailHref(product, buy){
    const slugVal = slugForProduct(product);
    const nameVal = typeof window.fixUtf8 === 'function'
      ? window.fixUtf8(product && product.name ? product.name : '')
      : (product && product.name ? product.name : '');
    const pid = typeof window.productId === 'function' ? window.productId(product) : slugVal;
    const base = 'product.html?id=' + encodeURIComponent(pid) +
      '&slug=' + encodeURIComponent(slugVal) +
      '&name=' + encodeURIComponent(nameVal);
    return buy ? base + '&buy=1' : base;
  }

  function render(products, section){
    const grid = document.getElementById('catalog-grid');
    const title = document.getElementById('catalog-title');
    const empty = document.getElementById('catalog-empty');
    title && (title.textContent = 'Colección ' + cap(section));
    if (!grid) return;
    grid.innerHTML = (products||[]).map(p=>{
      const total = computeTotalStock(p); const st = stateFromStock(total);
      const label = st==='out'?'Agotado':(st==='low'?'Por agotarse':'Disponible');
      const price = money(p.price);
      const subtitle = `${cap(p.section||section)} • ${p.type||''}`;
      const badge = p.badge ? `<span class="product-badge">${p.badge}</span>` : '';
      const mainImage = typeof imageUtils.getProductMainImage === 'function'
        ? imageUtils.getProductMainImage(p)
        : (p.image || '');
      const img = typeof imageUtils.getThumbPath === 'function' && mainImage
        ? imageUtils.getThumbPath(mainImage)
        : (mainImage || 'images/placeholder.jpg');
      return `
      <div class="product-card" data-type="${p.type||''}">
        <div class="product-image">
          <img src="${img}" alt="${p.name||''}" loading="lazy" decoding="async" width="${cardImageSize.width}" height="${cardImageSize.height}" onerror="this.onerror=null;this.src='images/placeholder.jpg';"/>
          ${badge}
        </div>
        <div class="product-info">
          <h3 class="product-title" data-name="${p.name||''}">${p.name||''}</h3>
          <div class="product-subtitle">${subtitle}</div>
          <div class="product-price">${price}</div>
          <div class="product-stock-note state-${st}">${label}</div>
          <div class="product-actions">
            <a href="#" class="btn btn-details">Detalles</a>
            <button class="btn btn-primary" type="button">Agregar</button>
          </div>
        </div>
      </div>`;
    }).join('');
    const cards = Array.from(grid.children);
    empty && empty.classList.toggle('hidden', cards.length>0);
    // Wire actions
    cards.forEach((card,i)=>{
      const p = products[i];
      const href = detailHref(p);
      const go = ()=> location.href = href;
      const a = card.querySelector('.btn.btn-details'); a && a.addEventListener('click', (e)=>{ e.preventDefault(); go(); });
      const add = card.querySelector('.btn.btn-primary'); add && add.addEventListener('click', (e)=>{ e.preventDefault(); location.href = detailHref(p, true); });
      const img = card.querySelector('.product-image'); img && img.addEventListener('click', go);
      const t = card.querySelector('.product-title'); t && t.addEventListener('click', go);
    });
  }

  function fetchProducts(section){
    if (window.romixProductsStore && typeof window.romixProductsStore.load === 'function') {
      return window.romixProductsStore
        .load({ preloaded: window.PRELOADED_PRODUCTS })
        .then(list => (list||[]).filter(p => String(p.section||'').toLowerCase()===section))
        .then(list => filterVisibleProducts(list))
        .catch(()=>[]);
    }
    const fromApi = ()=> fetch('/api/products?section='+encodeURIComponent(section)).then(r=>r.ok?r.json():Promise.reject());
    const fromFile = ()=> fetch(new URL('assets/data/products.json', location.href)).then(r=>r.json()).then(list => (list||[]).filter(p => String(p.section||'').toLowerCase()===section));
    return fromApi()
      .catch(fromFile)
      .then(list => filterVisibleProducts(list))
      .catch(()=>[]);
  }
  function setActive(section){
    document.querySelectorAll('.catalog-tab').forEach(b=>{
      const active = b.dataset.section===section; b.classList.toggle('active', active); b.setAttribute('aria-selected', String(active));
    });
  }
  function onTabClick(e){
    const btn = e.currentTarget; const sec = btn.dataset.section; if(!sec) return;
    setActive(sec); render([], sec); // vacía mientras carga
    fetchProducts(sec).then(list=> render(list, sec));
    try { history.replaceState({}, '', '#'+sec); } catch {}
  }

  document.addEventListener('DOMContentLoaded', function(){
    const hash = (location.hash||'').replace('#','');
    const initial = ['mujer','hombre','ninos'].includes(hash) ? hash : 'mujer';
    document.querySelectorAll('.catalog-tab').forEach(b=> b.addEventListener('click', onTabClick));
    setActive(initial);
    fetchProducts(initial).then(list=> render(list, initial));
  });
})();


