const labels={name:'Nombre',display_name:'Nombre visible',role:'Permisos',base_price:'Precio',stock:'Stock',color:'Color',size:'Talle',status:'Estado',delta:'Variación de stock',reason:'Motivo',source:'Origen',before:'Antes',after:'Después',changes:'Cambios',images:'Imágenes',is_active:'Acceso activo',filename:'Archivo',count:'Cantidad',previous:'Antes',next:'Después'};
const values={published:'Publicado',draft:'Borrador',hidden:'Oculto',active:'Activo',inactive:'Inactivo',superadmin:'Propietario',admin:'Administrador',operator:'Editor de productos',viewer:'Sólo lectura',owner_request:'Solicitud del propietario',backend_cli:'Configuración del propietario'};
function readable(value){if(value===null)return 'Sin valor';if(typeof value==='boolean')return value?'Sí':'No';if(typeof value==='object')return Object.entries(value).map(([key,v])=>`${labels[key]||key.replaceAll('_',' ')}: ${readable(v)}`).join(' · ');return values[value]||String(value);}
export default function ChangeDetails({details}) {
  if(!details||!Object.keys(details).length)return <p>No hay detalles adicionales.</p>;
  return <dl className="change-details">{Object.entries(details).map(([key,value])=><div key={key}><dt>{labels[key]||key.replaceAll('_',' ')}</dt><dd>{readable(value)}</dd></div>)}</dl>;
}
