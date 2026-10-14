const canonical=value=>String(value||'').trim().toLocaleLowerCase('es');
const sizes=['xxs','xs','s','m','l','xl','xxl','2xl','3xl','4xl'];
export function groupVariants(variants) {
  const groups=new Map();
  variants.forEach((variant,index)=>{
    const color=canonical(variant.color);
    if(!groups.has(color))groups.set(color,{key:String(variant.id||variant.clientId||index),color:variant.color.trim(),hex:variant.color_hex||'#cccccc',rows:[]});
    groups.get(color).rows.push({variant,index});
  });
  return [...groups.values()].map(group=>({...group,stock:group.rows.reduce((total,{variant:v})=>total+(v.status==='inactive'?0:Number(v.stock||0)),0),rows:group.rows.sort((a,b)=>{
    const ar=sizes.indexOf(canonical(a.variant.size)),br=sizes.indexOf(canonical(b.variant.size));
    return ar>=0&&br>=0?ar-br:a.variant.size.localeCompare(b.variant.size,'es',{numeric:true});
  })}));
}
export function variantProblem(variants) {
  const seen=new Set();
  for(const variant of variants){
    if(!canonical(variant.color)||!canonical(variant.size))return 'Completá el color y el talle de cada fila.';
    const key=JSON.stringify([canonical(variant.color),canonical(variant.size)]);
    if(seen.has(key))return `El talle ${variant.size} está repetido en ${variant.color}. Revisá esa combinación.`;
    seen.add(key);
  }
  return '';
}
