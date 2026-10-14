import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, UploadCloud, Images } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest, uploadImages } from '../lib/api';
import { config } from '../config';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Alert, useConfirm } from './Feedback';

const imageUrl = value => /^https?:\/\//i.test(value||'') ? value : `${config.publicSiteUrl}/${String(value||'').replace(/^\/+/, '')}`;
export default function ImageManager({ token, product, onSync, onBusy, onPending }) {
  const [queue,setQueue]=useState([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [view,setView]=useState(null);
  const [selected,setSelected]=useState(null);
  const [replacement,setReplacement]=useState(null);
  const picker=useRef(null), urls=useRef(new Set()), viewOrigin=useRef(null);
  const confirm=useConfirm();
  const images=product.images||[];
  const active=images.find(i=>i.id===selected)||images.find(i=>i.is_primary)||images[0];
  function showImage(image){viewOrigin.current=document.activeElement;setView(image);}
  useEffect(()=>{ const current=urls.current; return ()=>current.forEach(url=>URL.revokeObjectURL(url)); },[]);
  useEffect(()=>{ onPending(queue.some(q=>q.status!=='Lista')); return ()=>onPending(false); },[queue,onPending]);
  function addFiles(files) {
    const list=Array.from(files);
    if (!list.length) return;
    if (replacement && list.length!==1) { setError('Para reemplazar elegí una sola imagen.'); return; }
    if (queue.length+list.length>12 || list.some(f=>!['image/jpeg','image/png','image/webp','image/avif'].includes(f.type)||f.size>10*1024*1024)) { setError('Elegí hasta 12 imágenes JPG, PNG, WEBP o AVIF de hasta 10 MB cada una.'); return; }
    setError('');
    setQueue(q=>[...q,...list.map(file=>{ const url=URL.createObjectURL(file);urls.current.add(url);return {id:crypto.randomUUID(),file,url,status:'Lista para subir',progress:0,replace:replacement}; })]);
    setReplacement(null);
  }
  async function refresh() { const detail=await apiRequest(`/api/admin/products/${product.id}`,{token});onSync(detail);return detail; }
  async function run(work, message) { setBusy(true);onBusy(true);setError('');try { await work();await refresh();toast.success(message); }catch(e){setError(e.message);try{await refresh();}catch{/* keep the last confirmed gallery */}}finally{setBusy(false);onBusy(false);} }
  async function remove(image) {
    if (!await confirm({title:'Eliminar imagen',description:'Esta imagen dejará de mostrarse en la tienda.',action:'Eliminar'})) return;
    await run(()=>apiRequest(`/api/public/admin/product-images/${image.id}`,{token,method:'DELETE'}),'Imagen eliminada');
  }
  async function move(direction) {
    const index=images.findIndex(i=>i.id===active?.id),target=index+direction;
    if (target<0||target>=images.length) return;
    const ids=images.map(i=>i.id);[ids[index],ids[target]]=[ids[target],ids[index]];
    await run(()=>apiRequest(`/api/admin/products/${product.id}/images`,{token,method:'PATCH',body:{image_ids:ids,expected_updated_at:product.updated_at}}),'Orden de imágenes actualizado');
  }
  async function upload() {
    await run(async()=>{
      for(const item of queue.filter(q=>q.status!=='Lista')) {
        const update=patch=>setQueue(q=>q.map(v=>v.id===item.id?{...v,...patch}:v));
        const body=new FormData();body.append('files',item.file);update({status:'Subiendo…'});
        let uploaded=false;
        try {
          const result=await uploadImages(`/api/public/admin/products/by-sku/${encodeURIComponent(product.sku)}/images`,{token,body,onProgress:progress=>update({progress,status:progress===100?'Procesando…':'Subiendo…'})});
          // An uploaded file is never resent if a later replacement step fails.
          uploaded=true;update({status:'Lista',progress:100});
          if(item.replace) {
            const before=await refresh();
            const added=result.images.find(i=>!images.some(old=>old.id===i.id));
            if(!added) throw new Error('Imagen subida. Revisá la galería antes de completar el reemplazo.');
            if(item.replace.is_primary) await apiRequest(`/api/public/admin/product-images/${added.id}/primary`,{token,method:'POST'});
            let latest=await apiRequest(`/api/admin/products/${product.id}`,{token});
            const ids=before.images.filter(i=>i.id!==added.id).map(i=>i.id);
            const at=ids.indexOf(item.replace.id);ids.splice(Math.max(0,at),0,added.id);
            await apiRequest(`/api/admin/products/${product.id}/images`,{token,method:'PATCH',body:{image_ids:ids,expected_updated_at:latest.updated_at}});
            await apiRequest(`/api/public/admin/product-images/${item.replace.id}`,{token,method:'DELETE'});
          }
          await refresh();
        }catch(e){update({status:uploaded?'Lista':'Error'});throw e;}
      }
      setQueue([]);
    },'Imagen subida');
  }
  const lastImage=images.length<=1&&product.status==='published';
  return <section className="panel image-manager"><h2><Images aria-hidden="true"/>Imágenes del producto</h2><p>Elegí la imagen principal que se verá en la tienda. Los cambios de la galería se guardan al completar cada acción.</p><Alert>{error}</Alert>
    {active ? <><button type="button" className="primary-image" onClick={()=>showImage(active)} aria-label="Ver imagen seleccionada"><img src={imageUrl(active.public_url)} alt={active.alt_text||product.name} /><span>{active.is_primary?'Imagen principal':'Imagen de galería'}</span></button>
      <div className="gallery-thumbnails" aria-label="Galería">{images.map((image,index)=><button type="button" key={image.id} aria-label={`Seleccionar imagen ${index+1}${image.is_primary?', principal':''}`} aria-pressed={active.id===image.id} onClick={()=>setSelected(image.id)}><img alt="" src={imageUrl(image.public_url)} /></button>)}</div>
      <div className="image-actions"><Button variant="outline" onClick={()=>showImage(active)}>Ver</Button><Button variant="outline" disabled={busy||active.is_primary} onClick={()=>run(()=>apiRequest(`/api/public/admin/product-images/${active.id}/primary`,{token,method:'POST'}),'Imagen principal actualizada')}>Hacer principal</Button><Button variant="outline" disabled={busy||queue.length>0} onClick={()=>{setReplacement(active);picker.current.click();}}>Reemplazar</Button><Button variant="destructive" disabled={busy||lastImage} onClick={()=>remove(active)}>Eliminar</Button></div>
      {lastImage?<p>Para eliminar la última imagen de un producto publicado, agregá otra primero.</p>:null}
      <div className="row-actions"><Button variant="outline" disabled={busy||images[0]?.id===active.id} onClick={()=>move(-1)}><ArrowLeft data-icon="inline-start" />Mover izquierda</Button><Button variant="outline" disabled={busy||images.at(-1)?.id===active.id} onClick={()=>move(1)}>Mover derecha<ArrowRight data-icon="inline-end" /></Button></div>
    </>:<p className="empty-copy">Todavía no hay imágenes.</p>}
    <div className="upload-area" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(product.id&&!busy)addFiles(e.dataTransfer.files);}}>
      <Button variant="outline" disabled={!product.id||busy} onClick={()=>{setReplacement(null);picker.current.click();}}><UploadCloud data-icon="inline-start" />Agregar imágenes</Button><p>Arrastrá archivos o seleccioná desde tu dispositivo.</p><small>JPG, PNG, WEBP o AVIF · Hasta 10 MB por imagen</small>
      {!product.id?<p>Guardá el producto antes de subir imágenes.</p>:null}
      <input ref={picker} type="file" hidden multiple={!replacement} accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>{addFiles(e.target.files);e.target.value='';}} />
    </div>
    {queue.length ? <div className="upload-queue">{queue.map(item=><div key={item.id} className="upload-item"><img src={item.url} alt="Vista previa del archivo" /><div><strong>{item.file.name}</strong><small>{(item.file.size/1024).toFixed(1)} KB{item.replace?' · Reemplazo':''}</small><span role="status">{item.status}</span><progress aria-label={`Progreso de ${item.file.name}`} max="100" value={item.progress} /></div><Button variant="ghost" disabled={busy} onClick={()=>{URL.revokeObjectURL(item.url);urls.current.delete(item.url);setQueue(q=>q.filter(v=>v.id!==item.id));}}>Quitar</Button></div>)}<Button disabled={busy} onClick={upload}>{busy?'Subiendo…':'Subir archivos'}</Button></div>:null}
    <Dialog open={Boolean(view)} onOpenChange={open=>{if(!open)setView(null);}}><DialogContent className="image-lightbox" onCloseAutoFocus={e=>{e.preventDefault();viewOrigin.current?.focus();}}><DialogHeader><DialogTitle>Imagen del producto</DialogTitle><DialogDescription>{product.name}</DialogDescription></DialogHeader>{view?<img src={imageUrl(view.public_url)} alt={view.alt_text||product.name}/>:null}</DialogContent></Dialog>
  </section>;
}
