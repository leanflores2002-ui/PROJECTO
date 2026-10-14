
import { BarChart3 } from 'lucide-react';
import { PasswordForm } from './Account';
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

import { Alert, FormField, Loading } from './Feedback';


const number = value => Number(value || 0).toLocaleString('es-AR');
export function TrafficChart({ daily }) {
  if (!daily.length) return <p className="empty-state">No hay visitas registradas en este período.</p>;
  const max = Math.max(1, ...daily.map(d => d.totalUsers));
  const points = daily.map((d,i) => `${40+i*720/Math.max(1,daily.length-1)},${220-d.totalUsers/max*180}`).join(' ');
  return <div className="traffic-chart"><svg viewBox="0 0 800 260" role="img" aria-label="Usuarios de Google Analytics por día"><path d="M40 40V220H760" stroke="#dfe2e7" fill="none"/><polyline points={points} fill="none" stroke="#f22797" strokeWidth="3"/>{daily.map((d,i)=><circle key={d.date} cx={40+i*720/Math.max(1,daily.length-1)} cy={220-d.totalUsers/max*180} r="4" fill="#f22797"><title>{d.date}: {number(d.totalUsers)} usuarios</title></circle>)}</svg><details><summary>Ver datos del gráfico</summary><table className="data-table"><thead><tr><th>Fecha</th><th>Usuarios</th><th>Sesiones</th></tr></thead><tbody>{daily.map(d=><tr key={d.date}><td>{d.date.slice(6,8)}/{d.date.slice(4,6)}/{d.date.slice(0,4)}</td><td>{number(d.totalUsers)}</td><td>{number(d.sessions)}</td></tr>)}</tbody></table></details></div>;
}

export function Analytics({ token, compact=false, productId }) {
  const Heading=compact?'h2':'h1';
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
  return <section className={compact?'panel analytics-panel':'page'}><div className="page-heading"><div><Heading><BarChart3 aria-hidden="true"/>{compact?'Visitas a la tienda':'Análisis'}</Heading><p>Google Analytics 4 · Datos de la tienda pública</p></div><FormField label="Período"><select value={days} onChange={e=>setDays(e.target.value)}><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option></select></FormField></div><Alert>{error}</Alert>{!data&&!error?<Loading/>:null}
    {data?.configured===false?<div className="connection-state"><span className="empty-icon"><BarChart3 aria-hidden="true"/></span><h2>Conectar Google Analytics</h2><p>Falta conectar tu propiedad de Google Analytics para mostrar las visitas y los productos más consultados.</p><p>Una vez conectado, verás datos reales. No se muestran cifras de ejemplo.</p></div>:null}
    {data?.configured?<><div className="analytics-metrics">{[['Usuarios',data.summary.totalUsers],['Sesiones',data.summary.sessions],['Páginas vistas',data.summary.screenPageViews],['Clics para pedir',data.whatsappClicks]].map(([label,value])=><div key={label}><span>{label}</span><strong>{number(value)}</strong></div>)}</div><TrafficChart daily={data.daily}/>{!compact||productId?<section className="panel"><h2>{productId?'Interés en este producto':'Productos más consultados'}</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>Producto</th><th>Vistas</th><th>Unidades agregadas al carrito</th></tr></thead><tbody>{rows?.map(p=><tr key={p.itemId}><td>{p.itemName}</td><td>{number(p.itemsViewed)}</td><td>{number(p.itemsAddedToCart)}</td></tr>)}</tbody></table></div>{!rows?.length?<p>No hay eventos de productos en este período.</p>:null}</section>:null}<p className="table-hint">Los clics de WhatsApp son consultas, no ventas confirmadas. Los usuarios diarios no se suman para calcular personas únicas del período. {data.limited?'Google aplicó umbrales o límites a este informe.':''}</p><small>Actualizado: {new Date(data.updatedAt).toLocaleString('es-AR')}. La información puede llegar con demora.</small></>:null}
  </section>;
}

export { default as Notifications } from './ActivityFeed';
export { default as Users } from './TeamUsers';

export function SetPassword() { return <main className="page"><h1>Activar mi acceso</h1><PasswordForm/><a href="/admin/">Entrar al admin</a></main>; }
