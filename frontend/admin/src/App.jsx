import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  Boxes,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Copy,
  FolderTree,
  Gauge,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Eye,
  Plus,
  Save,
  Search,
  Settings,
  Shirt,
  Tag,
  Trash2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import { config, hasAuthConfig, isAllowedAdminPath } from './config';
import { useAdminSession } from './hooks/useAdminSession';
import { apiRequest } from './lib/api';
import { supabase } from './lib/supabase';

const NAVIGATION = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Productos', icon: Shirt },
  { id: 'categories', label: 'Categorías', icon: FolderTree },
  { id: 'collections', label: 'Colecciones', icon: Tag },
  { id: 'inventory', label: 'Inventario / Stock', icon: Boxes },
  { id: 'orders', label: 'Pedidos', icon: ClipboardList },
  { id: 'banners', label: 'Banners', icon: Image },
  { id: 'size-guides', label: 'Guía de talles', icon: Gauge },
  { id: 'settings', label: 'Configuración', icon: Settings },
  { id: 'admins', label: 'Usuarios admin', icon: Users },
  { id: 'activity', label: 'Actividad', icon: Activity },
  { id: 'reports', label: 'Reportes', icon: BarChart3 },
];

const EMPTY_PRODUCT = {
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

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const publicAssetUrl = (value) => /^https?:\/\//i.test(value || '')
  ? value
  : `${config.publicSiteUrl}/${String(value || '').replace(/^\/+/, '')}`;

function Spinner({ label = 'Cargando' }) {
  return <div className="spinner" role="status"><span aria-hidden="true" />{label}</div>;
}

function InlineAlert({ kind = 'error', children }) {
  if (!children) return null;
  return <div className={`inline-alert inline-alert--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>;
}

function NotFound() {
  return (
    <main className="not-found">
      <span className="wordmark">ROMIX</span>
      <h1>Página no encontrada</h1>
      <p>La dirección solicitada no está disponible.</p>
    </main>
  );
}

function LoginPage({ initialError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError || '');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError('No se pudo iniciar sesión. Verificá tus credenciales.');
    setBusy(false);
  }

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="ROMIX Admin">
        <span className="wordmark wordmark--large">ROMIX</span>
        <div>
          <h1>Administración del catálogo</h1>
          <p>Productos, stock y pedidos en un único lugar.</p>
        </div>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div>
            <p className="login-card__brand">ROMIX ADMIN</p>
            <h2>Iniciar sesión</h2>
            <p>Acceso exclusivo para administradores autorizados.</p>
          </div>
          <InlineAlert>{error}</InlineAlert>
          <label>Email<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <button className="button button--primary button--wide" disabled={busy} type="submit">
            {busy ? 'Ingresando…' : 'Ingresar'}
          </button>
          <p className="login-card__note">No existe registro público. Las cuentas se crean de forma controlada.</p>
        </form>
      </section>
    </main>
  );
}

function Sidebar({ active, onNavigate, open, onClose }) {
  return (
    <>
      <button className={`sidebar-backdrop ${open ? 'is-open' : ''}`} onClick={onClose} aria-label="Cerrar navegación" />
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar__brand"><span className="wordmark">ROMIX</span><small>ADMIN</small></div>
        <nav aria-label="Navegación administrativa">
          {NAVIGATION.map(({ id, label, icon: Icon }) => (
            <button key={id} className={active === id ? 'is-active' : ''} onClick={() => { onNavigate(id); onClose(); }}>
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}

function Header({ title, subtitle, admin, onMenu }) {
  return (
    <header className="topbar">
      <button className="icon-button menu-button" onClick={onMenu} aria-label="Abrir navegación"><Menu size={21} /></button>
      <div className="breadcrumbs"><span>{title}</span>{subtitle ? <><ChevronRight size={15} /><strong>{subtitle}</strong></> : null}</div>
      <div className="topbar__tools">
        <a href="mailto:" className="topbar__help"><CircleHelp size={18} /><span>Ayuda</span></a>
        <span className="admin-avatar" aria-hidden="true">{(admin?.displayName || admin?.email || 'A').slice(0, 2).toUpperCase()}</span>
        <span className="admin-name">{admin?.displayName || admin?.email || 'Administrador'}</span>
        <button className="icon-button" onClick={() => supabase?.auth.signOut()} aria-label="Cerrar sesión"><LogOut size={18} /></button>
      </div>
    </header>
  );
}

function Metric({ label, value, tone }) {
  return (
    <article className="metric">
      <span className={`metric__mark ${tone ? `metric__mark--${tone}` : ''}`} />
      <div><p>{label}</p><strong>{value ?? '—'}</strong></div>
    </article>
  );
}

function DashboardPage({ token, onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/api/admin/dashboard', { token, signal: controller.signal })
      .then(setData)
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message); });
    return () => controller.abort();
  }, [token]);
  const summary = data?.summary;
  return (
    <div className="page page--dashboard">
      <div className="page-heading"><div><h1>Dashboard</h1><p>Estado real del catálogo, inventario y actividad.</p></div><button className="button button--primary" onClick={() => onNavigate('editor')}><Plus size={17} />Nuevo producto</button></div>
      <InlineAlert>{error}</InlineAlert>
      {!data && !error ? <Spinner label="Cargando resumen" /> : null}
      <section className="metrics-grid" aria-label="Resumen de productos">
        <Metric label="Productos totales" value={summary?.total_products} />
        <Metric label="Publicados" value={summary?.published_products} tone="success" />
        <Metric label="Borradores" value={summary?.draft_products} tone="muted" />
        <Metric label="Ocultos" value={summary?.hidden_products} tone="muted" />
        <Metric label="Stock bajo" value={summary?.low_stock_products} tone="warning" />
        <Metric label="Sin stock" value={summary?.out_of_stock_products} tone="danger" />
      </section>
      <div className="dashboard-columns">
        <section className="panel"><div className="panel__heading"><h2>Pedidos recientes</h2></div>{data?.recentOrders?.length ? <ul className="activity-list">{data.recentOrders.map((order) => <li key={order.id}><div><strong>{order.reference}</strong><span>{order.item_count} unidades</span></div><time>{new Date(order.created_at).toLocaleString('es-AR')}</time></li>)}</ul> : <p className="empty-copy">No hay pedidos registrados.</p>}</section>
        <section className="panel"><div className="panel__heading"><h2>Actividad reciente</h2></div>{data?.recentActivity?.length ? <ul className="activity-list">{data.recentActivity.map((item) => <li key={item.id}><div><strong>{item.action}</strong><span>{item.administrator}</span></div><time>{new Date(item.created_at).toLocaleString('es-AR')}</time></li>)}</ul> : <p className="empty-copy">No hay actividad registrada.</p>}</section>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const labels = { published: 'Publicado', draft: 'Borrador', hidden: 'Oculto', active: 'Activa', inactive: 'Inactiva' };
  return <span className={`status-pill status-pill--${status}`}>{labels[status] || status}</span>;
}

function ProductsPage({ token, onEdit }) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ search: '', status: '', audience: '' });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: '1', page_size: '50' });
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    apiRequest(`/api/admin/products?${params}`, { token, signal: controller.signal })
      .then(setData)
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message); });
    return () => controller.abort();
  }, [filters, token]);
  return (
    <div className="page">
      <div className="page-heading"><div><h1>Productos</h1><p>Administrá publicación, precios y disponibilidad.</p></div><button className="button button--primary" onClick={() => onEdit(null)}><Plus size={17} />Nuevo producto</button></div>
      <section className="panel products-panel">
        <form className="filters" onSubmit={(event) => { event.preventDefault(); setFilters((current) => ({ ...current, search: query })); }}>
          <label className="search-field"><span className="sr-only">Buscar producto</span><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o SKU" /></label>
          <select aria-label="Filtrar por público" value={filters.audience} onChange={(e) => setFilters((current) => ({ ...current, audience: e.target.value }))}><option value="">Todos los públicos</option><option value="mujer">Mujer</option><option value="hombre">Hombre</option><option value="ninos">Niños</option></select>
          <select aria-label="Filtrar por estado" value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}><option value="">Todos los estados</option><option value="published">Publicado</option><option value="draft">Borrador</option><option value="hidden">Oculto</option></select>
          <button className="button button--secondary" type="submit">Buscar</button>
        </form>
        <InlineAlert>{error}</InlineAlert>
        {!data && !error ? <Spinner label="Cargando productos" /> : null}
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Producto</th><th>SKU</th><th>Público</th><th>Categoría</th><th>Stock</th><th>Precio</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{data?.items?.map((product) => <tr key={product.id}><td><button className="product-link" onClick={() => onEdit(product.id)}>{product.name}</button></td><td>{product.sku}</td><td>{product.audience}</td><td>{product.category_name || '—'}</td><td>{product.stock}</td><td>{money.format(product.base_price)}</td><td><StatusPill status={product.status} /></td><td><button className="table-action" onClick={() => onEdit(product.id)}>Editar</button></td></tr>)}</tbody></table></div>
        {data && !data.items.length ? <p className="empty-copy">No se encontraron productos.</p> : null}
      </section>
    </div>
  );
}

function normalizeProduct(product) {
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

function RichTextField({ value, onChange }) {
  const ref = useRef(null);
  function wrap(open, close = open) {
    const input = ref.current;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = value.slice(start, end);
    const next = `${value.slice(0, start)}<${open}>${selected}</${close}>${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => input.focus());
  }
  return (
    <div className="rich-field">
      <div className="rich-toolbar" aria-label="Formato de descripción">
        <button type="button" onClick={() => wrap('strong')} aria-label="Negrita"><strong>B</strong></button>
        <button type="button" onClick={() => wrap('em')} aria-label="Cursiva"><em>I</em></button>
        <button type="button" onClick={() => wrap('ul><li', 'li></ul')} aria-label="Lista">Lista</button>
        <button type="button" onClick={() => wrap('a href=&quot;https://&quot;', 'a')} aria-label="Enlace">Enlace</button>
      </div>
      <textarea ref={ref} rows="5" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Descripción del producto" />
    </div>
  );
}

function ProductEditor({ token, productId, preview, onBack }) {
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(!preview);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ kind: '', text: '' });

  useEffect(() => {
    if (preview) return undefined;
    const controller = new AbortController();
    const resources = [
      apiRequest('/api/admin/categories', { token, signal: controller.signal }),
      apiRequest('/api/admin/collections', { token, signal: controller.signal }),
      productId ? apiRequest(`/api/admin/products/${productId}`, { token, signal: controller.signal }) : Promise.resolve(null),
    ];
    Promise.all(resources)
      .then(([categoryRows, collectionRows, product]) => {
        setCategories(categoryRows);
        setCollections(collectionRows);
        setForm(product ? normalizeProduct(product) : EMPTY_PRODUCT);
      })
      .catch((error) => { if (error.name !== 'AbortError') setMessage({ kind: 'error', text: error.message }); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [preview, productId, token]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateVariant = (index, key, value) => setForm((current) => ({ ...current, variants: current.variants.map((variant, position) => position === index ? { ...variant, [key]: value } : variant) }));
  const addVariant = () => setForm((current) => ({ ...current, variants: [...current.variants, { clientId: crypto.randomUUID(), size: '', color: '', color_hex: '#000000', stock: 0, price_override: '', status: 'active' }] }));
  const removeVariant = (index) => setForm((current) => ({ ...current, variants: current.variants.filter((_variant, position) => position !== index) }));
  const duplicateProduct = () => setForm((current) => ({
    ...current,
    id: null,
    name: current.name ? `${current.name} (copia)` : '',
    slug: '',
    sku: '',
    status: 'draft',
    variants: current.variants.map((variant) => ({ ...variant, id: null, clientId: crypto.randomUUID() })),
  }));
  const previewProduct = () => {
    if (!form.slug) return;
    window.open(`${config.publicSiteUrl}/product.html?slug=${encodeURIComponent(form.slug)}`, '_blank', 'noopener,noreferrer');
  };

  async function save(nextStatus) {
    if (preview) return;
    setSaving(true);
    setMessage({ kind: '', text: '' });
    const decimal = (value) => value === '' || value == null ? null : Number(value);
    const payload = {
      name: form.name.trim(), slug: form.slug.trim() || null, sku: form.sku.trim(), barcode: form.barcode.trim() || null,
      audience: form.audience, category_id: form.category_id || null, season_key: form.season_key.trim() || null,
      description_html: form.description_html, status: nextStatus, base_price: Number(form.base_price || 0),
      compare_at_price: decimal(form.compare_at_price), tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      featured: form.featured, specifications: form.specifications, collection_ids: form.collection_ids,
      price_groups: Object.fromEntries(Object.entries(form.price_groups).filter(([, value]) => value !== '').map(([key, value]) => [key, Number(value)])),
      variants: form.variants.map(({ clientId: _clientId, ...variant }) => ({ ...variant, id: variant.id || null, stock: Number(variant.stock || 0), price_override: decimal(variant.price_override) })),
    };
    try {
      const result = await apiRequest(form.id ? `/api/admin/products/${form.id}` : '/api/admin/products', { token, method: form.id ? 'PUT' : 'POST', body: payload });
      setForm(normalizeProduct(result));
      setMessage({ kind: 'success', text: nextStatus === 'published' ? 'Producto guardado y publicado.' : 'Borrador guardado.' });
    } catch (error) {
      setMessage({ kind: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page"><Spinner label="Cargando editor" /></div>;
  return (
    <div className="editor-page">
      <div className="editor-heading"><div><h1>{form.id ? 'Editar producto' : 'Nuevo producto'}</h1><p>La información publicada será visible en el catálogo ROMIX.</p></div><div className="editor-heading__actions">{preview ? <span className="preview-label">Vista local · sin datos ficticios</span> : null}<button type="button" className="button button--secondary" disabled={!form.slug} onClick={previewProduct}><Eye size={16} />Vista previa</button><button type="button" className="button button--secondary" disabled={!form.id} onClick={duplicateProduct}><Copy size={16} />Duplicar producto</button></div></div>
      <InlineAlert kind={message.kind}>{message.text}</InlineAlert>
      <div className="editor-layout">
        <main className="editor-main">
          <section className="panel editor-section">
            <h2>Imágenes del producto</h2>
            <div className="media-row">
              <button type="button" className="upload-box" disabled title="Se habilita al conectar Supabase Storage"><UploadCloud size={27} /><strong>Subir imágenes</strong><span>JPG, PNG, WEBP o AVIF · Máx. 10 MB</span></button>
              <div className="image-strip">{form.images.length ? form.images.map((item) => <figure key={item.id || item.public_url}><img src={publicAssetUrl(item.public_url)} alt={item.alt_text || form.name} /><figcaption>{item.is_primary ? 'Principal' : 'Galería'}</figcaption></figure>) : <div className="media-empty"><Image size={24} /><span>Sin imágenes cargadas</span></div>}</div>
            </div>
          </section>
          <section className="panel editor-section">
            <h2>Información básica</h2>
            <div className="form-grid">
              <label className="span-2">Nombre del producto <span>*</span><input value={form.name} onChange={(e) => update('name', e.target.value)} required /></label>
              <label>SKU <span>*</span><input value={form.sku} onChange={(e) => update('sku', e.target.value)} required /></label>
              <label>Código de barras <small>(opcional)</small><input value={form.barcode} onChange={(e) => update('barcode', e.target.value)} /></label>
              <label>Público <span>*</span><select value={form.audience} onChange={(e) => update('audience', e.target.value)}><option value="mujer">Mujer</option><option value="hombre">Hombre</option><option value="ninos">Niño</option></select></label>
              <label>Categoría<select value={form.category_id} onChange={(e) => update('category_id', e.target.value)}><option value="">Sin categoría</option>{categories.filter((category) => category.audience === form.audience).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label>Colección<select value={form.collection_ids[0] || ''} onChange={(e) => update('collection_ids', e.target.value ? [e.target.value] : [])}><option value="">Sin colección</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label>
              <label className="span-2">Tags <small>(separados por coma)</small><input value={form.tags} onChange={(e) => update('tags', e.target.value)} placeholder="deportivo, invierno" /></label>
              <label className="span-4">Descripción<RichTextField value={form.description_html} onChange={(value) => update('description_html', value)} /></label>
            </div>
          </section>
          <section className="panel editor-section">
            <div className="panel__heading"><div><h2>Variantes</h2><p>La misma variante alimenta producto e inventario.</p></div><button type="button" className="button button--secondary button--small" onClick={addVariant}><Plus size={15} />Agregar variante</button></div>
            <div className="table-wrap"><table className="variant-table"><thead><tr><th>Talle</th><th>Color</th><th>Stock</th><th>Precio propio</th><th>Estado</th><th><span className="sr-only">Eliminar</span></th></tr></thead><tbody>{form.variants.map((variant, index) => <tr key={variant.id || variant.clientId}><td><input aria-label={`Talle variante ${index + 1}`} value={variant.size} onChange={(e) => updateVariant(index, 'size', e.target.value)} /></td><td><div className="color-input"><input type="color" aria-label={`Color visual ${index + 1}`} value={variant.color_hex || '#000000'} onChange={(e) => updateVariant(index, 'color_hex', e.target.value)} /><input aria-label={`Color variante ${index + 1}`} value={variant.color} onChange={(e) => updateVariant(index, 'color', e.target.value)} /></div></td><td><input type="number" min="0" aria-label={`Stock variante ${index + 1}`} value={variant.stock} onChange={(e) => updateVariant(index, 'stock', e.target.value)} /></td><td><input type="number" min="0" step="0.01" aria-label={`Precio variante ${index + 1}`} value={variant.price_override ?? ''} onChange={(e) => updateVariant(index, 'price_override', e.target.value)} placeholder="Base" /></td><td><select aria-label={`Estado variante ${index + 1}`} value={variant.status} onChange={(e) => updateVariant(index, 'status', e.target.value)}><option value="active">Activa</option><option value="inactive">Inactiva</option></select></td><td><button type="button" className="icon-button icon-button--danger" onClick={() => removeVariant(index)} aria-label={`Quitar variante ${index + 1}`}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>
            {!form.variants.length ? <p className="empty-copy">Todavía no hay variantes. Agregá talle, color y stock.</p> : null}
          </section>
          <section className="panel editor-section">
            <h2>Especificaciones</h2>
            <div className="form-grid form-grid--specs">{[['material', 'Material'], ['composition', 'Composición'], ['fit', 'Calce'], ['origin', 'Origen'], ['care', 'Lavado y cuidado']].map(([key, label]) => <label key={key}>{label}<input value={form.specifications[key] || ''} onChange={(e) => update('specifications', { ...form.specifications, [key]: e.target.value })} /></label>)}</div>
          </section>
        </main>
        <aside className="editor-aside">
          <section className="panel side-panel"><h2>Estado del producto</h2>{[['draft', 'Borrador', 'Solo visible para administradores.'], ['published', 'Publicado', 'Visible en el catálogo público.'], ['hidden', 'Oculto', 'No visible, sin eliminarse.']].map(([value, label, help]) => <label className="status-choice" key={value}><input type="radio" name="status" value={value} checked={form.status === value} onChange={(e) => update('status', e.target.value)} /><span><strong>{label}</strong><small>{help}</small></span></label>)}</section>
          <section className="panel side-panel"><h2>Publicación</h2><label>Temporada<input value={form.season_key} onChange={(e) => update('season_key', e.target.value)} placeholder="invierno" /></label><label className="check-field"><input type="checkbox" checked={form.featured} onChange={(e) => update('featured', e.target.checked)} /><span>Destacar en página principal</span></label></section>
          <section className="panel side-panel"><h2>Precios</h2><label>Precio base <span>*</span><input type="number" min="0" step="0.01" value={form.base_price} onChange={(e) => update('base_price', e.target.value)} /></label><label>Precio anterior<input type="number" min="0" step="0.01" value={form.compare_at_price} onChange={(e) => update('compare_at_price', e.target.value)} /></label><div className="price-groups"><label>Común<input type="number" min="0" value={form.price_groups.common} onChange={(e) => update('price_groups', { ...form.price_groups, common: e.target.value })} /></label><label>Especial<input type="number" min="0" value={form.price_groups.special} onChange={(e) => update('price_groups', { ...form.price_groups, special: e.target.value })} /></label><label>Especial 2<input type="number" min="0" value={form.price_groups.special2} onChange={(e) => update('price_groups', { ...form.price_groups, special2: e.target.value })} /></label></div></section>
          <section className="panel side-panel product-summary"><h2>Resumen</h2><dl><div><dt>SKU</dt><dd>{form.sku || 'Sin definir'}</dd></div><div><dt>Público</dt><dd>{form.audience}</dd></div><div><dt>Variantes</dt><dd>{form.variants.length}</dd></div><div><dt>Stock total</dt><dd>{form.variants.reduce((total, variant) => total + Number(variant.stock || 0), 0)}</dd></div></dl></section>
        </aside>
      </div>
      <footer className="save-bar"><button type="button" className="button button--ghost" onClick={onBack}><X size={17} />Descartar cambios</button><div><button type="button" className="button button--secondary" onClick={() => save('draft')} disabled={saving || preview}><Save size={17} />Guardar borrador</button><button type="button" className="button button--primary" onClick={() => save('published')} disabled={saving || preview}><Save size={17} />Guardar y publicar</button></div></footer>
    </div>
  );
}

function PlaceholderPage({ id }) {
  const item = NAVIGATION.find((entry) => entry.id === id);
  return <div className="page"><div className="page-heading"><div><h1>{item?.label}</h1><p>Módulo previsto para una fase progresiva. No se agregaron datos simulados.</p></div></div><section className="panel placeholder-panel"><Package size={30} /><h2>Base preparada</h2><p>Esta sección se conectará a FastAPI y Supabase sin crear una fuente de verdad paralela.</p></section></div>;
}

function AppShell({ token, admin, preview = false }) {
  const [route, setRoute] = useState(preview ? { page: 'editor', productId: null } : { page: 'dashboard', productId: null });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const active = route.page === 'editor' ? 'products' : route.page;
  const title = active === 'products' ? 'Productos' : NAVIGATION.find((item) => item.id === active)?.label || 'ROMIX Admin';
  return (
    <div className="admin-app">
      <Sidebar active={active} open={sidebarOpen} onClose={() => setSidebarOpen(false)} onNavigate={(page) => setRoute({ page, productId: null })} />
      <div className="admin-main">
        <Header title={title} subtitle={route.page === 'editor' ? (route.productId ? 'Editar producto' : 'Nuevo producto') : null} admin={admin} onMenu={() => setSidebarOpen(true)} />
        {route.page === 'dashboard' ? <DashboardPage token={token} onNavigate={(page) => setRoute({ page, productId: null })} /> : null}
        {route.page === 'products' ? <ProductsPage token={token} onEdit={(productId) => setRoute({ page: 'editor', productId })} /> : null}
        {route.page === 'editor' ? <ProductEditor token={token} productId={route.productId} preview={preview} onBack={() => setRoute({ page: 'products', productId: null })} /> : null}
        {!['dashboard', 'products', 'editor'].includes(route.page) ? <PlaceholderPage id={route.page} /> : null}
      </div>
    </div>
  );
}

export default function App() {
  const preview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'editor';
  const session = useAdminSession();
  const pathAllowed = useMemo(() => isAllowedAdminPath(), []);
  if (!pathAllowed && !preview) return <NotFound />;
  if (preview) return <AppShell preview admin={{ displayName: 'Vista previa' }} />;
  if (!hasAuthConfig || session.status === 'unconfigured') return <main className="config-page"><span className="wordmark">ROMIX</span><h1>Admin sin configurar</h1><p>Definí VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en este deployment.</p></main>;
  if (session.status === 'loading') return <main className="loading-page"><Spinner label="Validando sesión" /></main>;
  if (session.status !== 'authenticated') return <LoginPage initialError={session.error} />;
  return <AppShell token={session.session.access_token} admin={session.admin} />;
}
