(function () {
  const DEFAULT_AUTOPLAY_MS = 12000;
  const imageUtils = window.romixImageUtils || {};
  const cardImageSize = imageUtils.dimensions && imageUtils.dimensions.productCard
    ? imageUtils.dimensions.productCard
    : { width: 720, height: 960 };

  function formatPrice(value) {
    if (typeof window.formatPriceARS === 'function') {
      return window.formatPriceARS(value);
    }
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(num);
  }

  function getProductImage(product) {
    if (!product) return '';
    const mainImage = typeof imageUtils.getProductMainImage === 'function'
      ? imageUtils.getProductMainImage(product)
      : (product.image || '');
    if (mainImage && typeof imageUtils.getThumbPath === 'function') return imageUtils.getThumbPath(mainImage);
    return mainImage || '';
  }

  function createCard(product) {
    const card = document.createElement('a');
    card.className = 'promo-card';
    card.href = 'catalogo.html?view=novedades';
    card.setAttribute('aria-label', product && product.name ? product.name : 'Ver novedades');

    const media = document.createElement('div');
    media.className = 'promo-card__media';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = cardImageSize.width;
    img.height = cardImageSize.height;
    img.alt = product && product.name ? product.name : 'Producto';
    img.src = getProductImage(product) || '';
    media.appendChild(img);

    const price = document.createElement('span');
    price.className = 'promo-card__price';
    const value = product && (product.price ?? (product.priceByGroup && product.priceByGroup.common));
    price.textContent = formatPrice(value) || '$ --';
    media.appendChild(price);

    card.appendChild(media);
    const meta = document.createElement('div');
    meta.className = 'promo-card__meta';
    const name = document.createElement('h3');
    name.className = 'promo-card__name';
    name.textContent = product && product.name ? product.name : 'Producto destacado';
    meta.appendChild(name);
    card.appendChild(meta);
    return card;
  }

  window.initPromoBanner = function initPromoBanner(options) {
    const root = document.querySelector('.promo-banner');
    if (!root) return;
    const carousel = root.querySelector('[data-promo-carousel]');
    if (!carousel) return;

    const viewport = carousel.querySelector('[data-carousel-viewport]');
    const track = carousel.querySelector('[data-carousel-track]');
    const dots = carousel.querySelector('[data-carousel-dots]');
    const prevBtn = carousel.querySelector('[data-carousel-prev]');
    const nextBtn = carousel.querySelector('[data-carousel-next]');

    const source = options && Array.isArray(options.products) ? options.products : [];
    const items = source.filter(p => {
      if (!p) return false;
      return typeof imageUtils.getProductMainImage === 'function'
        ? !!imageUtils.getProductMainImage(p)
        : !!(p.image || (p.images && Object.keys(p.images).length));
    }).slice(0, 18);

    if (!items.length) {
      root.classList.add('promo-banner--empty');
      return;
    }

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const autoplayMs = options && Number(options.autoplayMs) > 0 ? Number(options.autoplayMs) : DEFAULT_AUTOPLAY_MS;
    const baseCards = items.map(createCard);

    const state = {
      itemsPerPage: 1,
      step: 0,
      total: items.length,
      pageCount: 1,
      currentPage: 0,
      timer: null
    };

    function updateDots() {
      if (!dots) return;
      Array.from(dots.children).forEach((dot, idx) => {
        if (idx === state.currentPage) dot.classList.add('is-active');
        else dot.classList.remove('is-active');
      });
    }

    function buildDots() {
      if (!dots) return;
      dots.innerHTML = '';
      for (let i = 0; i < state.pageCount; i += 1) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'promo-dot';
        btn.dataset.index = String(i);
        btn.setAttribute('aria-label', `Ir a sección ${i + 1}`);
        if (i === state.currentPage) btn.classList.add('is-active');
        dots.appendChild(btn);
      }
    }

    function measureAndLayout() {
      track.innerHTML = '';
      baseCards.forEach(card => track.appendChild(card));

      const firstCard = track.querySelector('.promo-card');
      if (!firstCard) return;
      const style = window.getComputedStyle(track);
      const gap = parseFloat(style.gap || style.columnGap || '0') || 0;
      const cardWidth = firstCard.getBoundingClientRect().width;
      const step = cardWidth + gap;
      const itemsPerPage = Math.max(1, Math.floor(viewport.clientWidth / step));

      state.itemsPerPage = itemsPerPage;
      state.step = step;
      state.pageCount = Math.max(1, Math.ceil(state.total / itemsPerPage));
      state.currentPage = Math.min(state.currentPage, state.pageCount - 1);

      if (state.total > itemsPerPage) {
        const frag = document.createDocumentFragment();
        const leading = baseCards.slice(-itemsPerPage);
        const trailing = baseCards.slice(0, itemsPerPage);
        leading.forEach(card => frag.appendChild(card.cloneNode(true)));
        baseCards.forEach(card => frag.appendChild(card));
        trailing.forEach(card => frag.appendChild(card.cloneNode(true)));
        track.innerHTML = '';
        track.appendChild(frag);
        requestAnimationFrame(() => {
          viewport.scrollLeft = itemsPerPage * step;
        });
      } else {
        requestAnimationFrame(() => {
          viewport.scrollLeft = 0;
        });
      }

      buildDots();
      updateDots();
    }

    function scrollToPage(pageIndex, behavior = 'smooth') {
      if (state.total <= state.itemsPerPage) return;
      const safeIndex = (pageIndex + state.pageCount) % state.pageCount;
      const offset = state.itemsPerPage * state.step;
      const target = offset + safeIndex * state.itemsPerPage * state.step;
      state.currentPage = safeIndex;
      viewport.scrollTo({ left: target, behavior });
      updateDots();
    }

    function syncPageFromScroll() {
      if (state.total <= state.itemsPerPage) return;
      const offset = state.itemsPerPage * state.step;
      const rawIndex = Math.round((viewport.scrollLeft - offset) / state.step);
      const clampedIndex = Math.max(0, Math.min(state.total - 1, rawIndex));
      const page = Math.floor(clampedIndex / state.itemsPerPage);
      if (page !== state.currentPage) {
        state.currentPage = page;
        updateDots();
      }
    }

    function loopIfNeeded() {
      if (state.total <= state.itemsPerPage) return;
      const offset = state.itemsPerPage * state.step;
      const max = offset + state.total * state.step;
      if (viewport.scrollLeft <= offset - state.step) {
        viewport.scrollLeft += state.total * state.step;
      } else if (viewport.scrollLeft >= max) {
        viewport.scrollLeft -= state.total * state.step;
      }
    }

    function stopAutoplay() {
      if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
      }
    }

    function startAutoplay() {
      if (reduceMotion || autoplayMs <= 0 || state.pageCount <= 1) return;
      stopAutoplay();
      state.timer = setInterval(() => {
        scrollToPage(state.currentPage + 1);
      }, autoplayMs);
    }

    let scrollTimer;
    function handleScroll() {
      syncPageFromScroll();
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(loopIfNeeded, 120);
    }

    if (prevBtn) prevBtn.addEventListener('click', () => scrollToPage(state.currentPage - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => scrollToPage(state.currentPage + 1));
    if (dots) {
      dots.addEventListener('click', (event) => {
        const btn = event.target.closest('button');
        if (!btn || !btn.dataset.index) return;
        scrollToPage(Number(btn.dataset.index));
      });
    }

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);
    carousel.addEventListener('pointerdown', stopAutoplay);
    carousel.addEventListener('pointerup', startAutoplay);
    carousel.addEventListener('pointercancel', startAutoplay);
    viewport.addEventListener('scroll', handleScroll, { passive: true });

    measureAndLayout();
    startAutoplay();
    window.addEventListener('resize', () => {
      measureAndLayout();
      startAutoplay();
    });
  };
})();
