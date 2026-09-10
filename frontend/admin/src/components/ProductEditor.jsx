import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Copy, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '../lib/api';
import { EMPTY_PRODUCT, normalizeProduct } from '../lib/product';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { FieldGroup } from './ui/field';
import { Alert, FormField, Loading, useConfirm } from './Feedback';
import ImageManager from './ImageManager';
import ProductPreview from './ProductPreview';
import { InventoryTable } from './Inventory';

function DescriptionField({ value, onChange, ...props }) {
  const input=useRef(null);
  function wrap(tag, close=tag){const start=input.current.selectionStart,end=input.current.selectionEnd;onChange(`${value.slice(0,start)}<${tag}>${value.slice(start,end)}</${close}>${value.slice(end)}`);requestAnimationFrame(()=>input.current?.focus());}
  return <div><div className="row-actions description-toolbar" role="group" aria-label="Formato de descripción"><Button variant="outline" onClick={()=>wrap('strong')}>Negrita</Button><Button variant="outline" onClick={()=>wrap('em')}>Cursiva</Button><Button variant="outline" onClick={()=>wrap('ul><li','li></ul')}>Lista</Button><Button variant="outline" onClick={()=>wrap('a href="https://"','a')}>Enlace</Button></div><textarea {...props} ref={input} rows={6} maxLength={20000} value={value} onChange={e=>onChange(e.target.value)}/></div>;
}

export default function ProductEditor({ token, productId, onBack, onDirty, onBusy }) {
  const [form,setForm]=useState(EMPTY_PRODUCT),[baseline,setBaseline]=useState(EMPTY_PRODUCT);
  const [categories,setCategories]=useState([]),[collections,setCollections]=useState([]);
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[mediaBusy,setMediaBusy]=useState(false),[pendingFiles,setPendingFiles]=useState(false);
  const [error,setError]=useState(''),[errors,setErrors]=useState({}),[tab,setTab]=useState('general');
  const confirm=useConfirm();
  const formRef=useRef(null);
  const dirty=JSON.stringify(form)!==JSON.stringify(baseline);
  useEffect(()=>{onDirty(dirty||pendingFiles);},[dirty,pendingFiles,onDirty]);
  useEffect(()=>{onBusy(saving||mediaBusy);return ()=>onBusy(false);},[saving,mediaBusy,onBusy]);
  useEffect(()=>{
    const controller=new AbortController();
    Promise.all([apiRequest('/api/admin/categories',{token,signal:controller.signal}),apiRequest('/api/admin/collections',{token,signal:controller.signal}),productId?apiRequest(`/api/admin/products/${productId}`,{token,signal:controller.signal}):Promise.resolve(null)])
      .then(([cats,cols,product])=>{setCategories(cats);setCollections(cols);const next=product?normalizeProduct(product):structuredClone(EMPTY_PRODUCT);setForm(next);setBaseline(next);setLoading(false);})
      .catch(e=>{if(e.name!=='AbortError'){setError(e.message);setLoading(false);}});
    return ()=>controller.abort();
  },[token,productId]);
  function update(key,value){setForm(f=>({...f,[key]:value}));setErrors(e=>({...e,[key]:null}));}
  function variant(index,key,value){setForm(f=>({...f,variants:f.variants.map((v,i)=>i===index?{...v,[key]:value}:v)}));}
  function syncMedia(detail){const patch={images:detail.images,updated_at:detail.updated_at};setForm(f=>({...f,...patch}));setBaseline(f=>({...f,...patch}));}
  function syncInventory(detail){const merge=source=>({...source,variants:source.variants.map(v=>{const fresh=detail.variants.find(row=>row.id===v.id);return fresh?{...v,stock:fresh.stock,updated_at:fresh.updated_at}:v;})});setForm(merge);setBaseline(merge);}
  async function duplicate(){if(dirty&&!await confirm({title:'Duplicar con cambios',description:'Se copiarán los campos que estás editando. La copia empieza sin stock ni imágenes.',action:'Duplicar'}))return;setForm(f=>({...f,id:null,updated_at:null,name:`${f.name} (copia)`,slug:'',sku:'',barcode:'',status:'draft',images:[],variants:f.variants.map(v=>({...v,id:null,updated_at:null,sku:'',barcode:'',stock:0,clientId:crypto.randomUUID()}))}));setTab('general');toast.info('Completá el SKU y guardá la copia.');}
  async function removeVariant(index){const v=form.variants[index];if(v.id&&!await confirm({title:'Desactivar variante',description:'La variante dejará de ofrecerse al guardar. Su historial y existencias se conservan.',action:'Desactivar'}))return;if(v.id)variant(index,'status','inactive');else setForm(f=>({...f,variants:f.variants.filter((_,i)=>i!==index)}));}
  async function save(event){
    event.preventDefault();if(saving||mediaBusy)return;
    const invalid={};if(form.name.trim().length<2)invalid.name='Ingresá un nombre de al menos dos caracteres.';if(!form.sku.trim())invalid.sku='Ingresá un SKU.';if(form.base_price===''||Number(form.base_price)<0)invalid.base_price='Ingresá un precio válido.';
    if(form.variants.some(v=>!v.color.trim()||!v.size.trim()))invalid.variants='Completá color y talle de cada variante.';
    if(Object.keys(invalid).length){setErrors(invalid);setTab(invalid.variants?'variants':'general');requestAnimationFrame(()=>formRef.current?.querySelector('[aria-invalid="true"]')?.focus());return;}
    setSaving(true);setError('');setErrors({});
    const decimal=v=>v===''||v==null?null:Number(v);
    const payload={expected_updated_at:form.updated_at||null,name:form.name.trim(),slug:form.slug.trim()||null,sku:form.sku.trim(),barcode:form.barcode.trim()||null,audience:form.audience,category_id:form.category_id||null,season_key:form.season_key.trim()||null,description_html:form.description_html,status:form.status,base_price:Number(form.base_price),compare_at_price:decimal(form.compare_at_price),tags:form.tags.split(',').map(t=>t.trim()).filter(Boolean),featured:form.featured,specifications:form.specifications,collection_ids:form.collection_ids,price_groups:Object.fromEntries(Object.entries(form.price_groups).filter(([,v])=>v!=='').map(([k,v])=>[k,Number(v)])),variants:form.variants.map(({clientId:_clientId,...v})=>({...v,id:v.id||null,stock:v.id?null:Number(v.stock||0),price_override:decimal(v.price_override)}))};
    try{const next=normalizeProduct(await apiRequest(form.id?`/api/admin/products/${form.id}`:'/api/admin/products',{token,method:form.id?'PUT':'POST',body:payload}));setForm(next);setBaseline(next);toast.success('Producto guardado');}
    catch(e){setError(e.message);if(Array.isArray(e.payload?.detail)){const fields={};for(const item of e.payload.detail){const key=item.loc?.[1];fields[key]='Revisá este valor y sus límites.';}setErrors(fields);setTab(fields.variants?'variants':'general');}}
    finally{setSaving(false);}
  }
  const input=(key,label,props={})=><FormField label={label} error={errors[key]}><input {...props} value={form[key]} onChange={e=>update(key,e.target.value)}/></FormField>;
  if(loading)return <div className="page"><Loading label="Cargando editor…"/></div>;
  return <div className="page product-editor"><Button variant="ghost" onClick={onBack} disabled={saving||mediaBusy}><ArrowLeft data-icon="inline-start"/>Volver a productos</Button><div className="page-heading"><h1>{form.id?'Editar producto':'Nuevo producto'}</h1><ProductPreview token={token} id={form.id} disabled={saving||mediaBusy}/></div><Alert>{error}</Alert>
    <form ref={formRef} onSubmit={save} noValidate>
      <Tabs value={tab} onValueChange={setTab}><TabsList className="editor-tabs" aria-label="Secciones del producto">{[['general','General'],['images','Imágenes'],['variants','Variantes'],['inventory','Inventario']].map(([key,label])=><TabsTrigger key={key} value={key}>{label}</TabsTrigger>)}</TabsList>
        <TabsContent value="general"><section className="panel editor-card"><h2>Información básica</h2><FieldGroup className="editor-fields">
          {input('name','Nombre del producto *',{maxLength:180,required:true})}{input('sku','SKU *',{maxLength:80,required:true})}{input('barcode','Código de barras',{maxLength:80})}{input('slug','Slug',{maxLength:200})}
          <FormField label="Categoría"><select value={form.category_id} onChange={e=>update('category_id',e.target.value)}><option value="">Sin categoría</option>{categories.filter(c=>c.audience===form.audience).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></FormField>
          <FormField label="Público"><select value={form.audience} onChange={e=>{update('audience',e.target.value);update('category_id','');}}><option value="mujer">Mujer</option><option value="hombre">Hombre</option><option value="ninos">Niños</option></select></FormField>
          {input('season_key','Temporada',{maxLength:80})}{input('tags','Etiquetas separadas por coma')}
          <FormField label="Colecciones"><select multiple value={form.collection_ids} onChange={e=>update('collection_ids',Array.from(e.target.selectedOptions,o=>o.value))}>{collections.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></FormField>
        </FieldGroup><Button type="button" variant="outline" onClick={()=>update('sku',`ROMIX-${crypto.randomUUID().slice(0,8).toUpperCase()}`)}>Generar SKU</Button></section>
        <section className="panel editor-card"><h2>Precios</h2><FieldGroup className="editor-fields">{input('base_price','Precio base *',{type:'number',min:0,step:'0.01',required:true})}{input('compare_at_price','Precio anterior',{type:'number',min:0,step:'0.01'})}{[['common','Común'],['special','Especial'],['special2','Especial 2']].map(([key,label])=><FormField key={key} label={`Grupo ${label}`} error={errors.price_groups}><input type="number" min="0" step="0.01" value={form.price_groups[key]} onChange={e=>update('price_groups',{...form.price_groups,[key]:e.target.value})}/></FormField>)}</FieldGroup><p>Los precios propios por variante se editan en Variantes.</p></section>
        <section className="panel editor-card"><h2>Descripción y especificaciones</h2><FieldGroup><FormField label="Descripción" error={errors.description_html}><DescriptionField value={form.description_html} onChange={value=>update('description_html',value)}/></FormField><p>Admite texto y el formato HTML existente: párrafos, negrita, cursiva, listas y enlaces.</p><FieldGroup className="editor-fields">{[['short_description','Descripción corta'],['features','Características'],['material','Material'],['composition','Composición'],['fit','Calce'],['origin','Origen'],['care','Cuidados']].map(([key,label])=><FormField key={key} label={label} error={errors.specifications}><textarea rows={2} maxLength={500} value={form.specifications[key]||''} onChange={e=>update('specifications',{...form.specifications,[key]:e.target.value})}/></FormField>)}</FieldGroup></FieldGroup></section>
        <section className="panel editor-card"><h2>Publicación</h2><FieldGroup className="editor-fields"><FormField label="Estado"><select value={form.status} onChange={e=>update('status',e.target.value)}><option value="draft">Borrador</option><option value="published">Publicado</option><option value="hidden">Oculto</option></select></FormField><label className="check-field"><input type="checkbox" checked={form.featured} onChange={e=>update('featured',e.target.checked)}/>Destacado</label></FieldGroup><p>Borrador y oculto no se muestran en la tienda. Los cambios se aplican al guardar.</p><Button type="button" variant="outline" disabled={!form.id||saving||mediaBusy} onClick={duplicate}><Copy data-icon="inline-start"/>Duplicar producto</Button></section></TabsContent>
        <TabsContent value="images" forceMount hidden={tab!=='images'}><ImageManager token={token} product={{...form,sku:baseline.sku||form.sku,status:baseline.status}} onSync={syncMedia} onBusy={setMediaBusy} onPending={setPendingFiles}/></TabsContent>
        <TabsContent value="variants"><section className="panel editor-card"><div className="panel__heading"><h2>Colores y talles</h2><Button type="button" variant="outline" onClick={()=>setForm(f=>({...f,variants:[...f.variants,{clientId:crypto.randomUUID(),size:'',color:'',color_hex:'#000000',stock:0,status:'active',price_override:'',low_stock_threshold:3}]}))}><Plus data-icon="inline-start"/>Agregar variante</Button></div><Alert>{errors.variants}</Alert><p>Elegí una variante para editarla. Desactivar conserva su historial.</p>
          <div className="variant-cards">{form.variants.map((v,index)=><details key={v.id||v.clientId} open={!v.id}><summary>{v.color||'Nuevo color'} / {v.size||'Nuevo talle'} <span>{v.status==='active'?'Activa':'Inactiva'} · {v.stock} unidades</span></summary><FieldGroup className="editor-fields">{[['color','Color'],['size','Talle'],['sku','SKU de variante'],['barcode','Código de barras de variante']].map(([key,label])=><FormField key={key} label={label} error={errors.variants&&['color','size'].includes(key)&&!v[key]?errors.variants:null}><input value={v[key]||''} maxLength={key==='size'?40:80} onChange={e=>variant(index,key,e.target.value)}/></FormField>)}<FormField label="Color visual"><input type="color" value={v.color_hex||'#000000'} onChange={e=>variant(index,'color_hex',e.target.value)}/></FormField><FormField label="Estado de variante"><select value={v.status} onChange={e=>variant(index,'status',e.target.value)}><option value="active">Activa</option><option value="inactive">Inactiva</option></select></FormField><FormField label="Precio propio (vacío usa grupo o base)"><input type="number" min="0" step="0.01" value={v.price_override??''} onChange={e=>variant(index,'price_override',e.target.value)}/></FormField><FormField label="Umbral de stock bajo"><input type="number" min="0" step="1" value={v.low_stock_threshold??3} onChange={e=>variant(index,'low_stock_threshold',Number(e.target.value))}/></FormField>{!v.id?<FormField label="Stock inicial"><input type="number" min="0" step="1" value={v.stock} onChange={e=>variant(index,'stock',e.target.value)}/></FormField>:null}</FieldGroup><Button type="button" variant="outline" onClick={()=>removeVariant(index)}>{v.id?'Desactivar variante':'Quitar variante nueva'}</Button></details>)}</div></section></TabsContent>
        <TabsContent value="inventory"><InventoryTable token={token} product={form} onSync={syncInventory} disabled={dirty||saving||mediaBusy}/>{dirty?<p>Guardá los cambios del producto antes de ajustar stock.</p>:null}</TabsContent>
      </Tabs>
      <footer className="editor-save-bar"><span role="status">{saving?'Guardando…':dirty||pendingFiles?'Cambios sin guardar':'Todos los cambios guardados'}</span><div className="row-actions"><Button type="button" variant="outline" disabled={saving||mediaBusy} onClick={onBack}>Cancelar</Button><Button type="submit" disabled={saving||mediaBusy||pendingFiles}><Save data-icon="inline-start"/>{saving?'Guardando…':'Guardar cambios'}</Button></div></footer>
    </form>
  </div>;
}
