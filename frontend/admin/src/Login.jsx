import { useState } from 'react';
import { supabase } from './lib/supabase';
function InlineAlert({ kind = 'error', children }) {
  if (!children) return null;
  return <div className={`inline-alert inline-alert--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export default function LoginPage({ initialError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError || '');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError('No se pudo iniciar sesión. Verificá tus credenciales.');
    } catch { setError('No pudimos conectar. Reintentá.'); }
    finally { setBusy(false); }
  }

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="ROMIX Admin">
        <span className="wordmark wordmark--large">ROMIX</span>
        <div>
          <h1>Administración del catálogo</h1>
          <p>Productos, stock y pedidos en un único lugar.</p>
        </div>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div>
            <p className="login-card__brand">ROMIX ADMIN</p>
            <h2>Iniciar sesión</h2>
            <p>Acceso exclusivo para administradores autorizados.</p>
          </div>
          <InlineAlert>{error}</InlineAlert>
          <label>Email<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <button className="button button--primary button--wide" disabled={busy} type="submit">
            {busy ? 'Ingresando…' : 'Ingresar'}
          </button>
          <p className="login-card__note">No existe registro público. Las cuentas se crean de forma controlada.</p>
        </form>
      </section>
    </main>
  );
}
