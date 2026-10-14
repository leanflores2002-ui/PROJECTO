import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({callback:null,request:vi.fn(),unsubscribe:vi.fn(),signOut:vi.fn(async()=>{})}));
vi.mock('../lib/api',()=>({apiRequest:(...args)=>mocks.request(...args)}));
vi.mock('../lib/supabase',()=>({supabase:{auth:{onAuthStateChange:cb=>{mocks.callback=cb;return{data:{subscription:{unsubscribe:mocks.unsubscribe}}};},signOut:mocks.signOut}}}));
import { useAdminSession } from './useAdminSession';
beforeEach(()=>{mocks.request.mockReset();mocks.signOut.mockClear();});
it('validates INITIAL_SESSION once and ignores repeated SIGNED_IN for the same token',async()=>{
  mocks.request.mockResolvedValue({role:'admin'});const {result,unmount}=renderHook(()=>useAdminSession());
  act(()=>{mocks.callback('INITIAL_SESSION',{access_token:'a'});mocks.callback('SIGNED_IN',{access_token:'a'});});
  await waitFor(()=>expect(result.current.status).toBe('authenticated'));expect(mocks.request).toHaveBeenCalledTimes(1);unmount();expect(mocks.unsubscribe).toHaveBeenCalled();
});
it('cannot restore a signed-out session from a late authorization response',async()=>{
  let finish;mocks.request.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));const {result}=renderHook(()=>useAdminSession());
  await act(async()=>{mocks.callback('SIGNED_IN',{access_token:'a'});});
  await act(async()=>{mocks.callback('SIGNED_OUT',null);});
  await act(async()=>{finish({role:'admin'});});
  expect(result.current.status).toBe('signed-out');
});
