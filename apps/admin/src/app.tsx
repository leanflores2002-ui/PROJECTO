import { useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { getApiHealth } from './lib/api';

export const adminRoutes = ['/', '/products'];

function AccessNotice() {
  const enabled = import.meta.env.VITE_CLOUDFLARE_ACCESS_ENABLED !== 'false';
  return (
    <aside className="access-notice" aria-label="Protección de acceso">
      <span className="access-dot" aria-hidden="true" />
      {enabled ? 'Protegido por Cloudflare Access' : 'Access pendiente de configurar en este entorno'}
    </aside>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <header className="topbar">
        <Link to="/" className="wordmark">ROMIX <span>ADMIN</span></Link>
        <AccessNotice />
      </header>
      <div className="shell-body">
        <nav className="sidebar" aria-label="Admin">
          <NavLink to="/" end>Resumen</NavLink>
          <NavLink to="/products">Productos</NavLink>
          <span className="nav-disabled">Inventario · siguiente fase</span>
        </nav>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

function HomePage() {
  const [health, setHealth] = useState<string>('Sin verificar');
  const [busy, setBusy] = useState(false);

  async function checkApi() {
    setBusy(true);
    try {
      const result = await getApiHealth();
      setHealth(`${result.status} · ${result.runtime}`);
    } catch {
      setHealth('No disponible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <p className="section-label">ROMIX Admin</p>
      <h1>Base operativa preparada.</h1>
      <p className="lede">El dashboard completo se incorporará después de estabilizar la API, D1, R2 y Access.</p>
      <div className="status-row">
        <div>
          <span className="metric-label">API</span>
          <strong>{health}</strong>
        </div>
        <button type="button" onClick={checkApi} disabled={busy}>{busy ? 'Verificando…' : 'Verificar API'}</button>
      </div>
    </section>
  );
}

function ProductsPage() {
  return (
    <section>
      <p className="section-label">Catálogo</p>
      <h1>Productos</h1>
      <p className="lede">La edición de productos se conectará a D1 cuando finalice la normalización de `products.json`.</p>
    </section>
  );
}

function NotFoundPage() {
  return <section><h1>Página no encontrada</h1><Link to="/">Volver al resumen</Link></section>;
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Shell>
  );
}
