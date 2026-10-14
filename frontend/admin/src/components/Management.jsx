import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { Button } from './ui/button';
import { Alert, FormField, Loading } from './Feedback';
import { supabase } from '../lib/supabase';

const number = value => Number(value || 0).toLocaleString('es-AR');
export function TrafficChart({ daily }) {
  if (!daily.length) return <p className="empty-state">No hay visitas registradas en este período.</p>;
  const max = Math.max(1, ...daily.map(d => d.totalUsers));
  const points = daily.map((d,i) => `${40+i*720/Math.max(1,daily.length-1)},${220-d.totalUsers/max*180}`).join(' ');
  return <div className="traffic-chart"><svg viewBox="0 0 800 260" role="img" aria-label="Usuarios de Google Analytics por día"><path d="M40 40V220H760" stroke="#dfe2e7" fill="none"/><polyline points={points} fill="none" stroke="#f22797" strokeWidth="3"/>{daily.map((d,i)=><circle key={d.date} cx={40+i*720/Math.max(1,daily.length-1)} cy={220-d.totalUsers/max*180} r="4" fill="#f22797"><title>{d.date}: {number(d.totalUsers)} usuarios</title></circle>)}</svg><details><summary>Ver datos del gráfico</summary><table className="data-table"><thead><tr><th>Fecha</th><th>Usuarios</th><th>Sesiones</th></tr></thead><tbody>{daily.map(d=><tr key={d.date}><td>{d.date.slice(6,8)}/{d.date.slice(4,6)}/{d.date.slice(0,4)}</td><td>{number(d.totalUsers)}</td><td>{number(d.sessions)}</td></tr>)}</tbody></table></details></div>;
}

export function Analytics({ token, compact=false, productId }) {
  const [days,setDays]=useState('30'),[data,setData]=useState(null),[error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    setData(null);
    setError('');
    const end=new Date(),start=new Date(end);start.setDate(end.getDate()-Number(days)+1);
    const local=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    apiRequest(`/api/admin/analytics?start=${local(start)}&end=${local(end)}${productId?'&item_id='+encodeURIComponent(productId):''}`,{token,signal:controller.signal}).then(result=>{setData(result);setError('');}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});
    return()=>controller.abort();
  },[days,token,productId]);
  const rows=productId ? data?.products?.filter(p=>p.itemId===productId) : data?.products;
  return <section className={compact?'panel analytics-panel':'page'}><div className="page-heading"><div><h1>{compact?'Visitas a la tienda':'Análisis'}</h1><p>Google Analytics 4 · Datos de la tienda pública</p></div><FormField label="Período"><select value={days} onChange={e=>setDays(e.target.value)}><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option></select></FormField></div><Alert>{error}</Alert>{!data&&!error?<Loading/>:null}
    {data?.configured===false?<div className="connection-state"><h2>Conectar Google Analytics</h2><p>La tienda ya registra visitas y productos consultados. Falta autorizar la lectura de tu propiedad para mostrar los gráficos aquí.</p><p>Una vez conectado, verás datos reales. No se muestran cifras de ejemplo.</p></div>:null}
    {data?.configured?<><div className="analytics-metrics">{[['Usuarios',data.summary.totalUsers],['Sesiones',data.summary.sessions],['Páginas vistas',data.summary.screenPageViews],['Clics para pedir',data.whatsappClicks]].map(([label,value])=><div key={label}><span>{label}</span><strong>{number(value)}</strong></div>)}</div><TrafficChart daily={data.daily}/>{!compact||productId?<section className="panel"><h2>{productId?'Interés en este producto':'Productos más consultados'}</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>Producto</th><th>Vistas</th><th>Unidades agregadas al carrito</th></tr></thead><tbody>{rows?.map(p=><tr key={p.itemId}><td>{p.itemName}</td><td>{number(p.itemsViewed)}</td><td>{number(p.itemsAddedToCart)}</td></tr>)}</tbody></table></div>{!rows?.length?<p>No hay eventos de productos en este período.</p>:null}</section>:null}<p className="table-hint">Los clics de WhatsApp son consultas, no ventas confirmadas. Los usuarios diarios no se suman para calcular personas únicas del período. {data.limited?'Google aplicó umbrales o límites a este informe.':''}</p><small>Actualizado: {new Date(data.updatedAt).toLocaleString('es-AR')}. La información puede llegar con demora.</small></>:null}
  </section>;
}

const actions={create:'Creó',update:'Actualizó',delete:'Eliminó',invite:'Invitó',reorder:'Reordenó',adjust:'Ajustó',set_primary:'Cambió la imagen principal de',upload:'Agregó imágenes a','product.created':'Creó','product.updated':'Actualizó','product.images_reordered':'Reordenó imágenes de','stock.adjusted':'Ajustó el stock de','variant.created':'Agregó una variante a','variant.status_changed':'Cambió el estado de'};
export function Notifications({ token, compact=false, onRead }) {
  const [data,setData]=useState(null),[page,setPage]=useState(1),[error,setError]=useState('');
  useEffect(()=>{const c=new AbortController();apiRequest(`/api/admin/notifications?page=${page}`,{token,signal:c.signal}).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>c.abort();},[token,page]);
  return <section className={compact?'panel':'page'}><div className="page-heading"><h1>{compact?'Últimos cambios':'Notificaciones'}</h1>{!compact?<Button variant="outline" onClick={()=>onRead?.(data?.items?.[0]?.created_at)} disabled={!data?.items?.length}>Marcar como leídas</Button>:null}</div><p>Historial compartido de productos, imágenes, precios, stock y usuarios. Se registra después de guardar.</p><Alert>{error}</Alert>{!data&&!error?<Loading/>:null}<ul className="activity-list">{data?.items.slice(0,compact?5:25).map(row=><li key={row.id}><div><strong>{row.actor||'Administrador'} · {actions[row.action]||row.action} {row.entity_type}</strong><p>{new Date(row.created_at).toLocaleString('es-AR')}</p>{row.details?.name?<p>{row.details.name}</p>:null}<details><summary>Ver cambio</summary><pre className="audit-details">{JSON.stringify(row.details,null,2)}</pre><small>Referencia: {row.entity_id}</small></details></div></li>)}</ul>{data&&!data.items.length?<p>Todavía no hay cambios registrados.</p>:null}{!compact?<div className="pagination"><Button variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</Button><span>Página {page}</span><Button variant="outline" disabled={!data?.hasMore} onClick={()=>setPage(p=>p+1)}>Siguiente</Button></div>:null}</section>;
}

export function Users({ token, admin }) {
  const [rows,setRows]=useState(null),[error,setError]=useState(''),[success,setSuccess]=useState(''),[busy,setBusy]=useState(false),[page,setPage]=useState(1);
  const [form,setForm]=useState({email:'',display_name:'',role:'operator'});
  async function refresh(){setRows(await apiRequest(`/api/admin/admins?page=${page}&page_size=25`,{token}));}
  useEffect(()=>{const c=new AbortController();apiRequest(`/api/admin/admins?page=${page}&page_size=25`,{token,signal:c.signal}).then(setRows).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>c.abort();},[token,page]);
  async function invite(e){e.preventDefault();setBusy(true);setError('');setSuccess('');try{await apiRequest('/api/admin/users/invite',{token,method:'POST',body:form});setSuccess('Invitación enviada. La persona recibirá un enlace para crear su contraseña.');setForm({email:'',display_name:'',role:'operator'});await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <div className="page"><h1>Usuarios</h1><p>Administradores con acceso al catálogo. La autorización se valida en el servidor.</p><Alert>{error}</Alert>{success?<p role="status">{success}</p>:null}{admin?.role==='superadmin'?<form onSubmit={invite} className="panel editor-card"><h2>Invitar administrador</h2><div className="editor-fields"><FormField label="Nombre"><input required minLength={2} maxLength={100} value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})}/></FormField><FormField label="Correo"><input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></FormField><FormField label="Permisos"><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="admin">Administrador</option><option value="operator">Editor de productos</option><option value="viewer">Sólo lectura</option></select></FormField></div><Button disabled={busy} type="submit">{busy?'Enviando…':'Enviar invitación'}</Button></form>:<p>La creación de cuentas está reservada al administrador propietario.</p>}{rows?<section className="panel"><ul className="inventory-products">{rows.map(row=><li key={row.user_id}><strong>{row.display_name||row.user_id}</strong><span>{row.role} · {row.is_active?'Activo':'Inactivo'}</span></li>)}</ul><div className="pagination"><Button variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</Button><span>Página {page}</span><Button variant="outline" disabled={rows.length<25} onClick={()=>setPage(p=>p+1)}>Siguiente</Button></div></section>:!error?<Loading/>:null}</div>;
}

export function SetPassword() {
  const [password,setPassword]=useState(''),[error,setError]=useState(''),[done,setDone]=useState(false);
  async function save(e){e.preventDefault();const {error}=await supabase.auth.updateUser({password});if(error)setError('No se pudo guardar la contraseña.');else setDone(true);}
  return <main className="page"><h1>Activar mi acceso</h1>{done?<p>Contraseña guardada. <a href="/admin/">Entrar al admin</a></p>:<form className="panel editor-card" onSubmit={save}><Alert>{error}</Alert><FormField label="Nueva contraseña"><input required type="password" minLength={12} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></FormField><Button type="submit">Guardar contraseña</Button></form>}</main>;
}
