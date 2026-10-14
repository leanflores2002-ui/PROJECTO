import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Copy, Save, Tag, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '../lib/api';
import { EMPTY_PRODUCT, normalizeProduct } from '../lib/product';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { FieldGroup } from './ui/field';
import { Alert, FormField, Loading, useConfirm } from './Feedback';
import ImageManager from './ImageManager';
import ProductPreview from './ProductPreview';
import VariantGroups from './VariantGroups';
import { variantProblem } from '../lib/variants';
import { Analytics, Notifications } from './Management';

function DescriptionField({ value, onChange, ...props }) {
  const input=useRef(null);
  function wrap(tag, close=tag){const start=input.current.selectionStart,end=input.current.selectionEnd;onChange(`${value.slice(0,start)}<${tag}>${value.slice(start,end)}</${close}>${value.slice(end)}`);requestAnimationFrame(()=>input.current?.focus());}
  return <div><div className="row-actions description-toolbar" role="group" aria-label="Formato de descripción"><Button variant="outline" onClick={()=>wrap('strong')}>Negrita</Button><Button variant="outline" onClick={()=>wrap('em')}>Cursiva</Button><Button variant="outline" onClick={()=>wrap('ul><li','li></ul')}>Lista</Button><Button variant="outline" onClick={()=>wrap('a href="https://"','a')}>Enlace</Button></div><textarea {...props} ref={input} rows={6} maxLength={20000} value={value} onChange={e=>onChange(e.target.value)}/></div>;
}

export default function ProductEditor({ token, productId, onBack, onDirty, onBusy }) {
  const [form,setForm]=useState(EMPTY_PRODUCT),[baseline,setBaseline]=useState(EMPTY_PRODUCT);
  const [categories,setCategories]=useState([]),[collections,setCollections]=useState([]);
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[mediaBusy,setMediaBusy]=useState(false),[pendingFiles,setPendingFiles]=useState(false),[stockBusy,setStockBusy]=useState(false);
  const [error,setError]=useState(''),[errors,setErrors]=useState({}),[tab,setTab]=useState('general'),[advancedOpen,setAdvancedOpen]=useState(false);
  const confirm=useConfirm();
  const formRef=useRef(null);
  const [loadFailed,setLoadFailed]=useState(false),[loadRevision,setLoadRevision]=useState(0);
  const dirty=JSON.stringify(form)!==JSON.stringify(baseline);
  useEffect(()=>{onDirty(dirty||pendingFiles);},[dirty,pendingFiles,onDirty]);
  useEffect(()=>{onBusy(saving||mediaBusy||stockBusy);return ()=>onBusy(false);},[saving,mediaBusy,stockBusy,onBusy]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setLoadFailed(false);setError('');
    Promise.all([apiRequest('/api/admin/categories',{token,signal:controller.signal}),apiRequest('/api/admin/collections',{token,signal:controller.signal}),productId?apiRequest(`/api/admin/products/${productId}`,{token,signal:controller.signal}):Promise.resolve(null)])
      .then(([cats,cols,product])=>{if(controller.signal.aborted)return;setCategories(cats);setCollections(cols);const next=product?normalizeProduct(product):structuredClone(EMPTY_PRODUCT);setForm(next);setBaseline(next);setLoading(false);})
      .catch(e=>{if(e.name!=='AbortError'){setError(e.message);setLoading(false);setLoadFailed(true);}});
    return ()=>controller.abort();
  },[token,productId,loadRevision]);
  function update(key,value){setForm(f=>({...f,[key]:value}));setErrors(e=>({...e,[key]:null}));}
  function variant(index,key,value){setForm(f=>({...f,variants:f.variants.map((v,i)=>i===index?{...v,[key]:value}:v)}));}
  function syncMedia(detail){const patch={images:detail.images,updated_at:detail.updated_at};setForm(f=>({...f,...patch}));setBaseline(f=>({...f,...patch}));}
  function syncInventory(detail){const merge=source=>({...source,variants:source.variants.map(v=>{const fresh=detail.variants.find(row=>row.id===v.id);return fresh?{...v,stock:fresh.stock,updated_at:fresh.updated_at}:v;})});setForm(merge);setBaseline(merge);}
  async function duplicate(){if(dirty&&!await confirm({title:'Duplicar con cambios',description:'Se copiarán los campos que estás editando. La copia empieza sin stock ni imágenes.',action:'Duplicar'}))return;setForm(f=>({...f,id:null,updated_at:null,name:`${f.name} (copia)`,slug:'',sku:'',barcode:'',status:'draft',images:[],variants:f.variants.map(v=>({...v,id:null,updated_at:null,sku:'',barcode:'',stock:0,clientId:crypto.randomUUID()}))}));setTab('general');toast.info('Completá el SKU y guardá la copia.');}
  async function removeVariant(index){const v=form.variants[index];if(v.id&&!await confirm({title:'Desactivar variante',description:'La variante dejará de ofrecerse al guardar. Su historial y existencias se conservan.',action:'Desactivar'}))return;if(v.id)variant(index,'status','inactive');else setForm(f=>({...f,variants:f.variants.filter((_,i)=>i!==index)}));}
  async function save(event){
    event.preventDefault();if(saving||mediaBusy||stockBusy)return;
    const invalid={};if(form.name.trim().length<2)invalid.name='Ingresá un nombre de al menos dos caracteres.';if(!form.sku.trim())invalid.sku='Ingresá un SKU.';if(form.base_price===''||Number(form.base_price)<0)invalid.base_price='Ingresá un precio válido.';
    const variantError=variantProblem(form.variants);if(variantError)invalid.variants=variantError;
    if(Object.keys(invalid).length){setErrors(invalid);if(invalid.sku)setAdvancedOpen(true);setTab(invalid.variants?'variants':'general');requestAnimationFrame(()=>formRef.current?.querySelector('[aria-invalid="true"]')?.focus());return;}
    setSaving(true);setError('');setErrors({});
    const decimal=v=>v===''||v==null?null:Number(v);
    const payload={expected_updated_at:form.updated_at||null,name:form.name.trim(),slug:form.slug.trim()||null,sku:form.sku.trim(),barcode:form.barcode.trim()||null,audience:form.audience,category_id:form.category_id||null,season_key:form.season_key.trim()||null,description_html:form.description_html,status:form.status,base_price:Number(form.base_price),compare_at_price:decimal(form.compare_at_price),tags:form.tags.split(',').map(t=>t.trim()).filter(Boolean),featured:form.featured,specifications:form.specifications,collection_ids:form.collection_ids,price_groups:Object.fromEntries(Object.entries(form.price_groups).filter(([,v])=>v!=='').map(([k,v])=>[k,Number(v)])),variants:form.variants.map(({clientId:_clientId,...v})=>({...v,id:v.id||null,stock:v.id?null:Number(v.stock||0),price_override:decimal(v.price_override)}))};
    try{const next=normalizeProduct(await apiRequest(form.id?`/api/admin/products/${form.id}`:'/api/admin/products',{token,method:form.id?'PUT':'POST',body:payload}));setForm(next);setBaseline(next);toast.success('Producto guardado');}
    catch(e){setError(e.message);if(Array.isArray(e.payload?.detail)){const fields={};for(const item of e.payload.detail){const key=item.loc?.[1];fields[key]='Revisá este valor y sus límites.';}setErrors(fields);setTab(fields.variants?'variants':'general');}}
    finally{setSaving(false);}
  }
  const input=(key,label,props={})=><FormField label={label} error={errors[key]}><input {...props} value={form[key]} onChange={e=>update(key,e.target.value)}/></FormField>;
  if(loading)return <div className="page"><Loading label="Cargando editor…"/></div>;
  if(loadFailed)return <div className="page"><h1>No pudimos cargar el producto</h1><Alert>{error}</Alert><Button onClick={()=>setLoadRevision(r=>r+1)}>Reintentar</Button><Button variant="outline" onClick={onBack}>Volver a productos</Button></div>;
  return <div className="page product-editor"><Button variant="ghost" onClick={onBack} disabled={saving||mediaBusy||stockBusy}><ArrowLeft data-icon="inline-start"/>Volver a productos</Button><div className="page-heading"><div><h1>{form.id?'Editar producto':'Nuevo producto'}</h1><p>Modificá la información de tu producto y mantené el catálogo actualizado.</p></div><div className="row-actions"><ProductPreview token={token} id={form.id} disabled={saving||mediaBusy||stockBusy}/><Button type="submit" form="product-editor-form" aria-label="Guardar producto desde encabezado" disabled={saving||mediaBusy||stockBusy||pendingFiles}><Save data-icon="inline-start"/>Guardar cambios</Button></div></div><Alert>{error}</Alert>
    <form id="product-editor-form" ref={formRef} onSubmit={save} noValidate>
      <fieldset className="editor-fieldset" disabled={saving||mediaBusy||stockBusy}><div className="editor-layout"><Tabs value={tab} onValueChange={setTab}><TabsList className="editor-tabs" aria-label="Secciones del producto">{[['general','Datos del producto',Tag],['variants','Colores, talles y stock',Palette]].map(([key,label,Icon])=><TabsTrigger key={key} value={key}><Icon aria-hidden="true"/>{label}</TabsTrigger>)}</TabsList>
        <TabsContent value="general">
          <section className="panel editor-card"><h2>Información del producto</h2><p className="section-help">Estos datos aparecen en la página de la prenda. Escribí qué la hace especial: tela, calce, uso y cuidados.</p>
            <FieldGroup>{input('name','Nombre del producto *',{maxLength:180,required:true})}
              <FormField label="Descripción" error={errors.description_html}><DescriptionField value={form.description_html} onChange={value=>update('description_html',value)}/></FormField>
              <p>Escribí la descripción real de esta prenda. La tienda no agrega textos genéricos.</p>
              <FieldGroup className="editor-fields">{input('base_price','Precio base *',{type:'number',min:0,step:'0.01',required:true})}{input('compare_at_price','Precio anterior',{type:'number',min:0,step:'0.01'})}
                <FormField label="Categoría"><select value={form.category_id} onChange={e=>update('category_id',e.target.value)}><option value="">Sin categoría</option>{categories.filter(c=>c.audience===form.audience).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></FormField>
                <FormField label="Público"><select value={form.audience} onChange={e=>{update('audience',e.target.value);update('category_id','');}}><option value="mujer">Mujer</option><option value="hombre">Hombre</option><option value="ninos">Niños</option></select></FormField>
                <FormField label="Estado"><select value={form.status} onChange={e=>update('status',e.target.value)}><option value="draft">Borrador</option><option value="published">Publicado</option><option value="hidden">Oculto</option></select></FormField>
                <label className="check-field"><input type="checkbox" checked={form.featured} onChange={e=>update('featured',e.target.checked)}/>Destacado</label>
              </FieldGroup>
            </FieldGroup>
          </section>
          <details className="panel editor-card" open={advancedOpen} onToggle={e=>setAdvancedOpen(e.currentTarget.open)}><summary>Más detalles y precios especiales</summary><p className="section-help">El SKU es el código interno de la prenda. Completá los campos que necesites para describirla mejor.</p><FieldGroup className="editor-fields">
            {input('sku','SKU *',{maxLength:80,required:true})}{input('barcode','Código de barras',{maxLength:80})}{input('slug','Slug',{maxLength:200})}{input('season_key','Temporada',{maxLength:80})}{input('tags','Etiquetas separadas por coma')}
            <FormField label="Colecciones"><select multiple value={form.collection_ids} onChange={e=>update('collection_ids',Array.from(e.target.selectedOptions,o=>o.value))}>{collections.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></FormField>
            {[['short_description','Descripción corta'],['features','Características'],['material','Material'],['composition','Composición'],['fit','Calce'],['origin','Origen'],['care','Cuidados']].map(([key,label])=><FormField key={key} label={label} error={errors.specifications}><textarea rows={2} maxLength={500} value={form.specifications[key]||''} onChange={e=>update('specifications',{...form.specifications,[key]:e.target.value})}/></FormField>)}
            {[['common','Precio común'],['special','Precio especial'],['special2','Precio especial 2']].map(([key,label])=><FormField key={key} label={label}><input type="number" min="0" step="0.01" value={form.price_groups[key]} onChange={e=>update('price_groups',{...form.price_groups,[key]:e.target.value})}/></FormField>)}
          </FieldGroup><div className="row-actions"><Button type="button" variant="outline" onClick={()=>update('sku',`ROMIX-${crypto.randomUUID().slice(0,8).toUpperCase()}`)}>Generar SKU</Button><Button type="button" variant="outline" disabled={!form.id||saving||mediaBusy} onClick={duplicate}><Copy/>Duplicar producto</Button></div></details>
        </TabsContent>
        <TabsContent value="variants"><VariantGroups token={token} product={form} onChange={variants=>update('variants',variants)} onRemove={removeVariant} onSync={syncInventory} onBusy={setStockBusy} disabled={saving||mediaBusy||stockBusy} stockDisabled={dirty||saving||mediaBusy||stockBusy} error={errors.variants}/></TabsContent>      </Tabs><aside className="editor-media"><ImageManager token={token} product={{...form,sku:baseline.sku||form.sku,status:baseline.status}} onSync={syncMedia} onBusy={setMediaBusy} onPending={setPendingFiles}/></aside></div></fieldset>
      <footer className="editor-save-bar"><span role="status">{saving?'Guardando…':dirty||pendingFiles?'Cambios sin guardar':'Todos los cambios guardados'}</span><div className="row-actions"><Button type="button" variant="outline" disabled={saving||mediaBusy||stockBusy} onClick={onBack}>Cancelar</Button><Button type="submit" disabled={saving||mediaBusy||stockBusy||pendingFiles}><Save data-icon="inline-start"/>{saving?'Guardando…':'Guardar cambios'}</Button></div></footer>
    </form>
    {form.id?<Analytics token={token} compact productId={form.legacy_id||form.slug}/>:null}
    <Notifications token={token} compact/>
  </div>;
}
