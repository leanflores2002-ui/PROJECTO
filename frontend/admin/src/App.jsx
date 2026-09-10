import { lazy, Suspense } from 'react';
import { hasAuthConfig, isAllowedAdminPath } from './config';
import { useAdminSession } from './hooks/useAdminSession';
import LoginPage from './Login';
const AppShell=lazy(()=>import('./AppShell'));
function Verifying(){return <main className="loading-page"><p role="status">Verificando acceso…</p></main>;}
export default function App(){
  const session=useAdminSession();
  if(!isAllowedAdminPath())return <main className="page"><h1>Página no encontrada</h1></main>;
  if(!hasAuthConfig||session.status==='unconfigured')return <main className="config-page"><h1>Admin sin configurar</h1><p>Revisá la configuración de este entorno.</p></main>;
  if(session.status==='loading')return <Verifying/>;
  return session.status==='authenticated'?<Suspense fallback={<Verifying/>}><AppShell token={session.session.access_token} admin={session.admin}/></Suspense>:<LoginPage initialError={session.error}/>;
}
