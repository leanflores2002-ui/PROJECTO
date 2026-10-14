#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const COLOR_DEFINITIONS = [
  { key: "multicolor", label: "Multicolor", hex: "#f7c948", aliases: ["multicolor", "estampado", "estampada", "print", "floreado"] },
  { key: "negro", label: "Negro", hex: "#000000", aliases: ["negro", "black"] },
  { key: "blanco", label: "Blanco", hex: "#ffffff", aliases: ["blanco", "white"] },
  { key: "azul", label: "Azul", hex: "#007bff", aliases: ["azul", "azul jaspeado", "azul oscuro", "azul marino"] },
  { key: "rosa", label: "Rosa", hex: "#ff69b4", aliases: ["rosa", "fucsia"] },
  { key: "verde", label: "Verde", hex: "#28a745", aliases: ["verde", "verde jaspeado"] },
  { key: "rojo", label: "Rojo", hex: "#dc3545", aliases: ["rojo", "rojo jaspeado", "bordo"] },
  { key: "morado", label: "Violeta", hex: "#6f42c1", aliases: ["violeta", "morado", "lila", "purpura", "púrpura"] },
  { key: "naranja", label: "Naranja", hex: "#fd7e14", aliases: ["naranja", "coral"] },
  { key: "amarillo", label: "Amarillo", hex: "#ffc107", aliases: ["amarillo", "mostaza"] },
  { key: "marron", label: "Marron", hex: "#795548", aliases: ["marron", "marrón", "chocolate", "caqui", "camel", "beige"] },
  { key: "gris", label: "Gris", hex: "#adb5bd", aliases: ["gris", "gris jaspeado", "gris oscuro", "plomo"] },
];

const COLOR_ALIAS_MAP = {};
COLOR_DEFINITIONS.forEach((def) => {
  COLOR_ALIAS_MAP[String(def.key).toLowerCase()] = def.key;
  def.aliases.forEach((alias) => {
    COLOR_ALIAS_MAP[String(alias).toLowerCase()] = def.key;
  });
});

function canonicalColorKey(name) {
  const raw = String(name || "").trim().toLowerCase();
  if (!raw) return "";
  return COLOR_ALIAS_MAP[raw] || raw;
}

function normalizeProduct(raw) {
  const product = Object.assign({}, raw);
  product.name = product.name ? String(product.name) : "";
  product.type = product.type ? String(product.type) : "";
  product.section = product.section ? String(product.section) : "";
  product.sizes = Array.isArray(product.sizes) ? product.sizes : [];
  product.colors = normalizeColors(product.colors);
  return product;
}

function normalizeColors(raw) {
  if (Array.isArray(raw)) {
    return raw.map((color) => ({ name: String(color && color.name ? color.name : color || "").trim() }));
  }
  if (raw && typeof raw === "object") {
    return Object.keys(raw).map((key) => ({ name: String(key).trim(), url: raw[key] }));
  }
  return [];
}

function normalizedSet(value, normalizer = (x) => x) {
  const set = new Set();
  if (value == null) return set;
  const iterable = value instanceof Set ? value : Array.isArray(value) ? value : [value];
  for (const entry of iterable) {
    const normalized = String(normalizer(entry) || "").trim().toLowerCase();
    if (normalized) set.add(normalized);
  }
  return set;
}

function filterProducts(list, options = {}) {
  const { types, sizes, colors, query = "", sort } = options;
  const typeSet = normalizedSet(types);
  const sizeSet = normalizedSet(sizes);
  const colorSet = normalizedSet(colors, canonicalColorKey);
  const q = String(query || "").trim().toLowerCase();
  const base = q
    ? list.filter((product) => {
        const text = [product.name, product.type, product.badge].map((piece) => String(piece || "").toLowerCase()).join(" ");
        return text.includes(q);
      })
    : list.slice();
  const filtered = base.filter((product) => {
    if (typeSet.size && !typeSet.has(String(product.type || "").trim().toLowerCase())) {
      return false;
    }
    if (sizeSet.size) {
      const available = product.sizes.map((size) => String(size && size.size || "").trim().toLowerCase());
      if (!available.some((size) => sizeSet.has(size))) return false;
    }
    if (colorSet.size) {
      const availableColors = product.colors.map((color) => canonicalColorKey(color.name));
      if (!availableColors.some((color) => colorSet.has(color))) return false;
    }
    return true;
  });
  if (sort === "price-asc") {
    filtered.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  } else if (sort === "price-desc") {
    filtered.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  }
  return filtered;
}

function runTests() {
  const dataFile = path.join(__dirname, "..", "frontend", "public", "assets", "data", "products.json");
  const raw = fs.readFileSync(dataFile, "utf8");
  const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
  assert(Array.isArray(parsed), "El archivo de productos debe contener un arreglo.");
  const products = parsed.map(normalizeProduct);
  assert(products.length > 0, "No se encontraron productos en el dataset.");

  const sectionMap = {
    hombre: ["hombre", "hombres"],
    mujer: ["mujer", "mujeres"],
    ninos: ["ninos", "ninas"],
  };
  Object.entries(sectionMap).forEach(([name, aliases]) => {
    const matches = products.filter((product) =>
      aliases.includes(String(product.section || "").toLowerCase())
    );
    assert(matches.length > 0, `No hay productos para la sección ${name}.`);
  });

  const aliasTests = [
    { input: "Black", expected: "negro" },
    { input: "Azul oscuro", expected: "azul" },
    { input: "Camel", expected: "marron" },
  ];
  aliasTests.forEach(({ input, expected }) => {
    assert.strictEqual(
      canonicalColorKey(input),
      expected,
      `El alias "${input}" debería canonicalizarse como "${expected}".`
    );
  });

  const sample = products.find((product) => product.type && product.sizes.length && product.colors.length);
  assert(sample, "No se encontró un producto con tipo, talle y color definidos.");
  const token = (sample.name || "").split(/\s+/)[0] || "";
  const filtered = filterProducts(products, {
    types: new Set([sample.type]),
    sizes: new Set([String(sample.sizes[0].size)]),
    colors: new Set([sample.colors[0].name]),
    query: token,
    sort: "price-asc",
  });
  assert(filtered.length >= 1, "La combinación de filtros básicos debería devolver al menos un producto.");

  const noColor = filterProducts(products, { colors: new Set(["sin-color"]) });
  assert(noColor.length === 0, "Agregar un color inexistente no debe devolver resultados.");

  const sortedDesc = filterProducts(products, { sort: "price-desc" });
  if (sortedDesc.length > 1) {
    assert(
      Number(sortedDesc[0].price || 0) >= Number(sortedDesc[sortedDesc.length - 1].price || 0),
      "El orden descendente por precio debería mostrar primero el producto más caro."
    );
  }

  console.log(`Filter tests ok – ${products.length} productos validados, muestra: "${sample.name || "sin nombre"}".`);
}

try {
  runTests();
} catch (err) {
  console.error("Los tests de filtros fallaron:", err);
  process.exit(1);
}
