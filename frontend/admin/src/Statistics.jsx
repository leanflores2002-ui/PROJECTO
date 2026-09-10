import { useEffect, useState } from 'react';
import { apiRequest } from './lib/api';

export default function Statistics({ token }) {
  const [range, setRange] = useState({ days: '30', start: '', end: '' });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (range.days === 'custom') {
      if (!range.start || !range.end) return undefined;
      params.set('start', range.start); params.set('end', range.end);
    } else {
      const now = new Date();
      const end = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(now);
      const start = new Date(`${end}T12:00:00Z`);
      start.setUTCDate(start.getUTCDate() - Number(range.days) + 1);
      params.set('start', start.toISOString().slice(0, 10)); params.set('end', end);
    }
    setData(null); setError('');
    apiRequest(`/api/admin/dashboard?${params}`, { token, signal: controller.signal }).then(setData)
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [token, range]);
  const labels = { total_products: 'Productos', published_products: 'Publicados', hidden_products: 'Ocultos',
    draft_products: 'Borradores', total_variants: 'Variantes activas', units_in_stock: 'Unidades en stock',
    low_stock_products: 'Productos con stock bajo', out_of_stock_products: 'Productos agotados', out_of_stock_variants: 'Variantes sin stock' };
  const movementLabels = { incoming: 'Entradas / stock inicial', outgoing: 'Salidas', adjustment: 'Ajustes', order: 'Pedidos reservados', cancellation: 'Cancelaciones / devoluciones' };
  return <div className="page page--statistics">
    <div className="page-heading"><div><h1>Dashboard</h1><p>Inventario actual y actividad registrada en PostgreSQL.</p></div></div>
    <div className="filters"><label>Período<select value={range.days} onChange={(e) => setRange({ ...range, days: e.target.value })}>
      <option value="1">Hoy</option><option value="7">7 días</option><option value="30">30 días</option><option value="custom">Personalizado</option>
    </select></label>{range.days === 'custom' ? <><label>Desde<input type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} /></label><label>Hasta<input type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} /></label></> : null}</div>
    {error ? <p role="alert" className="inline-alert inline-alert--error">{error}</p> : null}
    {!data && !error ? <p role="status">Cargando estadísticas…</p> : null}
    {data ? <>
      <section className="metrics-grid">{Object.entries(labels).map(([key, label]) => <article className="panel" key={key}><p>{label}</p><strong>{data.summary[key]}</strong></article>)}
        <article className="panel"><p>Valor estimado del inventario (precio de venta)</p><strong>{data.summary.inventory_value == null ? 'Sin datos suficientes' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(data.summary.inventory_value)}</strong></article>
        <article className="panel"><p>Visitas al detalle en el período</p><strong>{data.totalViews || 'Sin datos suficientes'}</strong></article>
      </section>
      <section className="panel"><h2>Movimientos del período</h2>{data.movements.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Tipo</th><th>Movimientos</th><th>Unidades entrantes</th><th>Unidades salientes</th></tr></thead><tbody>{data.movements.map((m) => <tr key={m.movement_type}><td>{movementLabels[m.movement_type] || m.movement_type}</td><td>{m.movements}</td><td>{m.incoming}</td><td>{m.outgoing}</td></tr>)}</tbody></table></div> : <p>Sin datos suficientes</p>}</section>
      <div className="statistics-lists">{[['mostStock', 'Más stock', 'stock'], ['leastStock', 'Menos stock', 'stock'], ['lowStock', 'Stock bajo', 'stock'], ['outOfStock', 'Agotados', 'stock'], ['mostMovements', 'Más movimientos', 'movements'], ['mostViewed', 'Más vistos', 'views'], ['leastViewed', 'Menos vistos', 'views'], ['bestSellers', 'Variantes vendidas (pedidos completados)', 'units']].map(([key, label, metric]) => <section className="panel" key={key}><h2>{label}</h2>{data[key]?.length && (!(key.includes('Viewed')) || data.totalViews > 0) ? <ul className="activity-list">{data[key].map((item) => <li key={item.id}><span>{item.name}{item.color ? ` · ${item.color} / ${item.size}` : ''}</span><strong>{item[metric]}</strong></li>)}</ul> : <p>Sin datos suficientes</p>}</section>)}</div>
    </> : null}
  </div>;
}
