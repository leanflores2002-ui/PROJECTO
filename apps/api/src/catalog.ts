import type { Env } from './env';

export type CatalogColor = {
  name: string;
  hex: string;
  image: string;
};

export type CatalogProduct = {
  id: string;
  section: string;
  type: string;
  name: string;
  season: string;
  image: string;
  price: number;
  priceByGroup: Record<string, number>;
  specialSizes: number[];
  colors: CatalogColor[];
  sizes: string[];
  visible: boolean;
};

type CatalogProductRow = {
  id: string;
  section: string;
  type: string;
  name: string;
  season: string | null;
  image: string;
  price: number;
  price_by_group_json: string;
  special_sizes_json: string;
  colors_json: string;
  sizes_json: string;
  visible: number;
};

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function fromRow(row: CatalogProductRow): CatalogProduct {
  return {
    id: row.id,
    section: row.section,
    type: row.type,
    name: row.name,
    season: row.season || '',
    image: row.image,
    price: row.price,
    priceByGroup: parseJson<Record<string, number>>(row.price_by_group_json, {}),
    specialSizes: parseJson<number[]>(row.special_sizes_json, []),
    colors: parseJson<CatalogColor[]>(row.colors_json, []),
    sizes: parseJson<string[]>(row.sizes_json, []),
    visible: row.visible === 1,
  };
}

export type CatalogFilters = {
  query?: string;
  section?: string;
  type?: string;
  limit?: number;
};

export async function listCatalogProducts(env: Env, filters: CatalogFilters = {}): Promise<CatalogProduct[]> {
  if (!env.DB) return [];

  const conditions = ['visible = 1'];
  const bindings: Array<string | number> = [];
  const query = filters.query?.trim();

  if (query) {
    conditions.push('(name LIKE ? OR type LIKE ? OR section LIKE ?)');
    const pattern = `%${query}%`;
    bindings.push(pattern, pattern, pattern);
  }
  if (filters.section) {
    conditions.push('section = ?');
    bindings.push(filters.section);
  }
  if (filters.type) {
    conditions.push('type = ?');
    bindings.push(filters.type);
  }

  const limit = Math.min(Math.max(filters.limit || 60, 1), 200);
  bindings.push(limit);
  const statement = env.DB
    .prepare(`SELECT id, section, type, name, season, image, price, price_by_group_json,
      special_sizes_json, colors_json, sizes_json, visible
      FROM catalog_products
      WHERE ${conditions.join(' AND ')}
      ORDER BY name COLLATE NOCASE ASC
      LIMIT ?`)
    .bind(...bindings);
  const result = await statement.all<CatalogProductRow>();
  return (result.results || []).map(fromRow);
}

export async function getCatalogProduct(env: Env, id: string): Promise<CatalogProduct | null> {
  if (!env.DB) return null;
  const row = await env.DB.prepare(`SELECT id, section, type, name, season, image, price,
    price_by_group_json, special_sizes_json, colors_json, sizes_json, visible
    FROM catalog_products WHERE id = ? AND visible = 1`).bind(id).first<CatalogProductRow>();
  return row ? fromRow(row) : null;
}
