// Real unauthenticated requests; no protection bypass, cookies or bearer tokens.
const fs=require('node:fs');
const sharp=require('sharp');
const {JSDOM}=require('jsdom');
const {productSlug}=require('./generate-share-pages');
const products=require('../frontend/public/assets/data/products.json');
const {deploymentOrigin,download}=require('./share-http');
const base=deploymentOrigin(process.argv[2]);
const baseline=process.argv.includes('--baseline');
function chosenProducts(){
  const chosen=new Map();
  const add=p=>{if(p) chosen.set(productSlug(p),p);};
  add(products.find(p=>productSlug(p)==='calza-algodon-c-lycra-chupin'));
  for(const section of ['mujer','hombre','ninos']) products.filter(p=>p.section===section && p.visible!==false).slice(0,3).forEach(add);
  add(products.find(p=>/[ñáéíóú()]/i.test(p.image)));
  for(const p of products) {
    if(chosen.size>=10) break;
    add(p);
  }
  return chosen;
}
async function main(){
  const chosen=chosenProducts();
  const results=[];
  for(const [slug,p] of chosen){
    const url=`${base.replace(/\/$/,'')}/share/${slug}/`;
    const page=await download(url,base,'html');
    const dom=new JSDOM(page.bytes.toString('utf8'));
    const meta=key=>dom.window.document.querySelector(`meta[property="${key}"]`)?.content;
    const imageUrl=meta('og:image');
    if(page.status!==200 || !imageUrl)throw new Error(`Share inaccessible: ${url} (${page.status})`);
    const image=await download(imageUrl,base,'image',baseline);
    const {bytes,type}=image;const m=await sharp(bytes,{limitInputPixels:40000000}).metadata();
    if(image.status!==200 || (!baseline && type!==`image/${m.format}`) || !bytes.length)throw new Error(`Invalid image: ${imageUrl}`);
    if(!baseline && (bytes.length>400000 || Number(meta('og:image:width'))!==m.width || Number(meta('og:image:height'))!==m.height || meta('og:image:type')!==type || meta('og:image:alt')!==p.name))throw new Error(`Invalid metadata/budget: ${url}`);
    if(!baseline && new URL(imageUrl).origin!==new URL(base).origin)throw new Error('Preview unexpectedly references production media');
    results.push({name:p.name,section:p.section,primary:p.image,shareUrl:url,shareStatus:page.status,imageUrl,imageStatus:image.status,contentType:type,actualFormat:m.format,mimeMatches:type===`image/${m.format}`,width:m.width,height:m.height,bytes:bytes.length,KB:bytes.length/1000});
    dom.window.close();
  }
  fs.mkdirSync('reports',{recursive:true});fs.writeFileSync(`reports/share-urls-${baseline?'before':'after'}.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
