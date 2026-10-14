export const EMPTY_PRODUCT = {
  id: null,
  name: '',
  slug: '',
  sku: '',
  barcode: '',
  audience: 'mujer',
  category_id: '',
  season_key: '',
  description_html: '',
  status: 'draft',
  base_price: '',
  compare_at_price: '',
  tags: '',
  featured: false,
  specifications: { material: '', composition: '', fit: '', origin: '', care: '' },
  collection_ids: [],
  price_groups: { common: '', special: '', special2: '' },
  variants: [],
  images: [],
};

export function normalizeProduct(product) {
  return {
    ...EMPTY_PRODUCT,
    ...product,
    barcode: product.barcode || '',
    category_id: product.category_id || '',
    season_key: product.season_key || '',
    compare_at_price: product.compare_at_price ?? '',
    tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
    specifications: { ...EMPTY_PRODUCT.specifications, ...(product.specifications || {}) },
    collection_ids: (product.collection_ids || []).map(String),
    price_groups: { ...EMPTY_PRODUCT.price_groups, ...(product.price_groups || {}) },
    variants: product.variants || [],
    images: product.images || [],
  };
}
