import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { apiRequest } from '../lib/api';
import { config } from '../config';
import { Button } from './ui/button';
import { Loading, Alert, FormField } from './Feedback';
import ProductPreview from './ProductPreview';

const money = new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0});
export default function ProductsPage({ token, onEdit }) {
  const products = useProducts(token);
  const [categories,setCategories] = useState([]);
  useEffect(() => { const c=new AbortController(); apiRequest('/api/admin/categories',{token,signal:c.signal}).then(setCategories).catch(()=>{}); return ()=>c.abort(); },[token]);
  return <div className="page"><div className="page-heading"><div><h1>Productos</h1><p>Administrá tu catálogo.</p></div><Button onClick={()=>onEdit(null)}><Plus data-icon="inline-start" />Nuevo producto</Button></div>
    <section className="panel products-panel"><div className="product-filters">
      <FormField label="Buscar"><input type="search" maxLength={120} value={products.query} onChange={e=>products.setQuery(e.target.value)} placeholder="Nombre o SKU" /></FormField>
      <FormField label="Categoría"><select value={products.filters.category_id} onChange={e=>products.filter('category_id',e.target.value)}><option value="">Todas</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name} · {c.audience}</option>)}</select></FormField>
      <FormField label="Estado"><select value={products.filters.status} onChange={e=>products.filter('status',e.target.value)}><option value="">Todos</option><option value="published">Publicado</option><option value="draft">Borrador</option><option value="hidden">Oculto</option></select></FormField>
      <FormField label="Público"><select value={products.filters.audience} onChange={e=>products.filter('audience',e.target.value)}><option value="">Todos</option><option value="mujer">Mujer</option><option value="hombre">Hombre</option><option value="ninos">Niños</option></select></FormField>
    </div><Alert>{products.error}</Alert>
    {products.loading ? <Loading label="Cargando productos…" /> : products.data?.items.length ? <><p className="table-hint">Deslizá la tabla para ver todas las columnas.</p><div className="table-wrap" role="region" aria-label="Lista de productos" tabIndex={0}><table className="data-table"><thead><tr>{['Producto','SKU','Categoría','Precio','Stock','Estado','Actualizado','Acciones'].map(t=><th key={t} scope="col">{t}</th>)}</tr></thead><tbody>{products.data.items.map(p=><tr key={p.id}><td><div className="product-cell">{p.image_url ? <img loading="lazy" alt="" src={/^https?:/.test(p.image_url)?p.image_url:`${config.publicSiteUrl}/${p.image_url.replace(/^\//,'')}`} /> : <span className="thumb-empty" aria-label="Sin imagen">—</span>}<div><button className="product-link" onClick={()=>onEdit(p.id)}>{p.name}</button><small>{p.audience}</small></div></div></td><td>{p.sku}</td><td>{p.category_name || 'Sin categoría'}</td><td>{money.format(p.base_price)}</td><td>{p.stock}</td><td><span className={`status-pill status-pill--${p.status}`}>{({published:'Publicado',draft:'Borrador',hidden:'Oculto'})[p.status]}</span></td><td>{new Date(p.updated_at).toLocaleDateString('es-AR')}</td><td><div className="row-actions"><Button variant="outline" onClick={()=>onEdit(p.id)}>Editar</Button><ProductPreview token={token} id={p.id} /></div></td></tr>)}</tbody></table></div></> : !products.error ? <div className="empty-state"><h2>No encontramos productos con estos filtros.</h2><Button variant="outline" onClick={products.clear}>Limpiar filtros</Button></div> : <Button variant="outline" onClick={products.refresh}>Reintentar</Button>}
    <Pagination products={products} />
    </section></div>;
}
export function Pagination({ products }) {
  const {filters,data,loading,filter}=products;
  const pages=Math.max(1,Math.ceil((data?.total||0)/filters.page_size));
  return <div className="pagination"><FormField label="Productos por página"><select value={filters.page_size} onChange={e=>filter('page_size',Number(e.target.value))}>{[25,50,100].map(n=><option key={n}>{n}</option>)}</select></FormField><span aria-live="polite">Página {filters.page} de {pages} · {data?.total ?? '…'} productos</span><div className="row-actions"><Button variant="outline" disabled={loading||filters.page===1} onClick={()=>filter('page',filters.page-1)}>Anterior</Button><Button variant="outline" disabled={loading||filters.page>=pages} onClick={()=>filter('page',filters.page+1)}>Siguiente</Button></div></div>;
}
