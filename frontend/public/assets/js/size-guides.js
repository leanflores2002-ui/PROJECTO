(function () {
  const SIZE_GUIDES = {
    "mujer-parte-inferior": {
      title: "Pantalones y Calzas - Mujer",
      group: "Parte inferior",
      genderLabel: "Mujer",
      image: "images/guia-medidas-pantalon.png",
      imageAlt: "Guia visual para medir pantalones y calzas.",
      columns: ["Talle", "A (Cintura)", "B (Cadera)", "C (Largo total)"],
      rows: [
        ["1", "74-78", "98-102", "109"],
        ["2", "78-82", "102-106", "110"],
        ["3", "82-86", "106-110", "111"],
        ["4", "86-90", "110-114", "112"],
        ["5", "90-94", "114-118", "113"],
        ["6", "94-98", "118-122", "114"],
        ["7", "98-102", "122-126", "115"],
        ["8", "102-106", "126-130", "116"]
      ],
      measure: [
        "A: med\u00ed la cintura en la parte mas angosta.",
        "B: med\u00ed la cadera en la zona de mayor contorno.",
        "C: med\u00ed el largo total de la prenda."
      ]
    },
    "mujer-parte-superior": {
      title: "Camperas, Buzos y Remeras - Mujer",
      group: "Parte superior",
      genderLabel: "Mujer",
      image: "images/guia-medidas-superior.png",
      imageAlt: "Guia visual para medir camperas, buzos y remeras.",
      columns: ["Talle", "A (Busto / Pecho)", "B (Cintura)", "C (Largo total)"],
      rows: [
        ["1", "92-96", "88-92", "61"],
        ["2", "96-100", "92-96", "62"],
        ["3", "100-104", "96-100", "63"],
        ["4", "104-108", "100-104", "64"],
        ["5", "108-112", "104-108", "65"],
        ["6", "112-116", "108-112", "66"],
        ["7", "116-120", "112-116", "67"],
        ["8", "120-124", "116-120", "68"]
      ],
      measure: [
        "A: med\u00ed busto o pecho en la zona de mayor contorno.",
        "B: med\u00ed la cintura de la prenda.",
        "C: med\u00ed el largo total desde hombro hasta ruedo."
      ]
    },
    "hombre-parte-inferior": {
      title: "Pantalones y Calzas - Hombre",
      group: "Parte inferior",
      genderLabel: "Hombre",
      image: "images/guia-medidas-pantalon.png",
      imageAlt: "Guia visual para medir pantalones y calzas.",
      columns: ["Talle", "A (Cintura)", "B (Cadera)", "C (Largo total)"],
      rows: [
        ["1", "74-78", "112-116", "104"],
        ["2", "78-82", "116-120", "105"],
        ["3", "82-86", "120-124", "106"],
        ["4", "86-90", "124-128", "107"],
        ["5", "90-94", "128-132", "108"],
        ["6", "94-98", "132-136", "109"],
        ["7", "98-102", "136-140", "110"],
        ["8", "102-106", "140-144", "111"]
      ],
      measure: [
        "A: med\u00ed cintura sin ajustar la cinta.",
        "B: med\u00ed cadera en la zona de mayor contorno.",
        "C: med\u00ed el largo total de la prenda."
      ]
    },
    "hombre-parte-superior": {
      title: "Camperas, Buzos y Remeras - Hombre",
      group: "Parte superior",
      genderLabel: "Hombre",
      image: "images/guia-medidas-superior.png",
      imageAlt: "Guia visual para medir camperas, buzos y remeras.",
      columns: ["Talle", "A (Busto / Pecho)", "B (Cintura)", "C (Largo total)"],
      rows: [
        ["1", "104-108", "100-104", "66"],
        ["2", "108-112", "104-108", "67"],
        ["3", "112-116", "108-112", "68"],
        ["4", "116-120", "112-116", "69"],
        ["5", "120-124", "116-120", "70"],
        ["6", "124-128", "120-124", "71"],
        ["7", "128-132", "124-128", "72"],
        ["8", "132-136", "128-132", "73"]
      ],
      measure: [
        "A: med\u00ed pecho en la zona de mayor contorno.",
        "B: med\u00ed la cintura de la prenda.",
        "C: med\u00ed el largo total desde hombro hasta ruedo."
      ]
    },
    "ninos-parte-inferior": {
      title: "Pantalones y Calzas - Ni\u00f1os",
      group: "Parte inferior",
      genderLabel: "Ni\u00f1os",
      image: "images/guia-medidas-pantalon.png",
      imageAlt: "Guia visual para medir pantalones y calzas.",
      columns: ["Talle", "A (Cintura)", "B (Cadera)", "C (Largo total)"],
      rows: [
        ["6", "54-56", "62-64", "70"],
        ["8", "56-58", "64-66", "75"],
        ["10", "58-60", "66-68", "80"],
        ["12", "60-62", "68-70", "85"],
        ["14", "62-64", "70-72", "90"],
        ["16", "64-66", "72-74", "95"]
      ],
      measure: [
        "A: med\u00ed cintura de la prenda.",
        "B: med\u00ed cadera en la zona de mayor contorno.",
        "C: med\u00ed el largo total de la prenda."
      ]
    },
    "ninos-parte-superior": {
      title: "Camperas, Buzos y Remeras - Ni\u00f1os",
      group: "Parte superior",
      genderLabel: "Ni\u00f1os",
      image: "images/guia-medidas-superior.png",
      imageAlt: "Guia visual para medir camperas, buzos y remeras.",
      columns: ["Talle", "A (Busto / Pecho)", "B (Cintura)", "C (Largo total)"],
      rows: [
        ["6", "62-64", "54-56", "45"],
        ["8", "64-66", "56-58", "48"],
        ["10", "66-68", "58-60", "51"],
        ["12", "68-70", "60-62", "54"],
        ["14", "70-72", "62-64", "57"],
        ["16", "72-74", "64-66", "60"]
      ],
      measure: [
        "A: med\u00ed pecho en la zona de mayor contorno.",
        "B: med\u00ed la cintura de la prenda.",
        "C: med\u00ed el largo total desde hombro hasta ruedo."
      ]
    },
    general: {
      title: "Gu\u00eda orientativa de talles",
      group: "Orientativa",
      genderLabel: "ROMIX",
      image: "images/guia-medidas-pantalon.png",
      imageAlt: "Guia visual orientativa para medir prendas.",
      columns: [],
      rows: [],
      measure: [
        "No pudimos asociar este producto a una tabla espec\u00edfica.",
        "Comparalo con una prenda similar y consultanos si ten\u00e9s dudas."
      ]
    }
  };

  const LOWER_GUIDE_ALIASES = [
    "calza", "pantalon", "pantalones", "jogger", "babucha", "recto", "recta",
    "oxford", "oxfor", "palazo", "palazzo", "short", "bermuda", "capri"
  ];
  const UPPER_GUIDE_ALIASES = [
    "remera", "camiseta", "buzo", "campera", "top", "chaleco", "musculosa",
    "sudadera", "manga larga", "polar"
  ];

  let activeDrawer = null;
  let lastFocus = null;

  function normalizeText(value) {
    const raw = String(value == null ? "" : value).trim().toLowerCase();
    if (!raw) return "";
    try {
      return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    } catch (_error) {
      return raw;
    }
  }

  function getProductHaystack(product) {
    const fields = [
      product && product.name,
      product && product.nombre,
      product && product.title,
      product && product.titulo,
      product && product.type,
      product && product.tipo,
      product && product.typeKey,
      product && product.tipoKey,
      product && product.typeLabel,
      product && product.tipoLabel,
      product && product.category,
      product && product.categoria,
      product && product.categoryKey,
      product && product.categoriaKey,
      product && product.categoryLabel,
      product && product.categoriaLabel,
      product && product.section,
      product && product.seccion,
      product && product.sectionLabel,
      product && product.seccionLabel,
      product && product.gender,
      product && product.genero,
      product && product.audience,
      product && product.audiencia
    ];

    if (Array.isArray(product && product.tags)) {
      product.tags.forEach((tag) => fields.push(tag));
    }

    return normalizeText(fields.filter(Boolean).join(" "));
  }

  function getProductGender(product) {
    const section = normalizeText(product && (product.section || product.sectionKey || product.gender || product.genero));
    const haystack = getProductHaystack(product);
    const value = `${section} ${haystack}`;

    if (/(ninos|nino|nina|nena|chico|chica|infantil|kids)/.test(value)) return "ninos";
    if (/(hombre|hombres|caballero|caballeros)/.test(value)) return "hombre";
    if (/(mujer|mujeres|dama|damas)/.test(value)) return "mujer";
    return "";
  }

  function getProductPart(product) {
    const haystack = getProductHaystack(product);
    if (LOWER_GUIDE_ALIASES.some((term) => haystack.includes(term))) return "parte-inferior";
    if (UPPER_GUIDE_ALIASES.some((term) => haystack.includes(term))) return "parte-superior";
    return "";
  }

  function getSizeGuideKey(product) {
    const gender = getProductGender(product);
    const part = getProductPart(product);
    const key = gender && part ? `${gender}-${part}` : "";
    return SIZE_GUIDES[key] ? key : "general";
  }

  function getSizeGuideForProduct(product) {
    const key = getSizeGuideKey(product);
    return Object.assign({ key }, SIZE_GUIDES[key] || SIZE_GUIDES.general);
  }

  function formatGuideSubtitle(guide) {
    return String((guide && guide.title) || "Guia orientativa").replace(" - ", " \u00b7 ");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderTable(guide) {
    if (!Array.isArray(guide.rows) || !guide.rows.length) {
      return '<div class="size-guide-empty">Guia orientativa. Las medidas pueden variar segun el modelo.</div>';
    }

    const head = guide.columns.map((column, index) => {
      const label = escapeHtml(column);
      const unit = index > 0 ? '<small>cm</small>' : "";
      return `<th scope="col"><span>${label}</span>${unit}</th>`;
    }).join("");
    const rows = guide.rows.map((row) => (
      `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
    )).join("");

    return '' +
      '<div class="size-guide-drawer__table-wrap">' +
        '<table class="size-guide-drawer__table">' +
          `<thead><tr>${head}</tr></thead>` +
          `<tbody>${rows}</tbody>` +
        '</table>' +
      '</div>';
  }

  function renderGuideImage(guide) {
    if (!guide || !guide.image) return "";

    return '' +
      '<figure class="size-guide-drawer__visual">' +
        '<img src="' + escapeHtml(guide.image) + '" alt="' + escapeHtml(guide.imageAlt || guide.title || "Guia de talles") + '" loading="lazy" decoding="async" />' +
      '</figure>';
  }

  function ensureDrawer() {
    if (activeDrawer) return activeDrawer;

    const root = document.createElement("div");
    root.className = "size-guide-drawer-root";
    root.innerHTML = '' +
      '<div class="size-guide-drawer-backdrop" data-size-guide-close hidden></div>' +
      '<aside class="size-guide-drawer" role="dialog" aria-modal="true" aria-labelledby="size-guide-drawer-title" aria-hidden="true" tabindex="-1">' +
        '<div class="size-guide-drawer__dialog">' +
          '<header class="size-guide-drawer__header">' +
            '<div>' +
              '<span class="size-guide-drawer__eyebrow">ROMIX</span>' +
              '<h2 id="size-guide-drawer-title">Gu&iacute;a de talles</h2>' +
              '<p id="size-guide-drawer-subtitle"></p>' +
            '</div>' +
            '<button type="button" class="size-guide-drawer__x" data-size-guide-close aria-label="Cerrar gu&iacute;a de talles">x</button>' +
          '</header>' +
          '<div class="size-guide-drawer__body" id="size-guide-drawer-body"></div>' +
          '<footer class="size-guide-drawer__footer">' +
            '<button type="button" class="size-guide-drawer__close" data-size-guide-close>Cerrar</button>' +
          '</footer>' +
        '</div>' +
      '</aside>';

    document.body.appendChild(root);

    const drawer = root.querySelector(".size-guide-drawer");
    const backdrop = root.querySelector(".size-guide-drawer-backdrop");
    drawer.inert = true;

    root.addEventListener("click", (event) => {
      const close = event.target && event.target.closest && event.target.closest("[data-size-guide-close]");
      if (close) closeDrawer();
    });

    document.addEventListener("keydown", (event) => {
      if (!root.classList.contains("is-open")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(drawer.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'))
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

    activeDrawer = { root, drawer, backdrop };
    return activeDrawer;
  }

  function openDrawer(product) {
    const guide = getSizeGuideForProduct(product || {});
    const { root, drawer, backdrop } = ensureDrawer();
    const title = root.querySelector("#size-guide-drawer-title");
    const subtitle = root.querySelector("#size-guide-drawer-subtitle");
    const body = root.querySelector("#size-guide-drawer-body");

    if (title) title.innerHTML = "Gu&iacute;a de talles";
    if (subtitle) subtitle.textContent = formatGuideSubtitle(guide);
    if (body) {
      body.innerHTML = '' +
        `<section class="size-guide-drawer__card" data-guide-key="${escapeHtml(guide.key)}">` +
          '<div class="size-guide-drawer__intro">' +
            '<span></span>' +
            '<h3>C&Oacute;MO MEDIR</h3>' +
            '<span></span>' +
          '</div>' +
          '<div class="size-guide-drawer__measure-grid">' +
            renderGuideImage(guide) +
          '</div>' +
          renderTable(guide) +
          '<aside class="size-guide-drawer__note">' +
            '<span class="size-guide-drawer__note-icon" aria-hidden="true">&#9825;</span>' +
            '<span>' +
              '<strong>Ten&eacute; en cuenta</strong>' +
              '<small>Las medidas son aproximadas y pueden variar seg&uacute;n el modelo y la tela de cada prenda.</small>' +
            '</span>' +
          '</aside>' +
        '</section>';
    }

    lastFocus = document.activeElement;
    backdrop.hidden = false;
    drawer.inert = false;
    drawer.setAttribute("aria-hidden", "false");
    root.classList.add("is-open");
    document.body.classList.add("size-guide-drawer-open");
    window.requestAnimationFrame(() => drawer.focus());
  }

  function closeDrawer() {
    if (!activeDrawer) return;
    const { root, drawer, backdrop } = activeDrawer;
    root.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    drawer.inert = true;
    document.body.classList.remove("size-guide-drawer-open");
    backdrop.hidden = true;
    if (lastFocus && typeof lastFocus.focus === "function") {
      window.requestAnimationFrame(() => lastFocus.focus());
    }
  }

  function mountProductButton(product, container) {
    if (!container) return null;
    const guide = getSizeGuideForProduct(product || {});
    container.innerHTML = '' +
      '<button type="button" class="product-size-guide-trigger" aria-haspopup="dialog">' +
        '<span class="product-size-guide-trigger__icon" aria-hidden="true"></span>' +
        '<span class="product-size-guide-trigger__copy">' +
          '<strong>Gu&iacute;a de talles</strong>' +
          '<small>Encontr&aacute; tu talle ideal</small>' +
        '</span>' +
      '</button>';

    const button = container.querySelector(".product-size-guide-trigger");
    button.dataset.sizeGuideKey = guide.key;
    button.addEventListener("click", () => openDrawer(product || {}));
    return button;
  }

  window.romixSizeGuides = {
    guides: SIZE_GUIDES,
    getSizeGuideKey,
    getSizeGuideForProduct,
    mountProductButton,
    open: openDrawer,
    close: closeDrawer
  };
})();
