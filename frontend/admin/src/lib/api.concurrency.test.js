import { afterEach, expect, it, vi } from 'vitest';
import { apiRequest } from './api';
afterEach(()=>vi.unstubAllGlobals());
it('shares simultaneous reads without cancelling the remaining subscriber',async()=>{
  let finish;
  const fetcher=vi.fn(()=>new Promise(resolve=>{finish=resolve;}));vi.stubGlobal('fetch',fetcher);
  const controller=new AbortController();
  const first=apiRequest('/api/admin/products?test=dedup',{token:'same',signal:controller.signal});
  const second=apiRequest('/api/admin/products?test=dedup',{token:'same'});
  const cancelled=expect(first).rejects.toMatchObject({name:'AbortError'});controller.abort();
  finish({ok:true,text:async()=>'{"items":[]}'});
  await cancelled;expect(await second).toEqual({items:[]});expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][1].signal.aborted).toBe(false);
});
it('does not share reads across administrators or write requests',async()=>{
  const fetcher=vi.fn(async()=>({ok:true,text:async()=>'{}'}));vi.stubGlobal('fetch',fetcher);
  await Promise.all([apiRequest('/api/admin/products',{token:'one'}),apiRequest('/api/admin/products',{token:'two'}),apiRequest('/api/admin/products',{token:'one',method:'POST',body:{}}),apiRequest('/api/admin/products',{token:'one',method:'POST',body:{}})]);
  expect(fetcher).toHaveBeenCalledTimes(4);
});
it('does not expose database details in server errors',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,status:500,text:async()=>JSON.stringify({detail:'psycopg password secret host'})})));
  await expect(apiRequest('/api/admin/failure')).rejects.toThrow('No se pudo completar la operación.');
});
