import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { LogOut, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from './lib/supabase';
import { NAVIGATION } from './navigation';
import { ConfirmationProvider, Loading, useConfirm } from './components/Feedback';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './components/ui/dialog';

const loadProducts=()=>import('./components/ProductsPage');
const ProductsPage=lazy(loadProducts);
const ProductEditor=lazy(()=>import('./components/ProductEditor'));
const Inventory=lazy(()=>import('./components/Inventory'));
const Statistics=lazy(()=>import('./Statistics'));
const ResourcePage=lazy(()=>import('./components/ResourcePage'));

function AppShell({ token, admin }) {
  const [route,setRoute]=useState({page:'dashboard',productId:null});
  const [sidebarOpen,setSidebarOpen]=useState(false),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false);
  const confirm=useConfirm(),menu=useRef(null),heading=useRef(null);
  const active=route.page==='editor'?'products':route.page;
  const title=NAVIGATION.find(n=>n.id===active)?.label||'ROMIX Admin';
  const onDirty=useCallback(value=>setDirty(value),[]),onBusy=useCallback(value=>setBusy(value),[]);
  useEffect(()=>{const timer=setTimeout(()=>{loadProducts().catch(()=>{});},300);return()=>clearTimeout(timer);},[]);
  useEffect(()=>{ if(!dirty)return;const leave=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',leave);return()=>window.removeEventListener('beforeunload',leave); },[dirty]);
  async function mayLeave(){if(busy){toast.info('Esperá a que termine la operación.');return false;}return !dirty||await confirm({title:'Cambios sin guardar',description:'Si salís, perderás los cambios que todavía no guardaste.',action:'Salir sin guardar'});}
  async function navigate(page,productId=null){if(!await mayLeave())return;setDirty(false);setSidebarOpen(false);setRoute({page,productId});window.scrollTo(0,0);requestAnimationFrame(()=>heading.current?.focus());}
  async function logout(){if(!await mayLeave())return;try{const {error}=await supabase.auth.signOut();if(error)throw error;}catch{toast.error('No pudimos cerrar sesión. Reintentá.');}}
  const nav=<nav aria-label="Navegación administrativa">{NAVIGATION.map(({id,label,icon:Icon})=><button type="button" key={id} className={active===id?'is-active':''} aria-current={active===id?'page':undefined} onClick={()=>navigate(id)}><Icon size={19} aria-hidden="true"/><span>{label}</span></button>)}</nav>;
  return <div className="admin-app"><a className="skip-link" href="#main-content">Saltar al contenido</a><aside className="sidebar desktop-sidebar"><div className="sidebar__brand"><span className="wordmark">ROMIX</span><small>ADMIN</small></div>{nav}</aside>
    <Dialog open={sidebarOpen} onOpenChange={setSidebarOpen}><DialogContent className="navigation-sheet" onCloseAutoFocus={e=>{e.preventDefault();menu.current?.focus();}}><DialogHeader><DialogTitle>ROMIX Admin</DialogTitle><DialogDescription>Navegación</DialogDescription></DialogHeader>{nav}</DialogContent></Dialog>
    <div className="admin-main"><header className="topbar"><Button ref={menu} className="mobile-menu" variant="ghost" size="icon" aria-label="Abrir navegación" onClick={()=>setSidebarOpen(true)}><Menu/></Button><span ref={heading} tabIndex={-1}>{title}{route.page==='editor'?' / Editar producto':''}</span><div className="topbar__tools"><span className="admin-name">{admin?.displayName||admin?.email||'Administrador'}</span><Button variant="ghost" aria-label="Cerrar sesión" onClick={logout}><LogOut data-icon="inline-start"/><span className="logout-label">Salir</span></Button></div></header>
      <main id="main-content" tabIndex={-1}><Suspense fallback={<div className="page"><Loading/></div>}>
        {['dashboard','reports'].includes(route.page)?<Statistics token={token} title={route.page==='reports'?'Estadísticas':'Dashboard'}/>:null}
        {route.page==='products'?<ProductsPage token={token} onEdit={id=>navigate('editor',id)}/>:null}
        {route.page==='editor'?<ProductEditor key={route.productId||'new'} token={token} productId={route.productId} onBack={()=>navigate('products')} onDirty={onDirty} onBusy={onBusy}/>:null}
        {route.page==='inventory'?<Inventory token={token}/>:null}
        {!['dashboard','reports','products','editor','inventory'].includes(route.page)?<ResourcePage key={route.page} id={route.page} token={token} admin={admin}/>:null}
      </Suspense></main></div>
  </div>;
}

export default function AuthenticatedApp(props) { return <ConfirmationProvider><AppShell {...props}/><Toaster richColors closeButton position="top-right"/></ConfirmationProvider>; }
