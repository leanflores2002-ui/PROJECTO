const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {shouldSkipBuild} = require('../scripts/ignore-vercel-build');
const {JSDOM} = require('jsdom');
const {reportFile} = require('../scripts/measure-storage');
const {localFile,prepareSocialImage,MAX_SOURCE_BYTES} = require('../scripts/social-images');
const {buildSharePage,shareHtml,deploymentSiteUrl} = require('../scripts/generate-share-pages');
const {deploymentOrigin,imageUrl,boundedBody,download} = require('../scripts/share-http');
const origin = 'https://romix-ropas.vercel.app';

async function main() {
  for (const phase of ['../../escape','after/../../escape',String.raw`C:\escape`,'after\0','']) assert.throws(()=>reportFile(phase));
  assert.equal(path.basename(reportFile()), 'storage-after.json');
  assert.equal(path.basename(reportFile('before')), 'storage-before.json');
  // Protocol names are negative test inputs; no request is ever made with them.
  const rejectedProtocols = ['http:', 'file:', 'ftp:', 'data:', 'javascript:'];
  const sources = [...rejectedProtocols.map(protocol=>`${protocol}//localhost/a.jpg`),'https://romix-ropas.vercel.app/a.jpg','https://127.0.0.1/a','https://10.0.0.1/a','https://172.16.0.1/a','https://192.168.0.1/a','https://169.254.169.254/a','https://[::1]/a','https://[fc00::1]/a','https://[fe80::1]/a','//server/a','images/../../secret','images/%2e%2e/secret','images/%2f..%2fsecret','images/a%5c..%5csecret','images/a:stream'];
  const originalFetch = global.fetch;
  let requests = 0;
  global.fetch = async()=>{ requests++; throw new Error('Network must not be used'); };
  try {
    for (const source of sources) {
      assert.throws(()=>localFile(source),source);
      await assert.rejects(prepareSocialImage({id:'security',image:source},'security'));
    }
    await assert.rejects(prepareSocialImage({image:'images/product.png'},'../escape'));
    assert.equal(requests,0);
  } finally { global.fetch = originalFetch; }
  const fixture = localFile('images/security-size-test.png');
  assert.equal(fs.existsSync(fixture),false);
  const fd = fs.openSync(fixture,'wx');
  try {
    fs.ftruncateSync(fd,MAX_SOURCE_BYTES+1);
    await assert.rejects(prepareSocialImage({image:'images/security-size-test.png'},'security'),/budget/);
  } finally { fs.closeSync(fd); fs.unlinkSync(fixture); }

  for (const protocol of rejectedProtocols) assert.throws(()=>deploymentOrigin(`${protocol}//romix-ropas.vercel.app`));
  for (const url of ['https://localhost','https://127.0.0.1','https://[::1]','https://romix-ropas.vercel.app.evil.test','https://evil.vercel.app','https://user@romix-ropas.vercel.app','https://romix-ropas.vercel.app:8443','https://romix-ropas.vercel.app/?url=x']) assert.throws(()=>deploymentOrigin(url));
  assert.equal(deploymentOrigin(origin),origin);
  for (const url of ['https://evil.test/a.jpg',`${origin}/api/redirect?url=x`,'data:image/png,a']) assert.throws(()=>imageUrl(url,origin));
  await assert.rejects(boundedBody(new Response('small',{headers:{'content-length':'1000'}}),10),/budget/);
  await assert.rejects(boundedBody(new Response('elevenbytes'),5),/budget/);
  assert.equal((await boundedBody(new Response('ok'),2)).toString(),'ok');
  try {
    global.fetch = async()=>new Response(null,{status:302,headers:{location:'https://127.0.0.1'}});
    await assert.rejects(download(`${origin}/share-previews/a.jpg`,origin,'image'),/Inaccessible/);
    global.fetch = async()=>new Response('text',{headers:{'content-type':'text/html'}});
    await assert.rejects(download(`${origin}/share-previews/a.jpg`,origin,'image'),/unexpected/);
  } finally { global.fetch = originalFetch; }

  const social={image:'share-previews/a.jpg',imageHash:'a'.repeat(64),source:'images/a.png',type:'image/jpeg',width:1200,height:630};
  const product={id:'x',name:'</script><script>alert(1)</script>',description:'" onload="alert(1)'};
  const result=buildSharePage(product,origin,social);
  const doc=new JSDOM(result.html).window.document;
  assert.equal(doc.querySelectorAll('script').length,1);
  assert.equal(doc.querySelector('meta[property="og:image:alt"]').content,product.name);
  const script=doc.querySelector('script').textContent;
  const prefix='window.location.replace(';
  assert.ok(script.startsWith(prefix) && script.endsWith(');'));
  const redirect=JSON.parse(script.slice(prefix.length,-2));
  assert.equal(new URL(redirect).origin,origin);
  assert.equal(new URL(redirect).searchParams.get('name'),product.name);
  const crafted={title:'x',description:'x',imageUrl:origin+'/images/a.jpg',shareUrl:origin+'/share/a/',detailUrl:origin+'/product.html?x=</script>\u2028&',social,alt:'x'};
  assert.equal(new JSDOM(shareHtml(crafted)).window.document.querySelectorAll('script').length,1);
  assert.throws(()=>shareHtml({...crafted,detailUrl:'https://evil.test/product.html'}));
  assert.throws(()=>deploymentSiteUrl({ROMIX_SITE_URL:'javascript:alert(1)'}));

  // Call the policy directly with a poisoned PATH and a recording executor.
  let invocation;
  const env={PATH:path.resolve(__dirname,'../reports/untrusted-bin'),VERCEL_GIT_PREVIOUS_SHA:'a'.repeat(40),VERCEL_GIT_COMMIT_SHA:'b'.repeat(40)};
  const runGit=(...args)=>{invocation=args;return 'frontend/public/product.html\0';};
  assert.equal(shouldSkipBuild(env,runGit,'linux'),false);
  assert.equal(invocation[0],'/usr/bin/git');
  assert.equal(invocation[2].env.PATH,'/usr/bin:/bin');
  assert.equal(invocation[2].shell,false);
  assert.ok(invocation[1].includes('--no-ext-diff'));
  assert.equal(shouldSkipBuild(env,()=> 'docs/README.md\0','linux'),true);
  assert.equal(shouldSkipBuild(env,()=>{throw new Error('Git unavailable');},'linux'),false);
  assert.equal(shouldSkipBuild({},()=>{throw new Error('Must not execute');},'linux'),false);
  console.log('Share security tests passed: local-only media, traversal, limits, redirects, XSS and executable policy');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
