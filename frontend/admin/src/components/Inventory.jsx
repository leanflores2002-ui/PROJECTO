import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiRequest } from '../lib/api';
import { useProducts } from '../hooks/useProducts';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { FieldGroup } from './ui/field';
import { Alert, FormField, Loading } from './Feedback';
import { Pagination } from './ProductsPage';

export function InventoryTable({ token, product, onSync, disabled = false }) {
  const [selected,setSelected]=useState(null);
  const [operation,setOperation]=useState('set'),[quantity,setQuantity]=useState(''),[reason,setReason]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(null);
  const origin=useRef(null);
  function open(variant,event) { origin.current=event.currentTarget;setSelected(variant);setQuantity(String(variant.stock));setOperation('set');setReason('');setResult(null);setError(''); }
  async function adjust(e) {
    e.preventDefault();e.stopPropagation();setError('');
    if(reason.trim().length<3){setError('Ingresá un motivo de al menos tres caracteres.');return;}
    setBusy(true);
    try {
      const response=await apiRequest(`/api/admin/inventory/${selected.id}/adjust`,{token,method:'POST',body:{operation,reason:reason.trim(),...(operation==='set'?{stock:Number(quantity)}:{quantity:Number(quantity)}),expected_updated_at:selected.updated_at}});
      setResult(response);setSelected(v=>({...v,stock:response.stock,updated_at:response.updated_at}));
      const fresh=await apiRequest(`/api/admin/products/${product.id}`,{token});onSync(fresh);toast.success('Stock actualizado');
    }catch(err){setError(err.message);}finally{setBusy(false);}
  }
  return <section className="panel inventory-section"><h2>Inventario</h2><p>Stock por color y talle. Cada ajuste requiere un motivo.</p><p className="table-hint">Deslizá la tabla para ver todas las columnas.</p><div className="table-wrap" role="region" aria-label="Inventario por variante" tabIndex={0}><table className="data-table"><thead><tr>{['SKU / Código de barras','Color','Talle','Stock','Estado','Actualizado','Acción'].map(t=><th key={t} scope="col">{t}</th>)}</tr></thead><tbody>{product.variants.map(v=><tr key={v.id||v.clientId}><td>{v.sku||product.sku}<small className="cell-secondary">{v.barcode||'Sin código de barras'}</small></td><td>{v.color}</td><td>{v.size}</td><td>{v.stock}</td><td>{v.status==='inactive'?'Inactiva':v.stock===0?'Sin stock':v.stock<=(v.low_stock_threshold??3)?'Stock bajo':'Disponible'}</td><td>{v.updated_at?new Date(v.updated_at).toLocaleString('es-AR'):'Sin guardar'}</td><td><Button variant="outline" disabled={disabled||!v.id} onClick={e=>open(v,e)}>Ajustar stock</Button></td></tr>)}</tbody></table></div>{!product.variants.length?<p>No hay variantes. Agregalas en Variantes.</p>:null}
    <Dialog open={Boolean(selected)} onOpenChange={open=>{if(!open&&!busy)setSelected(null);}}><DialogContent onCloseAutoFocus={e=>{e.preventDefault();origin.current?.focus();}} onEscapeKeyDown={e=>{if(busy)e.preventDefault();}}><DialogHeader><DialogTitle>Ajustar stock</DialogTitle><DialogDescription>{product.name} · {selected?.color} / {selected?.size}</DialogDescription></DialogHeader><p>Stock actual: <strong>{selected?.stock}</strong></p><Alert>{error}</Alert>
      {result ? <><div className="stock-result" role="status"><p>Stock anterior: <strong>{result.stockBefore}</strong></p><p>Movimiento: <strong>{result.quantityDelta>0?'+':''}{result.quantityDelta}</strong></p><p>Stock nuevo: <strong>{result.stock}</strong></p></div><Button onClick={()=>setSelected(null)}>Cerrar</Button></> : <form onSubmit={adjust}><FieldGroup><FormField label="Operación"><select disabled={busy} value={operation} onChange={e=>{setOperation(e.target.value);setQuantity('');}}><option value="set">Establecer</option><option value="add">Agregar</option><option value="remove">Quitar</option></select></FormField><FormField label="Cantidad"><input type="number" min={operation==='set'?0:1} step="1" required disabled={busy} value={quantity} onChange={e=>setQuantity(e.target.value)} /></FormField><FormField label="Motivo" error={reason.trim().length<3&&error?error:null}><textarea minLength={3} maxLength={300} required disabled={busy} value={reason} onChange={e=>setReason(e.target.value)} /></FormField></FieldGroup><DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={()=>setSelected(null)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy?'Guardando…':'Confirmar'}</Button></DialogFooter></form>}
    </DialogContent></Dialog>
  </section>;
}
export default function Inventory({ token }) {
  const products=useProducts(token),[selected,setSelected]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function open(id){setBusy(true);setError('');try{setSelected(await apiRequest(`/api/admin/products/${id}`,{token}));}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <div className="page"><div className="page-heading"><div><h1>Inventario</h1><p>Elegí un producto para ajustar sus variantes.</p></div>{selected?<Button variant="outline" onClick={()=>{setSelected(null);products.refresh();}}>Volver al inventario</Button>:null}</div><Alert>{error||products.error}</Alert>{selected?<><h2>{selected.name}</h2><InventoryTable token={token} product={selected} onSync={setSelected}/></>:<section className="panel"><FormField label="Buscar producto"><input type="search" maxLength={120} value={products.query} onChange={e=>products.setQuery(e.target.value)} placeholder="Nombre o SKU"/></FormField>{products.loading||busy?<Loading/>:<ul className="inventory-products">{products.data?.items.map(p=><li key={p.id}><div><strong>{p.name}</strong><small>{p.sku} · {p.stock} unidades</small></div><Button variant="outline" onClick={()=>open(p.id)}>Ver variantes</Button></li>)}</ul>}{!products.loading&&!products.data?.items.length?<p>No encontramos productos con estos filtros.</p>:null}<Pagination products={products}/></section>}</div>;
}
