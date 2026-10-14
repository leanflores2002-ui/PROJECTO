const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const lucideVersion = '0.468.0';
const icons = {
  Accessibility: 'accessibility',
  ArrowLeft: 'arrow-left',
  ArrowRight: 'arrow-right',
  Check: 'check',
  ChevronDown: 'chevron-down',
  ChevronLeft: 'chevron-left',
  ChevronRight: 'chevron-right',
  CircleHelp: 'circle-help',
  CircleUserRound: 'circle-user-round',
  Clock: 'clock',
  CreditCard: 'credit-card',
  Eye: 'eye',
  Gem: 'gem',
  Heart: 'heart',
  Instagram: 'instagram',
  Mail: 'mail',
  Map: 'map',
  MapPin: 'map-pin',
  Menu: 'menu',
  MessageCircle: 'message-circle',
  Navigation: 'navigation',
  Minus: 'minus',
  Package: 'package',
  Plus: 'plus',
  RotateCcw: 'rotate-ccw',
  Ruler: 'ruler',
  Search: 'search',
  Share2: 'share-2',
  Shirt: 'shirt',
  ShoppingBag: 'shopping-bag',
  ShoppingCart: 'shopping-cart',
  SlidersHorizontal: 'sliders-horizontal',
  Sparkles: 'sparkles',
  Star: 'star',
  Store: 'store',
  Tag: 'tag',
  Trash2: 'trash-2',
  Truck: 'truck',
  X: 'x',
  Zap: 'zap'
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function serializeIconChildren(children) {
  return children.map(([tag, attrs]) => [tag, attrs]);
}

async function loadIcons() {
  const packageRoot = path.join(__dirname, '..', 'node_modules', 'lucide', 'dist', 'esm', 'icons');
  const entries = {};

  for (const [name, fileName] of Object.entries(icons)) {
    const moduleUrl = pathToFileURL(path.join(packageRoot, fileName + '.js')).href;
    const module = await import(moduleUrl);
    const definition = module.default;
    entries[name] = serializeIconChildren(definition[2]);
  }

  return entries;
}

function buildRuntime(iconEntries) {
  const json = JSON.stringify(iconEntries, null, 2);
  return `/* Generated from lucide@${lucideVersion}; only the ROMIX icon inventory is shipped at runtime. */
(function (window, document) {
  "use strict";

  const ICONS = ${json};
  const SIZES = { xs: 16, sm: 18, md: 20, lg: 24, xl: 28, benefit: 32 };

  function escape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\\"/g, "&quot;");
  }

  function attrsToString(attrs) {
    return Object.entries(attrs || {}).map(function ([key, value]) {
      return " " + key + '=\\"' + escape(value) + '\\"';
    }).join("");
  }

  function renderNode(node) {
    const tag = node[0];
    const attrs = attrsToString(node[1]);
    return "<" + tag + attrs + ">" + (tag === "path" || tag === "line" || tag === "polyline" || tag === "polygon" || tag === "circle" || tag === "rect" ? "" : (node[2] || "")) + "</" + tag + ">";
  }

  function icon(name, options) {
    const opts = options || {};
    const children = ICONS[name];
    if (!children) return "";
    const size = opts.size && SIZES[opts.size] ? SIZES[opts.size] : (Number(opts.size) || SIZES.md);
    const sizeClass = opts.size && SIZES[opts.size] ? "romix-icon--" + opts.size : "";
    const className = ["romix-icon", sizeClass, opts.className || ""].filter(Boolean).join(" ");
    const label = opts.label ? " aria-label=\\"" + escape(opts.label) + "\\" role=\\"img\\"" : " aria-hidden=\\"true\\"";
    return "<svg class=\\"" + escape(className) + "\\" width=\\"" + size + "\\" height=\\"" + size + "\\" viewBox=\\"0 0 24 24\\" fill=\\"none\\" stroke=\\"currentColor\\" stroke-width=\\"2\\" stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\"" + label + ">" + children.map(renderNode).join("") + "</svg>";
  }

  function hydrate(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll("[data-romix-icon]").forEach(function (node) {
      const name = node.getAttribute("data-romix-icon");
      if (!name || node.querySelector("svg")) return;
      const size = node.getAttribute("data-romix-icon-size") || node.dataset.iconSize || "md";
      node.innerHTML = icon(name, { size: size });
    });
  }

  window.romixIcons = Object.freeze({ names: Object.freeze(Object.keys(ICONS)), icon: icon, hydrate: hydrate, sizes: Object.freeze(SIZES) });
  window.romixIcon = icon;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { hydrate(document); });
  } else {
    hydrate(document);
  }
  new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) hydrate(node);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})(window, document);
`;
}

loadIcons().then((iconEntries) => {
  const output = path.join(__dirname, '..', 'frontend', 'public', 'assets', 'js', 'romix-icons.js');
  fs.writeFileSync(output, buildRuntime(iconEntries), 'utf8');
  console.log('ROMIX icon registry generated with lucide@' + lucideVersion + ': ' + Object.keys(iconEntries).length + ' icons.');
});
