import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
export function useProducts(token) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ search: '', category_id: '', status: '', audience: '', page: 1, page_size: 25 });
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => { const timer = setTimeout(() => setFilters(f => f.search === query.trim() ? f : { ...f, search: query.trim(), page: 1 }), 300); return () => clearTimeout(timer); }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    setState(s => ({ ...s, loading: true, error: '' }));
    const params = new URLSearchParams(Object.entries(filters).filter(([,v]) => v !== ''));
    apiRequest(`/api/admin/products?${params}`, { token, signal: controller.signal })
      .then(data => setState({ data, loading: false, error: '' }))
      .catch(e => { if (e.name !== 'AbortError') setState({ data: null, loading: false, error: e.message }); });
    return () => controller.abort();
  }, [filters, token, revision]);
  return { ...state, query, setQuery, filters, filter: (key,value) => setFilters(f => ({...f,[key]:value,...(key === 'page' ? {} : {page:1})})),
    clear: () => { setQuery(''); setFilters({search:'',category_id:'',status:'',audience:'',page:1,page_size:25}); }, refresh: () => setRevision(r=>r+1) };
}
