import { LockKeyhole, UserRound, Save } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { apiRequest } from '../lib/api';
import { Alert, FormField } from './Feedback';
import { Button } from './ui/button';

export function PasswordForm() {
  const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
  const [nonce,setNonce]=useState(''),[needsCode,setNeedsCode]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  async function save(event) {
    event.preventDefault();setError('');setMessage('');
    if(password!==confirmation){setError('Las contraseñas no coinciden.');return;}
    setBusy(true);
    try {
      const {error:failure}=await supabase.auth.updateUser({password,...(needsCode?{nonce:nonce.trim()}: {})});
      if(failure){
        if(failure.code==='reauthentication_needed') {
          const {error:codeError}=await supabase.auth.reauthenticate();
          if(codeError)throw codeError;
          setNeedsCode(true);setMessage('Revisá tu correo e ingresá el código para confirmar el cambio.');return;
        }
        throw failure;
      }
      setPassword('');setConfirmation('');setNonce('');setNeedsCode(false);setMessage('Contraseña guardada.');
    } catch {setError('No se pudo cambiar la contraseña. Revisá el código o volvé a iniciar sesión e intentá nuevamente.');}
    finally {setBusy(false);}
  }
  return <form className="panel editor-card" onSubmit={save}><h2><LockKeyhole aria-hidden="true"/>Cambiar contraseña</h2><Alert>{error}</Alert><p role="status">{message}</p><FormField label="Nueva contraseña"><input required minLength={12} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></FormField><FormField label="Repetir contraseña"><input required minLength={12} type="password" autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={busy}/></FormField><p>Usá al menos 12 caracteres.</p>{needsCode?<FormField label="Código recibido por correo"><input required autoComplete="one-time-code" value={nonce} onChange={e=>setNonce(e.target.value)} disabled={busy}/></FormField>:null}<Button disabled={busy} type="submit">{busy?'Guardando…':'Guardar contraseña'}</Button></form>;
}

export default function Account({token,admin,onUpdate}) {
  const [name,setName]=useState(admin.displayName||''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  async function save(event) {
    event.preventDefault();setBusy(true);setError('');setMessage('');
    try {const result=await apiRequest('/api/admin/me',{token,method:'PATCH',body:{display_name:name.trim()}});onUpdate(result.displayName);setMessage('Nombre actualizado.');}
    catch(e){setError(e.message||'No se pudo guardar el nombre.');}finally{setBusy(false);}
  }
  return <div className="page"><div className="page-heading"><div><h1>Mi cuenta</h1><p>Actualizá tu nombre y cuidá el acceso a tu tienda.</p></div></div><div className="account-columns"><form className="panel editor-card" onSubmit={save}><h2><UserRound aria-hidden="true"/>Datos de tu cuenta</h2><p>Correo: {admin.email}</p><p>Rol: {({superadmin:'Propietario',admin:'Administrador',operator:'Editor de productos',viewer:'Sólo lectura'})[admin.role]||admin.role}</p><Alert>{error}</Alert><p role="status">{message}</p><FormField label="Nombre visible"><input required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)} disabled={busy}/></FormField><Button disabled={busy} type="submit"><Save aria-hidden="true"/>Guardar nombre</Button></form><PasswordForm/></div></div>;
}
