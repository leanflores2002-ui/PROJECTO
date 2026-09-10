import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiRequest } from '../lib/api';
import { NAVIGATION } from '../navigation';
import { Button } from './ui/button';
import { FieldGroup } from './ui/field';
import { Alert, FormField, Loading, useConfirm } from './Feedback';

const publication=[['draft','Borrador'],['published','Publicado'],['hidden','Oculto']];
const visibility=[['active','Activa'],['hidden','Oculta']];
const audience=[['mujer','Mujer'],['hombre','Hombre'],['ninos','Niños']];
const definitions={
  categories:{endpoint:'categories',fields:[['name','Nombre'],['audience','Público',audience],['status','Estado',visibility],['display_order','Orden','number']],defaults:{name:'',audience:'mujer',status:'active',display_order:0}},
  collections:{endpoint:'collections',fields:[['name','Nombre'],['description','Descripción'],['status','Estado',visibility]],defaults:{name:'',description:'',status:'active'}},
  banners:{endpoint:'banners',fields:[['title','Título'],['body','Texto'],['public_url','URL de imagen'],['link_url','Enlace'],['alt_text','Texto alternativo'],['status','Estado',publication],['position','Orden','number']],defaults:{title:'',body:'',public_url:'',link_url:'',alt_text:'',status:'draft',position:0}},
  'size-guides':{endpoint:'size-guides',fields:[['key','Clave'],['title','Título'],['audience','Público',[['','General'],...audience]],['status','Estado',publication],['content','Contenido JSON','json']],defaults:{key:'',title:'',audience:'',status:'draft',content:{}}},
};
const statuses={submitted:'Recibido',confirmed:'Confirmado',prepared:'Preparado',completed:'Completado',cancelled:'Cancelado'};
function ResourceForm({ definition, row, token, onSaved, onCancel }){
  const [values,setValues]=useState({...definition.defaults,...row}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [json,setJson]=useState(JSON.stringify(row?.content||{},null,2));
  async function save(e){e.preventDefault();setBusy(true);setError('');try{
    const payload={...values};if(definition.endpoint==='size-guides'){payload.content=JSON.parse(json);payload.audience=payload.audience||null;}
    if(definition.endpoint==='banners'){payload.storage_path=values.storage_path||`external/${crypto.randomUUID()}`;payload.alt_text=values.alt_text||values.title||'Banner ROMIX';}
    await apiRequest(`/api/admin/${definition.endpoint}${row?.id?`/${row.id}`:''}`,{token,method:row?.id?'PUT':'POST',body:payload});toast.success('Cambios guardados');await onSaved();
  }catch(e){setError(e instanceof SyntaxError?'Revisá el formato del contenido JSON.':e.message);}finally{setBusy(false);}}
  return <form className="panel editor-card" onSubmit={save}><h2>{row?'Editar':'Crear'}</h2><Alert>{error}</Alert><FieldGroup className="editor-fields">{definition.fields.map(([key,label,type])=><FormField key={key} label={label}>{Array.isArray(type)?<select value={values[key]||''} onChange={e=>setValues(v=>({...v,[key]:e.target.value}))}>{type.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select>:type==='json'?<textarea rows={8} value={json} onChange={e=>setJson(e.target.value)}/>:<input type={type||'text'} min={type==='number'?0:undefined} required={['name','key','public_url'].includes(key)} value={values[key]??''} onChange={e=>setValues(v=>({...v,[key]:type==='number'?Number(e.target.value):e.target.value}))}/>}</FormField>)}</FieldGroup><div className="row-actions"><Button variant="outline" disabled={busy} onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={busy}>{busy?'Guardando…':'Guardar'}</Button></div></form>;
}
function Order({ order,token,onSaved }){
  const [status,setStatus]=useState(order.status),[detail,setDetail]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');const confirm=useConfirm();
  async function save(){if(status==='cancelled'&&!await confirm({title:'Cancelar pedido',description:'El backend devolverá el stock reservado una sola vez.',action:'Cancelar pedido'}))return;setBusy(true);try{await apiRequest(`/api/admin/orders/${order.id}/status`,{token,method:'PATCH',body:{status}});await onSaved();toast.success('Estado del pedido actualizado');}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function view(){try{setDetail(await apiRequest(`/api/admin/orders/${order.id}`,{token}));}catch(e){setError(e.message);}}
  return <section className="panel editor-card"><h2>{order.reference}</h2><p>{new Date(order.created_at).toLocaleString('es-AR')} · {order.item_count} unidades · ${order.total}</p><Alert>{error}</Alert><FormField label="Estado del pedido"><select disabled={busy||order.status==='cancelled'} value={status} onChange={e=>setStatus(e.target.value)}>{Object.entries(statuses).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></FormField><div className="row-actions"><Button variant="outline" onClick={view}>Ver detalle</Button><Button disabled={busy||status===order.status} onClick={save}>{busy?'Guardando…':'Guardar estado'}</Button></div>{detail?<ul>{detail.items.map(i=><li key={i.id}>{i.product_name} · {i.color} / {i.size} · {i.quantity} × ${i.unit_price}</li>)}</ul>:null}</section>;
}
function Settings({ rows,token }){
  const initial=Object.fromEntries(rows.map(r=>[r.key,r.value]));
  const [values,setValues]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const fields=[['whatsapp','WhatsApp'],['instagram','Instagram'],['facebook','Facebook'],['tiktok','TikTok'],['store_location','Ubicación'],['footer_description','Texto del pie de página']];
  async function save(e){e.preventDefault();setBusy(true);setError('');try{for(const [key] of fields){if(values[key]!==initial[key])await apiRequest(`/api/admin/settings/${key}`,{token,method:'PUT',body:{value:values[key]||'',is_public:true}});}toast.success('Configuración guardada');}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <form className="panel editor-card" onSubmit={save}><Alert>{error}</Alert><FieldGroup className="editor-fields">{fields.map(([key,label])=><FormField key={key} label={label}><input value={values[key]||''} onChange={e=>setValues(v=>({...v,[key]:e.target.value}))}/></FormField>)}</FieldGroup><Button type="submit" disabled={busy}>{busy?'Guardando…':'Guardar configuración'}</Button></form>;
}
export default function ResourcePage({ id,token,admin }){
  const [rows,setRows]=useState(null),[error,setError]=useState(''),[editing,setEditing]=useState(undefined),[page,setPage]=useState(1);
  const definition=definitions[id];
  const endpoint=id==='activity'?'audit-logs':id;
  async function refresh(){const result=await apiRequest(`/api/admin/${endpoint}${['activity','admins'].includes(id)?`?page=${page}&page_size=25`:''}`,{token});setRows(result);setEditing(undefined);}
  useEffect(()=>{const c=new AbortController();apiRequest(`/api/admin/${endpoint}${['activity','admins'].includes(id)?`?page=${page}&page_size=25`:''}`,{token,signal:c.signal}).then(setRows).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>c.abort();},[endpoint,id,page,token]);
  const title=NAVIGATION.find(n=>n.id===id)?.label;
  return <div className="page"><div className="page-heading"><h1>{title}</h1>{definition?<Button onClick={()=>setEditing(null)}>Crear {id==='categories'?'categoría':id==='collections'?'colección':id==='banners'?'banner':'guía'}</Button>:null}</div><Alert>{error}</Alert>{!rows&&!error?<Loading/>:null}
    {rows&&definition?<>{editing!==undefined?<ResourceForm key={editing?.id||'new'} definition={definition} row={editing} token={token} onSaved={refresh} onCancel={()=>setEditing(undefined)}/>:<section className="panel"><ul className="inventory-products">{rows.map(row=><li key={row.id}><div><strong>{row.name||row.title||row.key}</strong><small>{row.audience} · {row.status}</small></div><Button variant="outline" onClick={()=>setEditing(row)}>Editar</Button></li>)}</ul>{!rows.length?<p>No hay registros todavía.</p>:null}</section>}</>:null}
    {rows&&id==='orders'?<>{rows.map(order=><Order key={order.id} order={order} token={token} onSaved={refresh}/>)}{!rows.length?<p>No hay pedidos registrados.</p>:null}</>:null}
    {rows&&id==='settings'?<Settings rows={rows} token={token}/>:null}
    {rows&&id==='admins'?<section className="panel"><p>Consulta de administradores. Tu rol: {admin?.role}.</p><ul className="inventory-products">{rows.map(row=><li key={row.user_id}><strong>{row.display_name||row.user_id}</strong><span>{row.role} · {row.is_active?'Activo':'Inactivo'}</span></li>)}</ul><p>La creación de cuentas continúa siendo un proceso controlado de Supabase Auth.</p></section>:null}
    {rows&&id==='activity'?<section className="panel"><h2>Registro de auditoría</h2><ul className="activity-list">{rows.map(row=><li key={row.id}><div><strong>{row.action}</strong><p>{row.entity_type} · {new Date(row.created_at).toLocaleString('es-AR')}</p><small>Administrador: {row.admin_user_id}</small></div></li>)}</ul>{!rows.length?<p>No hay actividad registrada.</p>:null}</section>:null}
    {rows&&['activity','admins'].includes(id)?<div className="pagination"><Button variant="outline" disabled={page===1} onClick={()=>{setRows(null);setPage(p=>p-1);}}>Anterior</Button><span>Página {page}</span><Button variant="outline" disabled={rows.length<25} onClick={()=>{setRows(null);setPage(p=>p+1);}}>Siguiente</Button></div>:null}
  </div>;
}
