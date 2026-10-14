// This audit client can contact only ROMIX deployments, never arbitrary URLs.
function deploymentOrigin(value) {
  const url = new URL(value);
  const allowed = url.hostname === 'romix-ropas.vercel.app'
    || /^romix-[a-z0-9-]+-ct-7472s-projects\.vercel\.app$/.test(url.hostname);
  if (!allowed || url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) throw new Error('Expected an allowed ROMIX HTTPS origin');
  return url.origin;
}
function imageUrl(value, origin) {
  const url = new URL(value);
  if (url.origin !== deploymentOrigin(origin) || url.username || url.password || !/^\/(images|share-previews)\//.test(url.pathname)) throw new Error('Image URL is outside this deployment');
  return url.href;
}
async function boundedBody(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel();
    throw new Error('Response exceeds download budget');
  }
  if (!response.body) throw new Error('Missing response body');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error('Response exceeds download budget'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, size);
}
async function download(url, origin, kind, baseline = false) {
  const base = deploymentOrigin(origin);
  const target = kind === 'image' ? imageUrl(url, base) : new URL(url).href;
  if (new URL(target).origin !== base) throw new Error('URL is outside this deployment');
  const response = await fetch(target, {redirect:'manual', headers:{'user-agent':'facebookexternalhit/1.1'}, signal:AbortSignal.timeout(30000)});
  const type = response.headers.get('content-type')?.split(';')[0];
  if (response.status !== 200 || (kind === 'image' ? !type?.startsWith('image/') : type !== 'text/html')) {
    await response.body?.cancel();
    throw new Error(`Inaccessible or unexpected content: ${target} (${response.status})`);
  }
  const imageLimit = baseline ? 10485760 : 400000;
  const bytes = await boundedBody(response, kind === 'image' ? imageLimit : 65536);
  return {bytes, type, status:response.status};
}
module.exports = {deploymentOrigin, imageUrl, boundedBody, download};
