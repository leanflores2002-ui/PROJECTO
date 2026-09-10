(function () {
  var imageUtils = window.romixImageUtils || {};

  function normalizeText(value) {
    var raw = value == null ? "" : String(value).trim().toLowerCase();
    if (!raw) return "";
    try {
      return raw.normalize("NFD").replace(/\p{Diacritic}+/gu, "");
    } catch (_error) {
      return raw;
    }
  }

  function normalizeSection(value) {
    var key = normalizeText(value);
    if (["mujer", "mujeres", "dama", "damas"].indexOf(key) >= 0) return "mujer";
    if (["hombre", "hombres", "caballero", "caballeros"].indexOf(key) >= 0) return "hombre";
    if (["ninos", "ninas", "nino", "nina"].indexOf(key) >= 0) return "ninos";
    if (key === "novedades") return "novedades";
    return "";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildHref(page, params) {
    var search = new URLSearchParams();
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (value == null) return;
      if (Array.isArray(value)) {
        var cleanList = value.filter(function (entry) {
          return entry != null && String(entry).trim() !== "";
        });
        if (cleanList.length) search.set(key, cleanList.join(","));
        return;
      }
      var text = String(value).trim();
      if (!text) return;
      search.set(key, text);
    });
    var query = search.toString();
    return page + (query ? "?" + query : "");
  }

  function buildMenuConfig() {
    var mujer = "mujer.html";
    var hombre = "hombre.html";
    var ninos = "ninos.html";
    var novedades = "novedades.html";
    var catalogo = "catalogo.html";

    return [
      {
        key: "mujer",
        label: "Mujer",
        page: mujer,
        promo: {
          eyebrow: "Producto destacado",
          title: "Campera Lycra Estampada",
          description: "Campera deportiva de lycra estampada para mujer. Comodidad y elasticidad para uso diario o entrenamiento.",
          cta: "Ver campera",
          href: buildHref(mujer, { q: "campera lycra estampado" }),
          image: "images/products/campera_lycra_estampado_1.png",
          alt: "Campera deportiva estampada ROMIX para mujer"
        },
        viewAllLabel: "Ver todo mujer",
        guideCard: {
          title: "Guia de talles",
          text: "Medidas claras para elegir mejor cada prenda.",
          href: "ayuda.html#size-guide"
        },
        columns: [
          {
            title: "Destacados",
            links: [
              { label: "Nuevos ingresos", href: buildHref(mujer, { q: "nuevo" }), badge: "NEW", icon: "spark" },
              { label: "Mas vendidos", href: buildHref(mujer, { q: "mas vendido" }), badge: "HOT", icon: "trend" },
              { label: "Media estacion", href: buildHref(mujer, { temporada: "media-estacion" }), icon: "circle" },
              { label: "Verano", href: buildHref(mujer, { temporada: "verano" }), icon: "spark" },
              { label: "Looks deportivos", href: buildHref(mujer, { q_any: "lycra,saplex,deportivo,top,calza" }), icon: "move" }
            ]
          },
          {
            title: "Prendas superiores",
            links: [
              { label: "Remeras", href: buildHref(mujer, { tipo: "remeras" }), icon: "top" },
              { label: "Remeras manga larga", href: buildHref(mujer, { tipo: "remeras", q_any: "manga larga,remera" }), icon: "top" },
              { label: "Tops", href: buildHref(mujer, { tipo: "tops" }), icon: "top" },
              { label: "Buzos", href: buildHref(mujer, { tipo: "buzos" }), icon: "top" },
              { label: "Camperas", href: buildHref(mujer, { tipo: "camperas" }), icon: "jacket" },
              { label: "Musculosas", href: buildHref(mujer, { q: "musculosa" }), icon: "top" }
            ]
          },
          {
            title: "Prendas inferiores",
            links: [
              { label: "Calzas", href: buildHref(mujer, { tipo: "calzas" }), icon: "bottom" },
              { label: "Pantalones jogger", href: buildHref(mujer, { tipo: "pantalones", q: "jogger" }), icon: "bottom" },
              { label: "Pantalones babucha", href: buildHref(mujer, { tipo: "pantalones", q: "babucha" }), icon: "bottom" },
              { label: "Pantalones rectos", href: buildHref(mujer, { tipo: "pantalones", q: "recto" }), icon: "bottom" },
              { label: "Calzas Oxford", href: buildHref(mujer, { tipo: "calzas", q: "oxford" }), icon: "bottom" },
              { label: "Pantalones palazo", href: buildHref(mujer, { tipo: "palazos" }), icon: "bottom" }
            ]
          },
          {
            title: "Telas y estilos",
            links: [
              { label: "Lycra", href: buildHref(mujer, { q: "lycra" }), icon: "fabric" },
              { label: "Morley", href: buildHref(mujer, { q: "morley" }), icon: "fabric" },
              { label: "Algodon", href: buildHref(mujer, { q: "algodon" }), icon: "fabric" },
              { label: "Modal", href: buildHref(mujer, { q: "modal" }), icon: "fabric" },
              { label: "Saplex", href: buildHref(mujer, { q: "saplex" }), icon: "fabric" },
              { label: "Fibrana", href: buildHref(mujer, { q: "fibrana" }), icon: "fabric" }
            ]
          }
        ]
      },
      {
        key: "hombre",
        label: "Hombre",
        page: hombre,
        promo: {
          eyebrow: "Nueva coleccion",
          title: "Movimiento para todos los dias",
          cta: "Ver productos",
          href: buildHref(hombre, { temporada: "media-estacion" }),
          image: "images/products/campera_jaspeado_saplex_hombre_negro.png",
          alt: "Campera ROMIX para hombre"
        },
        columns: [
          {
            title: "Destacados",
            links: [
              { label: "Nuevos ingresos", href: buildHref(hombre, { q: "nuevo" }) },
              { label: "Mas vendidos", href: buildHref(hombre, { q: "mas vendido" }) },
              { label: "Media estacion", href: buildHref(hombre, { temporada: "media-estacion" }) },
              { label: "Verano", href: buildHref(hombre, { temporada: "verano" }) }
            ]
          },
          {
            title: "Parte superior",
            links: [
              { label: "Remeras", href: buildHref(hombre, { tipo: "remeras" }) },
              { label: "Remeras Dry Fit", href: buildHref(hombre, { tipo: "remeras", q: "dry" }) },
              { label: "Buzos", href: buildHref(hombre, { tipo: "buzos" }) },
              { label: "Camperas", href: buildHref(hombre, { tipo: "camperas" }) }
            ]
          },
          {
            title: "Parte inferior",
            links: [
              { label: "Pantalones", href: buildHref(hombre, { tipo: "pantalones" }) },
              { label: "Babuchas", href: buildHref(hombre, { tipo: "pantalones", q: "babucha" }) },
              { label: "Joggers", href: buildHref(hombre, { tipo: "pantalones", q: "jogger" }) },
              { label: "Bermudas", href: buildHref(hombre, { q: "bermuda" }) },
              { label: "Rusticos", href: buildHref(hombre, { q: "rustico" }) }
            ]
          },
          {
            title: "Colecciones",
            links: [
              { label: "Algodon", href: buildHref(hombre, { q: "algodon" }) },
              { label: "Lycra", href: buildHref(hombre, { q: "lycra" }) },
              { label: "Rustico", href: buildHref(hombre, { q: "rustico" }) },
              { label: "Dry Fit", href: buildHref(hombre, { q: "dry" }) },
              { label: "Jaspeado", href: buildHref(hombre, { q: "jaspeado" }) }
            ]
          },
          {
            title: "Accesorios",
            links: [
              { label: "Cuellos", href: buildHref(hombre, { tipo: "accesorios", q: "cuello" }) }
            ]
          }
        ]
      },
      {
        key: "ninos",
        label: "Niños",
        page: ninos,
        promo: {
          eyebrow: "Nueva coleccion",
          title: "Movimiento para todo el dia",
          cta: "Ver productos",
          href: buildHref(ninos, { temporada: "media-estacion" }),
          image: "images/products/remera_oversize_algodon_peinado_chico_azul.png",
          alt: "Campera infantil ROMIX"
        },
        columns: [
          {
            title: "Niñas",
            links: [
              { label: "Calzas", href: buildHref(ninos, { tipo: "calzas", q_any: "nina,nena" }) },
              { label: "Remeras", href: buildHref(ninos, { tipo: "remeras", q_any: "nina,nena" }) },
              { label: "Ciclistas", href: buildHref(ninos, { q: "ciclista" }) },
              { label: "Tops", href: buildHref(ninos, { q: "top" }) },
              { label: "Pantalones", href: buildHref(ninos, { tipo: "pantalones" }) }
            ]
          },
          {
            title: "Niños",
            links: [
              { label: "Pantalones", href: buildHref(ninos, { tipo: "pantalones", q_any: "nino,chico" }) },
              { label: "Remeras", href: buildHref(ninos, { tipo: "remeras", q_any: "nino,chico" }) },
              { label: "Bermudas", href: buildHref(ninos, { q: "bermuda" }) },
              { label: "Calzas", href: buildHref(ninos, { tipo: "calzas" }) },
              { label: "Ciclistas", href: buildHref(ninos, { q: "ciclista" }) }
            ]
          },
          {
            title: "Categorias",
            links: [
              { label: "Calzas", href: buildHref(ninos, { tipo: "calzas" }) },
              { label: "Pantalones", href: buildHref(ninos, { tipo: "pantalones" }) },
              { label: "Remeras", href: buildHref(ninos, { tipo: "remeras" }) },
              { label: "Bermudas", href: buildHref(ninos, { q: "bermuda" }) }
            ]
          },
          {
            title: "Temporada",
            links: [
              { label: "Media estacion", href: buildHref(ninos, { temporada: "media-estacion" }) },
              { label: "Verano", href: buildHref(ninos, { temporada: "verano" }) },
              { label: "Lycra", href: buildHref(ninos, { q: "lycra" }) },
              { label: "Algodon", href: buildHref(ninos, { q: "algodon" }) }
            ]
          }
        ]
      },
      {
        key: "novedades",
        label: "Novedades",
        page: novedades,
        promo: {
          eyebrow: "Nueva coleccion",
          title: "Lo nuevo de ROMIX",
          cta: "Ver productos",
          href: novedades,
          image: "images/products/campera_oversize_algodon_rustico_azul.png",
          alt: "Nueva coleccion ROMIX"
        },
        columns: [
          {
            title: "Novedades",
            links: [
              { label: "Nuevos ingresos", href: buildHref(novedades, { q: "nuevo" }) },
              { label: "Productos destacados", href: novedades },
              { label: "Ultimas colecciones", href: buildHref(novedades, { q_any: "nuevo,coleccion" }) },
              { label: "Mas vendidos", href: buildHref(novedades, { q: "mas vendido" }) }
            ]
          }
        ]
      }
    ];
  }

  var MENU_CONFIG = buildMenuConfig();

  function getCurrentPage() {
    return (location.pathname.split("/").pop() || "index.html").toLowerCase();
  }

  function getCurrentNavKey(currentPage) {
    var exact = MENU_CONFIG.find(function (item) {
      return item.page.toLowerCase() === currentPage;
    });
    if (exact) return exact.key;
    if (currentPage !== "catalogo.html") return "";

    try {
      var params = new URLSearchParams(window.location.search || "");
      var query = normalizeText(params.get("q") || "");
      if (query.indexOf("oferta") >= 0) return "";
      var rawSection = params.get("section")
        || params.get("seccion")
        || params.get("sections")
        || params.get("secciones")
        || "";
      if (!rawSection || rawSection.indexOf(",") >= 0) return "";
      return normalizeSection(rawSection);
    } catch (_error) {
      return "";
    }
  }

  function buildPanelColumns(columns, sectionLabel) {
    return columns.map(function (column) {
      var links = (column.links || []).map(function (link) {
        var badge = link.badge
          ? '<span class="mega-link-badge">' + escapeHtml(link.badge) + '</span>'
          : '';
        var icon = link.icon
          ? '<span class="mega-link-icon" data-icon="' + escapeHtml(link.icon) + '" aria-hidden="true"></span>'
          : '<span class="mega-link-icon" aria-hidden="true"></span>';
        return '' +
          '<li>' +
            '<a class="mega-panel-link" href="' + escapeHtml(link.href) + '" data-mega-link="true" aria-label="' + escapeHtml('Ver ' + link.label + (sectionLabel ? ' de ' + sectionLabel : '')) + '">' +
              icon +
              '<span class="mega-link-label">' + escapeHtml(link.label) + '</span>' +
              badge +
            '</a>' +
          '</li>';
      }).join("");

      return '' +
        '<section class="mega-panel-column" aria-label="' + escapeHtml(column.title) + '">' +
          '<p class="mega-panel-title">' + escapeHtml(column.title) + '</p>' +
          '<ul class="mega-panel-list">' + links + '</ul>' +
        '</section>';
    }).join("");
  }

  function buildAccessories(accessories) {
    if (!accessories || !Array.isArray(accessories.links) || !accessories.links.length) return "";

    var links = accessories.links.map(function (link) {
      return '' +
        '<a class="mega-accessory-link" href="' + escapeHtml(link.href) + '" data-mega-link="true">' +
          '<span class="mega-accessory-icon" data-icon="' + escapeHtml(link.icon || "circle") + '" aria-hidden="true"></span>' +
          '<span>' + escapeHtml(link.label) + '</span>' +
        '</a>';
    }).join("");

    return '' +
      '<div class="mega-accessories" aria-label="' + escapeHtml(accessories.title || "Accesorios") + '">' +
        '<span class="mega-accessories-title">' + escapeHtml(accessories.title || "Accesorios") + '</span>' +
        '<div class="mega-accessories-row">' + links + '</div>' +
      '</div>';
  }

  function buildGuideCard(card) {
    if (!card || !card.href) return "";

    return '' +
      '<a class="mega-guide-card" href="' + escapeHtml(card.href) + '" data-mega-link="true">' +
        '<span class="mega-guide-icon" aria-hidden="true"></span>' +
        '<span class="mega-guide-copy">' +
          '<strong>' + escapeHtml(card.title || "Guia de talles") + '</strong>' +
          '<small>' + escapeHtml(card.text || "Consulta medidas y referencias.") + '</small>' +
        '</span>' +
      '</a>';
  }

  function buildPanel(item) {
    var columns = buildPanelColumns(item.columns || [], item.label);
    var promo = item.promo || {};
    var accessories = buildAccessories(item.accessories);
    var guideCard = buildGuideCard(item.guideCard);
    var bottom = accessories || guideCard
      ? '<div class="mega-panel-bottom">' + accessories + guideCard + '</div>'
      : '';

    return '' +
      '<div class="mega-panel" id="mega-panel-' + escapeHtml(item.key) + '" role="region" aria-labelledby="mega-trigger-' + escapeHtml(item.key) + '" aria-hidden="true">' +
        '<div class="mega-panel-shell">' +
          '<div class="mega-panel-top">' +
            '<div class="mega-panel-copy">' +
              '<span class="mega-panel-kicker">Explora ' + escapeHtml(item.label) + '</span>' +
              '<a class="mega-panel-viewall" href="' + escapeHtml(item.page) + '" data-mega-link="true">' + escapeHtml(item.viewAllLabel || "Ver todo") + '</a>' +
            '</div>' +
          '</div>' +
          '<div class="mega-panel-grid">' +
            '<div class="mega-panel-columns">' + columns + '</div>' +
            '<a class="mega-promo" href="' + escapeHtml(promo.href || item.page) + '" data-mega-link="true" aria-label="' + escapeHtml('Ver producto destacado: ' + (promo.title || item.label)) + '">' +
              '<img src="' + escapeHtml(promo.image && typeof imageUtils.getThumbPath === "function" ? imageUtils.getThumbPath(promo.image) : (promo.image || "images/logo-romix.png")) + '" alt="' + escapeHtml(promo.alt || item.label) + '" loading="lazy" decoding="async" width="720" height="960" />' +
              '<span class="mega-promo-overlay"></span>' +
              '<span class="mega-promo-copy">' +
                '<span class="mega-promo-eyebrow">' + escapeHtml(promo.eyebrow || "Nueva coleccion") + '</span>' +
                '<strong class="mega-promo-title">' + escapeHtml(promo.title || item.label) + '</strong>' +
                (promo.description ? '<span class="mega-promo-description">' + escapeHtml(promo.description) + '</span>' : '') +
                '<span class="mega-promo-cta">' + escapeHtml(promo.cta || "Ver productos") + '</span>' +
              '</span>' +
            '</a>' +
          '</div>' +
          bottom +
        '</div>' +
      '</div>';
  }

  function getCartQty() {
    try {
      var raw = localStorage.getItem("romix_cart");
      if (!raw) raw = localStorage.getItem("cart");
      var parsed = JSON.parse(raw || "[]");
      if (!Array.isArray(parsed)) return 0;
      return parsed.reduce(function (sum, item) {
        var qty = Number((item && (item.quantity || item.qty)) || 1);
        return sum + (Number.isFinite(qty) && qty > 0 ? qty : 0);
      }, 0);
    } catch (_error) {
      return 0;
    }
  }

  function updateCartBadge() {
    var qty = getCartQty();
    var badge = document.getElementById("cart-count");
    if (badge) badge.textContent = String(qty);
  }

  function bindHeaderFavorites() {
    var button = document.querySelector(".header-favorites");
    if (!button) return;
    button.addEventListener("click", function () {
      var active = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", active ? "false" : "true");
    });
  }

  function bindSearchToggle(headerState) {
    var panel = document.getElementById("header-search");
    if (!panel) return;
    headerState.closeSearch = function () {
      if (window.romixSearch && typeof window.romixSearch.close === "function") {
        window.romixSearch.close();
        return;
      }
      panel.classList.remove("is-open", "romix-search-panel-open");
      document.body.classList.remove("header-search-open", "romix-search-open");
    };
    window.romixHeaderSearchBridge = {
      beforeOpen: function () {
        if (typeof headerState.closeMega === "function") headerState.closeMega();
        if (typeof headerState.closeMobileMenu === "function") headerState.closeMobileMenu();
      }
    };
  }

  function bindMegaMenu(header, headerState) {
    var nav = header.querySelector(".mega-nav");
    var searchPanel = document.getElementById("header-search");
    if (!nav) return;
    var items = Array.prototype.slice.call(nav.querySelectorAll(".mega-nav-item"));
    if (!items.length) return;

    var mq = window.matchMedia
      ? window.matchMedia("(min-width: 901px)")
      : { matches: true, addEventListener: null, addListener: null };
    var openKey = "";
    var closeTimer = null;
    var CLOSE_DELAY_MS = 180;

    function isDesktop() {
      return mq.matches;
    }

    function isSearchOpen() {
      return !!(
        (searchPanel && (
          searchPanel.classList.contains("is-open") ||
          searchPanel.classList.contains("romix-search-panel-open")
        )) ||
        document.body.classList.contains("romix-search-open") ||
        document.body.classList.contains("header-search-open")
      );
    }

    function cancelScheduledClose() {
      if (!closeTimer) return;
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }

    function scheduleClose() {
      if (!isDesktop()) {
        cancelScheduledClose();
        closeMenu();
        return;
      }
      cancelScheduledClose();
      closeTimer = window.setTimeout(function () {
        closeTimer = null;
        closeMenu();
      }, CLOSE_DELAY_MS);
    }

    function setOpenKey(nextKey) {
      openKey = nextKey || "";
      header.classList.toggle("has-open-menu", !!openKey);

      items.forEach(function (item) {
        var key = item.getAttribute("data-menu-key") || "";
        var open = key === openKey;
        var trigger = item.querySelector(".mega-trigger");
        var panel = item.querySelector(".mega-panel");
        item.classList.toggle("is-open", open);
        if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
        if (panel) panel.setAttribute("aria-hidden", open ? "false" : "true");
      });
    }

    function openMenu(key) {
      if (!key) return;
      if (isSearchOpen()) {
        closeMenu();
        return;
      }
      cancelScheduledClose();
      if (typeof headerState.closeSearch === "function") headerState.closeSearch();
      setOpenKey(key);
    }

    function closeMenu() {
      cancelScheduledClose();
      setOpenKey("");
    }

    headerState.closeMega = closeMenu;

    items.forEach(function (item) {
      var key = item.getAttribute("data-menu-key") || "";
      var trigger = item.querySelector(".mega-trigger");
      var panel = item.querySelector(".mega-panel");
      if (!trigger) return;

      item.addEventListener("mouseenter", function () {
        if (!isDesktop()) return;
        if (isSearchOpen()) return;
        openMenu(key);
      });

      item.addEventListener("focusin", function () {
        if (!isDesktop()) return;
        if (isSearchOpen()) return;
        openMenu(key);
      });

      item.addEventListener("mouseleave", function () {
        if (!isDesktop()) return;
        scheduleClose();
      });

      if (panel) {
        panel.addEventListener("mouseenter", function () {
          if (!isDesktop()) return;
          cancelScheduledClose();
        });
      }

      trigger.addEventListener("click", function (event) {
        if (isDesktop() && isSearchOpen()) {
          event.preventDefault();
          event.stopPropagation();
          closeMenu();
          return;
        }
        if (!isDesktop()) {
          event.preventDefault();
          if (openKey === key) {
            closeMenu();
          } else {
            openMenu(key);
          }
          return;
        }
        if (openKey === key) {
          closeMenu();
          return;
        }
        event.preventDefault();
        openMenu(key);
      });

      trigger.addEventListener("auxclick", function (event) {
        if (event.button !== 1) return;
        if (openKey === key) {
          return;
        }
        event.preventDefault();
      });
    });

    nav.addEventListener("mouseenter", function () {
      if (!isDesktop()) return;
      cancelScheduledClose();
    });

    nav.addEventListener("mouseleave", function () {
      if (!isDesktop()) return;
      scheduleClose();
    });

    header.addEventListener("focusout", function () {
      window.setTimeout(function () {
        if (header.contains(document.activeElement)) return;
        closeMenu();
      }, 0);
    });

    document.addEventListener("click", function (event) {
      var target = event.target;
      if (target && typeof target.closest === "function") {
        if (target.closest("[data-mega-link='true']")) {
          closeMenu();
          return;
        }
      }
      if (header.contains(target)) return;
      closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    function handleViewportChange() {
      closeMenu();
    }

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handleViewportChange);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(handleViewportChange);
    }
  }

  function bindMobileMenu(header, headerState) {
    var toggle = document.getElementById("toggle-mobile-nav");
    var nav = header.querySelector(".mega-nav");
    var scrim = document.getElementById("mobile-nav-scrim");
    var closeButton = document.getElementById("close-mobile-nav");
    if (!toggle || !nav || !scrim) return;

    var mobileMedia = window.matchMedia
      ? window.matchMedia("(max-width: 900px)")
      : { matches: window.innerWidth <= 900, addEventListener: null, addListener: null };

    function isMobile() { return mobileMedia.matches; }

    nav.setAttribute("aria-hidden", isMobile() ? "true" : "false");

    function setOpen(open, options) {
      var active = !!(open && isMobile());
      var wasOpen = document.body.classList.contains("mobile-nav-open");
      document.body.classList.toggle("mobile-nav-open", active);
      header.classList.toggle("mobile-nav-open", active);
      toggle.setAttribute("aria-expanded", active ? "true" : "false");
      scrim.hidden = !active;
      nav.setAttribute("aria-hidden", active ? "false" : "true");
      if (active && closeButton) {
        window.requestAnimationFrame(function () { closeButton.focus(); });
      } else if (wasOpen && options && options.restoreFocus) {
        window.requestAnimationFrame(function () { toggle.focus(); });
      }
    }

    function closeMenu() {
      if (typeof headerState.closeMega === "function") {
        headerState.closeMega();
      }
      setOpen(false, { restoreFocus: true });
    }

    headerState.closeMobileMenu = closeMenu;

    toggle.addEventListener("click", function () {
      var willOpen = !document.body.classList.contains("mobile-nav-open");
      if (willOpen && typeof headerState.closeSearch === "function") headerState.closeSearch();
      if (willOpen && typeof headerState.closeMega === "function") headerState.closeMega();
      setOpen(willOpen);
    });

    scrim.addEventListener("click", closeMenu);
    if (closeButton) closeButton.addEventListener("click", closeMenu);

    nav.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || typeof target.closest !== "function") return;
      var directLink = target.closest("[data-mega-link='true']");
      if (directLink) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
        return;
      }
      if (event.key !== "Tab" || !document.body.classList.contains("mobile-nav-open")) return;
      var focusable = Array.prototype.slice.call(nav.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter(function (node) { return !node.hidden && node.getAttribute("aria-hidden") !== "true"; });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    function handleViewportChange() {
      if (!isMobile()) setOpen(false);
      nav.setAttribute("aria-hidden", isMobile() ? "true" : "false");
    }
    if (typeof mobileMedia.addEventListener === "function") mobileMedia.addEventListener("change", handleViewportChange);
    else if (typeof mobileMedia.addListener === "function") mobileMedia.addListener(handleViewportChange);
  }

  function dispatchHeaderReady(detail) {
    document.dispatchEvent(new CustomEvent("romix:header-ready", { detail: detail || {} }));
  }

  function ensureSearchScript() {
    if (window.romixSearch) return Promise.resolve(false);

    var existing = document.querySelector('script[src*="assets/js/search.js"]');
    if (existing) {
      if (window.romixSearch || existing.dataset.loaded === "1") return Promise.resolve(false);
      return new Promise(function (resolve) {
        existing.addEventListener("load", function () {
          existing.dataset.loaded = "1";
          resolve(false);
        }, { once: true });
        existing.addEventListener("error", function () {
          resolve(false);
        }, { once: true });
      });
    }

    return new Promise(function (resolve) {
      var script = document.createElement("script");
      script.src = "assets/js/search.js?v=13";
      script.async = false;
      script.dataset.romixSearch = "1";
      script.addEventListener("load", function () {
        script.dataset.loaded = "1";
        resolve(true);
      }, { once: true });
      script.addEventListener("error", function () {
        resolve(false);
      }, { once: true });
      document.head.appendChild(script);
    });
  }

  function init() {
    var current = getCurrentPage();
    var activeKey = getCurrentNavKey(current);
    var header = document.querySelector("header.site-header.romix-shared-header");
    if (!header || header.dataset.romixHeaderEnhanced === "1") return;
    header.dataset.romixHeaderEnhanced = "1";
    var headerState = {
      closeSearch: function () {},
      closeMega: function () {}
    };

    MENU_CONFIG.forEach(function (item) {
      var navItem = header.querySelector('[data-menu-key="' + item.key + '"]');
      if (!navItem) return;
      navItem.classList.add("mega-nav-item");
      navItem.classList.toggle("is-active", item.key === activeKey);
      var trigger = navItem.querySelector(".mega-trigger");
      if (trigger) {
        trigger.classList.toggle("active", item.key === activeKey);
        if (item.key === activeKey) trigger.setAttribute("aria-current", "page");
        else trigger.removeAttribute("aria-current");
      }
      if (!navItem.querySelector(".mega-panel")) navItem.insertAdjacentHTML("beforeend", buildPanel(item));
    });

    bindSearchToggle(headerState);
    bindMegaMenu(header, headerState);
    bindMobileMenu(header, headerState);
    bindHeaderFavorites();
    updateCartBadge();
    window.addEventListener("storage", updateCartBadge);
    ensureSearchScript().then(function (autoloaded) {
      dispatchHeaderReady({ rebuilt: false, page: current, activeKey: activeKey, searchAutoloaded: !!autoloaded });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
