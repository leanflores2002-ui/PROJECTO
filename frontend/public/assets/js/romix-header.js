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

  function createArrowIcon() {
    var arrow = document.createElement("span");
    arrow.className = "mobile-nav-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.setAttribute("data-romix-icon", "ArrowRight");
    arrow.setAttribute("data-romix-icon-size", "sm");
    return arrow;
  }

  function ensureMobileDrawerLinks(header) {
    var nav = header.querySelector(".mega-nav");
    var mainNav = header.querySelector(".main-nav");
    if (!nav || !mainNav) return;

    mainNav.querySelectorAll(".mega-trigger").forEach(function (trigger) {
      if (!trigger.querySelector(".mobile-nav-arrow")) trigger.appendChild(createArrowIcon());
    });

    if (nav.querySelector(".mobile-drawer-links")) return;

    var shortcuts = [
      { label: "Catálogo completo", href: "catalogo.html" },
      { label: "Ayuda", href: "ayuda.html#faq" },
      { label: "Guía de talles", href: "ayuda.html#size-guide" }
    ];
    var shortcutNav = document.createElement("nav");
    shortcutNav.className = "mobile-drawer-links";
    shortcutNav.setAttribute("aria-label", "Atajos");
    shortcuts.forEach(function (shortcut) {
      var link = document.createElement("a");
      link.href = shortcut.href;
      link.dataset.megaLink = "true";
      link.appendChild(document.createTextNode(shortcut.label));
      link.appendChild(createArrowIcon());
      shortcutNav.appendChild(link);
    });
    nav.appendChild(shortcutNav);
  }

  function buildHref(page, params) {
    var rawPage = String(page || "");
    var hashIndex = rawPage.indexOf("#");
    var hash = hashIndex >= 0 ? rawPage.slice(hashIndex) : "";
    var pageWithoutHash = hashIndex >= 0 ? rawPage.slice(0, hashIndex) : rawPage;
    var queryIndex = pageWithoutHash.indexOf("?");
    var basePage = queryIndex >= 0 ? pageWithoutHash.slice(0, queryIndex) : pageWithoutHash;
    var search = new URLSearchParams(queryIndex >= 0 ? pageWithoutHash.slice(queryIndex + 1) : "");
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
    return basePage + (query ? "?" + query : "") + hash;
  }

  function buildMenuConfig() {
    var mujer = "/mujer/";
    var hombre = "/hombre/";
    var ninos = "/ninos/";
    var novedades = "catalogo.html?view=novedades";
    var ofertas = "catalogo.html?q=oferta";
    var catalogo = "catalogo.html";

    return [
      {
        key: "mujer",
        label: "Mujer",
        page: mujer,
        promo: {
          eyebrow: "Mujer",
          title: "Campera estampada",
          cta: "Ver producto",
          href: buildHref(mujer, { q: "campera lycra estampado" }),
          image: "images/products/campera_lycra_estampado_1.webp",
          alt: "Campera deportiva estampada ROMIX para mujer"
        },
        viewAllLabel: "Ver todo mujer",
        columns: [
          {
            title: "Prendas superiores",
            links: [
              { label: "Remeras", href: buildHref(mujer, { tipo: "remeras" }) },
              { label: "Musculosas", href: buildHref(mujer, { tipo: "musculosas" }) },
              { label: "Tops", href: buildHref(mujer, { tipo: "tops" }) },
              { label: "Buzos", href: buildHref(mujer, { tipo: "buzos" }) },
              { label: "Sudaderas", href: buildHref(mujer, { tipo: "sudaderas" }) },
              { label: "Camperas", href: buildHref(mujer, { tipo: "camperas" }) }
            ]
          },
          {
            title: "Prendas inferiores",
            links: [
              { label: "Pantalones", href: buildHref(mujer, { tipo: "pantalones" }) },
              { label: "Palazos", href: buildHref(mujer, { tipo: "palazos" }) },
              { label: "Calzas", href: buildHref(mujer, { tipo: "calzas" }) },
              { label: "Capri", href: buildHref(mujer, { tipo: "capri" }) },
              { label: "Ciclistas", href: buildHref(mujer, { tipo: "ciclistas" }) },
              { label: "Polleras", href: buildHref(mujer, { tipo: "polleras" }) }
            ]
          },
          {
            title: "Más categorías",
            links: [
              { label: "Bermudas", href: buildHref(mujer, { tipo: "bermudas" }) },
              { label: "Shorts", href: buildHref(mujer, { tipo: "shorts" }) },
              { label: "Invierno", href: buildHref(mujer, { temporada: "invierno" }) },
              { label: "Media estación", href: buildHref(mujer, { temporada: "media-estacion" }) },
              { label: "Verano", href: buildHref(mujer, { temporada: "verano" }) }
            ]
          },
          {
            title: "ROMIX Mujer",
            links: [
              { label: "Ver todo", href: mujer },
              { label: "Novedades", href: novedades },
              { label: "Ofertas", href: ofertas }
            ]
          }
        ]
      },
      {
        key: "hombre",
        label: "Hombre",
        page: hombre,
        promo: {
          eyebrow: "Hombre",
          title: "Prendas para todos los días",
          cta: "Ver productos",
          href: hombre,
          image: "images/products/campera_jaspeado_saplex_hombre_negro.webp",
          alt: "Campera ROMIX para hombre"
        },
        columns: [
          {
            title: "Prendas superiores",
            links: [
              { label: "Remeras", href: buildHref(hombre, { tipo: "remeras" }) },
              { label: "Buzos", href: buildHref(hombre, { tipo: "buzos" }) },
              { label: "Camperas", href: buildHref(hombre, { tipo: "camperas" }) }
            ]
          },
          {
            title: "Prendas inferiores",
            links: [
              { label: "Pantalones", href: buildHref(hombre, { tipo: "pantalones" }) },
              { label: "Bermudas", href: buildHref(hombre, { tipo: "bermudas" }) }
            ]
          },
          {
            title: "Temporada",
            links: [
              { label: "Invierno", href: buildHref(hombre, { temporada: "invierno" }) },
              { label: "Media estación", href: buildHref(hombre, { temporada: "media-estacion" }) },
              { label: "Verano", href: buildHref(hombre, { temporada: "verano" }) }
            ]
          }
        ]
      },
      {
        key: "ninos",
        label: "Niños",
        page: ninos,
        promo: {
          eyebrow: "Niños",
          title: "Ropa para moverse",
          cta: "Ver productos",
          href: ninos,
          image: "images/products/remera_oversize_algodon_peinado_chico_azul.webp",
          alt: "Campera infantil ROMIX"
        },
        columns: [
          {
            title: "Prendas superiores",
            links: [
              { label: "Remeras", href: buildHref(ninos, { tipo: "remeras" }) },
              { label: "Tops", href: buildHref(ninos, { tipo: "tops" }) }
            ]
          },
          {
            title: "Prendas inferiores",
            links: [
              { label: "Calzas", href: buildHref(ninos, { tipo: "calzas" }) },
              { label: "Ciclistas", href: buildHref(ninos, { tipo: "ciclistas" }) },
              { label: "Pantalones", href: buildHref(ninos, { tipo: "pantalones" }) },
              { label: "Bermudas", href: buildHref(ninos, { tipo: "bermudas" }) },
              { label: "Shorts", href: buildHref(ninos, { tipo: "shorts" }) }
            ]
          },
          {
            title: "Temporada",
            links: [
              { label: "Invierno", href: buildHref(ninos, { temporada: "invierno" }) },
              { label: "Media estación", href: buildHref(ninos, { temporada: "media-estacion" }) },
              { label: "Verano", href: buildHref(ninos, { temporada: "verano" }) }
            ]
          }
        ]
      },
      {
        key: "novedades",
        label: "Novedades",
        page: novedades,
        promo: {
          eyebrow: "Novedades",
          title: "Lo nuevo de ROMIX",
          cta: "Ver productos",
          href: novedades,
          image: "images/products/campera_oversize_algodon_rustico_azul.webp",
          alt: "Nueva coleccion ROMIX"
        },
        columns: [
          {
            title: "Por sección",
            links: [
              { label: "Mujer", href: mujer },
              { label: "Hombre", href: hombre },
              { label: "Niños", href: ninos }
            ]
          },
          {
            title: "Por temporada",
            links: [
              { label: "Invierno", href: buildHref(novedades, { temporada: "invierno" }) },
              { label: "Media estación", href: buildHref(novedades, { temporada: "media-estacion" }) },
              { label: "Verano", href: buildHref(novedades, { temporada: "verano" }) }
            ]
          },
          {
            title: "Catálogo",
            links: [
              { label: "Novedades", href: novedades },
              { label: "Ofertas", href: ofertas },
              { label: "Todos los productos", href: catalogo }
            ]
          }
        ]
      },
      {
        key: "ofertas",
        label: "Ofertas",
        page: ofertas,
        utilityOnly: true
      }
    ];
  }

  var MENU_CONFIG = buildMenuConfig();

  function getCurrentPage() {
    return (location.pathname.split("/").pop() || "index.html").toLowerCase();
  }

  function getCurrentNavKey(currentPage) {
    var category = location.pathname.match(/^\/(mujer|hombre|ninos)\/(?:index.html)?$/);
    if (category) return category[1];
    var exact = MENU_CONFIG.find(function (item) {
      return item.page.toLowerCase() === currentPage;
    });
    if (exact) return exact.key;
    if (currentPage !== "catalogo.html") return "";

    try {
      var params = new URLSearchParams(window.location.search || "");
      var query = normalizeText(params.get("q") || "");
      if (query.indexOf("oferta") >= 0) return "ofertas";
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
        return '' +
          '<li>' +
            '<a class="mega-panel-link" href="' + escapeHtml(link.href) + '" data-mega-link="true" aria-label="' + escapeHtml('Ver ' + link.label + (sectionLabel ? ' de ' + sectionLabel : '')) + '">' +
              escapeHtml(link.label) +
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

  function buildPanel(item) {
    var columns = buildPanelColumns(item.columns || [], item.label);
    var promo = item.promo || {};

    return '' +
      '<div class="mega-panel" id="mega-panel-' + escapeHtml(item.key) + '" role="region" aria-labelledby="mega-trigger-' + escapeHtml(item.key) + '" aria-hidden="true">' +
        '<div class="mega-panel-shell">' +
          '<div class="mega-panel-grid">' +
            '<div class="mega-panel-columns">' + columns + '</div>' +
            '<a class="mega-promo" href="' + escapeHtml(promo.href || item.page) + '" data-mega-link="true" aria-label="' + escapeHtml('Ver producto destacado: ' + (promo.title || item.label)) + '">' +
              '<img src="' + escapeHtml(promo.image && typeof imageUtils.getThumbPath === "function" ? imageUtils.getThumbPath(promo.image) : (promo.image || "images/optimized/branding/romix-logo-360.webp")) + '" alt="' + escapeHtml(promo.alt || item.label) + '" loading="lazy" decoding="async" width="720" height="960" />' +
              '<span class="mega-promo-overlay"></span>' +
              '<span class="mega-promo-copy">' +
                '<span class="mega-promo-eyebrow">' + escapeHtml(promo.eyebrow || "Nueva coleccion") + '</span>' +
                '<strong class="mega-promo-title">' + escapeHtml(promo.title || item.label) + '</strong>' +
                (promo.description ? '<span class="mega-promo-description">' + escapeHtml(promo.description) + '</span>' : '') +
                '<span class="mega-promo-cta">' + escapeHtml(promo.cta || "Ver productos") + '</span>' +
              '</span>' +
            '</a>' +
          '</div>' +
          '<div class="mega-panel-bottom">' +
            '<a class="mega-panel-viewall" href="' + escapeHtml(item.page) + '" data-mega-link="true">' + escapeHtml(item.viewAllLabel || "Ver todo") + '</a>' +
          '</div>' +
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

  function bindUtilityMenu(header, headerState) {
    var toggle = header.querySelector("#toggle-utility-menu");
    var panel = header.querySelector("#header-utility-panel");
    if (!toggle || !panel) return;

    function setOpen(open, restoreFocus) {
      var active = !!open;
      panel.hidden = !active;
      panel.setAttribute("aria-hidden", active ? "false" : "true");
      toggle.setAttribute("aria-expanded", active ? "true" : "false");
      header.classList.toggle("utility-menu-open", active);
      if (active) {
        window.requestAnimationFrame(function () {
          var firstLink = panel.querySelector("a[href]");
          if (firstLink) firstLink.focus();
        });
      } else if (restoreFocus) {
        toggle.focus();
      }
    }

    headerState.closeUtilities = function (restoreFocus) {
      if (panel.hidden) return;
      setOpen(false, !!restoreFocus);
    };

    toggle.addEventListener("click", function () {
      var willOpen = panel.hidden;
      if (willOpen) {
        if (typeof headerState.closeSearch === "function") headerState.closeSearch();
        if (typeof headerState.closeMega === "function") headerState.closeMega();
        setOpen(true, false);
      } else {
        setOpen(false, true);
      }
    });

    panel.addEventListener("click", function (event) {
      var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (link) setOpen(false, false);
    });

    document.addEventListener("click", function (event) {
      if (!panel.hidden && !header.contains(event.target)) setOpen(false, false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) {
        event.preventDefault();
        setOpen(false, true);
      }
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
        if (typeof headerState.closeUtilities === "function") headerState.closeUtilities(false);
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
    var openTimer = null;
    var closeTimer = null;
    var OPEN_DELAY_MS = 50;
    var CLOSE_DELAY_MS = 80;

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

    function cancelScheduledOpen() {
      if (!openTimer) return;
      window.clearTimeout(openTimer);
      openTimer = null;
    }

    function scheduleOpen(key) {
      if (!isDesktop()) {
        openMenu(key);
        return;
      }
      cancelScheduledOpen();
      cancelScheduledClose();
      openTimer = window.setTimeout(function () {
        openTimer = null;
        openMenu(key);
      }, OPEN_DELAY_MS);
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

    function syncTriggerSemantics() {
      items.forEach(function (item) {
        var trigger = item.querySelector(".mega-trigger");
        var panel = item.querySelector(".mega-panel");
        if (!trigger) return;
        if (isDesktop()) {
          trigger.setAttribute("aria-expanded", item.classList.contains("is-open") ? "true" : "false");
          if (panel) trigger.setAttribute("aria-controls", panel.id);
          return;
        }
        trigger.removeAttribute("aria-expanded");
        trigger.removeAttribute("aria-controls");
      });
    }

    function openMenu(key) {
      if (!key) return;
      cancelScheduledOpen();
      if (isSearchOpen()) {
        closeMenu();
        return;
      }
      cancelScheduledClose();
      if (typeof headerState.closeSearch === "function") headerState.closeSearch();
      if (typeof headerState.closeUtilities === "function") headerState.closeUtilities(false);
      setOpenKey(key);
    }

    function closeMenu() {
      cancelScheduledOpen();
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
        scheduleOpen(key);
      });

      item.addEventListener("focusin", function () {
        if (!isDesktop()) return;
        if (isSearchOpen()) return;
        scheduleOpen(key);
      });

      item.addEventListener("mouseleave", function () {
        if (!isDesktop()) return;
        cancelScheduledOpen();
        scheduleClose();
      });

      if (panel) {
        panel.addEventListener("mouseenter", function () {
          if (!isDesktop()) return;
          scheduleOpen(key);
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
        if (!isDesktop()) return;
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
      syncTriggerSemantics();
    }

    syncTriggerSemantics();

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
    nav.inert = isMobile();

    function setOpen(open, options) {
      var active = !!(open && isMobile());
      var wasOpen = document.body.classList.contains("mobile-nav-open");
      document.body.classList.toggle("mobile-nav-open", active);
      header.classList.toggle("mobile-nav-open", active);
      toggle.setAttribute("aria-expanded", active ? "true" : "false");
      scrim.hidden = !active;
      nav.setAttribute("aria-hidden", active || !isMobile() ? "false" : "true");
      nav.inert = isMobile() && !active;
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
      if (willOpen && typeof headerState.closeUtilities === "function") headerState.closeUtilities(false);
      setOpen(willOpen);
    });

    scrim.addEventListener("click", closeMenu);
    if (closeButton) closeButton.addEventListener("click", closeMenu);

    nav.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || typeof target.closest !== "function") return;
      var directLink = target.closest("a[href]");
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
      closeMega: function () {},
      closeUtilities: function () {}
    };

    MENU_CONFIG.forEach(function (item) {
      var navItem = header.querySelector('[data-menu-key="' + item.key + '"]');
      if (!navItem) return;
      if (!item.utilityOnly) navItem.classList.add("mega-nav-item");
      navItem.classList.toggle("is-active", item.key === activeKey);
      var trigger = navItem.querySelector(".mega-trigger");
      if (trigger) {
        trigger.classList.toggle("active", item.key === activeKey);
        if (item.key === activeKey) trigger.setAttribute("aria-current", "page");
        else trigger.removeAttribute("aria-current");
      }
      if (!item.utilityOnly && !navItem.querySelector(".mega-panel")) {
        navItem.insertAdjacentHTML("beforeend", buildPanel(item));
      }
    });

    ensureMobileDrawerLinks(header);

    bindSearchToggle(headerState);
    bindMegaMenu(header, headerState);
    bindMobileMenu(header, headerState);
    bindUtilityMenu(header, headerState);
    bindHeaderFavorites();
    updateCartBadge();
    window.addEventListener("storage", updateCartBadge);
    ensureSearchScript()
      .then(function (autoloaded) {
        dispatchHeaderReady({ rebuilt: false, page: current, activeKey: activeKey, searchAutoloaded: !!autoloaded });
      })
      .catch(function (error) {
        console.error("No se pudo cargar el buscador del header", error);
        dispatchHeaderReady({ rebuilt: false, page: current, activeKey: activeKey, searchAutoloaded: false, searchError: true });
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
