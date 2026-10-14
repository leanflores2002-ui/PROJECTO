import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Bell, LogOut, Menu, UserRound, CircleHelp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from './lib/supabase';
import { apiRequest } from './lib/api';
import { config } from './config';
import { Analytics, Notifications, Users } from './components/Management';
import { AdminGuide, DashboardActions } from './components/AdminGuide';
import { NAVIGATION } from './navigation';
import { ConfirmationProvider, Loading, useConfirm } from './components/Feedback';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './components/ui/dialog';

const Account=lazy(()=>import('./components/Account'));
const loadProducts=()=>import('./components/ProductsPage');
const ProductsPage=lazy(loadProducts);
const ProductEditor=lazy(()=>import('./components/ProductEditor'));
const Inventory=lazy(()=>import('./components/Inventory'));
const Statistics=lazy(()=>import('./Statistics'));
const ResourcePage=lazy(()=>import('./components/ResourcePage'));

function AppShell({ token, admin }) {
  const [route,setRoute]=useState({page:'dashboard',productId:null});
  const [sidebarOpen,setSidebarOpen]=useState(false),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false);
  const confirm=useConfirm(),menu=useRef(null),heading=useRef(null),helpButton=useRef(null);
  const [guideOpen,setGuideOpen]=useState(false);
  const [unread,setUnread]=useState(0);
  const [displayName,setDisplayName]=useState(admin?.displayName);
  const readKey=`romixAdminRead:${admin?.userId}`;
  useEffect(()=>{let live=true;const refresh=()=>apiRequest('/api/admin/notifications',{token}).then(data=>{let last='';try{last=localStorage.getItem(readKey)||'';}catch{/* Storage may be disabled; retain the current session state. */}if(live)setUnread(data.items.filter(item=>item.created_at>last).length);}).catch(()=>{});refresh();const timer=setInterval(refresh,30000);return()=>{live=false;clearInterval(timer);};},[token,readKey,route.page]);
  function read(timestamp){if(!timestamp)return;try{localStorage.setItem(readKey,timestamp);}catch{/* Storage may be disabled; retain the current session state. */}setUnread(0);}
  const active=route.page==='editor'?'products':route.page;
  const title=active==='account'?'Mi cuenta':NAVIGATION.find(n=>n.id===active)?.label||'ROMIX Admin';
  const onDirty=useCallback(value=>setDirty(value),[]),onBusy=useCallback(value=>setBusy(value),[]);
  useEffect(()=>{const timer=setTimeout(()=>{loadProducts().catch(()=>{});},300);return()=>clearTimeout(timer);},[]);
  useEffect(()=>{ if(!dirty)return;const leave=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',leave);return()=>window.removeEventListener('beforeunload',leave); },[dirty]);
  async function mayLeave(){if(busy){toast.info('Esperá a que termine la operación.');return false;}return !dirty||await confirm({title:'Cambios sin guardar',description:'Si salís, perderás los cambios que todavía no guardaste.',action:'Salir sin guardar'});}
  async function navigate(page,productId=null){if(!await mayLeave())return;setDirty(false);setSidebarOpen(false);setRoute({page,productId});window.scrollTo(0,0);requestAnimationFrame(()=>heading.current?.focus());}
  async function logout(){if(!await mayLeave())return;try{const {error}=await supabase.auth.signOut();if(error)throw error;}catch{toast.error('No pudimos cerrar sesión. Reintentá.');}}
  const nav=<nav aria-label="Navegación administrativa">{NAVIGATION.map(({id,label,description,icon:Icon})=><button type="button" key={id} className={active===id?'is-active':''} aria-current={active===id?'page':undefined} onClick={()=>navigate(id)}><Icon size={19} aria-hidden="true"/><span><strong>{label}</strong><small>{description}</small></span></button>)}</nav>;
  return <div className="admin-app"><a className="skip-link" href="#main-content">Saltar al contenido</a><aside className="sidebar desktop-sidebar"><div className="sidebar__brand"><span className="wordmark">ROMIX</span><small>ADMIN</small></div>{nav}<a className="sidebar-store" href={config.publicSiteUrl} target="_blank" rel="noopener noreferrer">Ver tienda ↗</a></aside>
    <Dialog open={sidebarOpen} onOpenChange={setSidebarOpen}><DialogContent className="navigation-sheet" onCloseAutoFocus={e=>{e.preventDefault();menu.current?.focus();}}><DialogHeader><DialogTitle>ROMIX Admin</DialogTitle><DialogDescription>Navegación</DialogDescription></DialogHeader>{nav}</DialogContent></Dialog>
    <div className="admin-main"><header className="topbar"><Button ref={menu} className="mobile-menu" variant="ghost" size="icon" aria-label="Abrir navegación" onClick={()=>setSidebarOpen(true)}><Menu/></Button><span ref={heading} tabIndex={-1}>{title}{route.page==='editor'?' / Editar producto':''}</span><div className="topbar__tools"><Button ref={helpButton} variant="ghost" aria-label="Ayuda del admin" onClick={()=>setGuideOpen(true)}><CircleHelp aria-hidden="true"/><span className="admin-name">Ayuda</span></Button><Button variant="ghost" aria-label={`Notificaciones, ${unread} cambios recientes sin leer`} onClick={()=>navigate('notifications')}><Bell/>{unread?<span className="notification-count">{unread}</span>:null}</Button><Button variant="ghost" aria-label="Mi cuenta" onClick={()=>navigate('account')}><UserRound aria-hidden="true"/><span className="admin-name">Mi cuenta</span></Button><Button variant="ghost" aria-label="Cerrar sesión" onClick={logout}><LogOut data-icon="inline-start"/><span className="logout-label">Salir</span></Button></div></header>
      <AdminGuide open={guideOpen} onOpenChange={setGuideOpen} returnFocus={()=>helpButton.current?.focus()}/><main id="main-content" tabIndex={-1}><Suspense fallback={<div className="page"><Loading/></div>}>
        {route.page==='dashboard'?<><DashboardActions onNavigate={navigate}/><Statistics token={token} title="Inventario actual"/><div className="page dashboard-activity"><Analytics token={token} compact/><Notifications token={token} compact/></div></>:null}
        {route.page==='analytics'?<Analytics token={token}/>:null}
        {route.page==='notifications'?<Notifications token={token} onRead={read}/>:null}
        {route.page==='account'?<Account token={token} admin={{...admin,displayName}} onUpdate={setDisplayName}/>:null}
        {route.page==='users'?<Users token={token} admin={admin}/>:null}
        {route.page==='products'?<ProductsPage token={token} onEdit={id=>navigate('editor',id)}/>:null}
        {route.page==='editor'?<ProductEditor key={route.productId||'new'} token={token} productId={route.productId} onBack={()=>navigate('products')} onDirty={onDirty} onBusy={onBusy}/>:null}
        {route.page==='inventory'?<Inventory token={token}/>:null}
        {!['dashboard','analytics','notifications','users','products','editor','inventory','account'].includes(route.page)?<ResourcePage key={route.page} id={route.page} token={token} admin={admin}/>:null}
      </Suspense></main></div>
  </div>;
}

export default function AuthenticatedApp(props) { return <ConfirmationProvider><AppShell {...props}/><Toaster richColors closeButton position="top-right"/></ConfirmationProvider>; }
