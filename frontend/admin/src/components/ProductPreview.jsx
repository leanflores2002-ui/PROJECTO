import { useState, useRef } from 'react';
import { Eye } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from 'sonner';
import { config } from '../config';

export default function ProductPreview({ token, id, disabled = false }) {
  const [html, setHtml] = useState('');
  const [busy, setBusy] = useState(false);
  const trigger = useRef(null);
  async function open() {
    setBusy(true);
    try {
      const result=await apiRequest(`/api/admin/products/${id}/preview`, { token });
      const document=new DOMParser().parseFromString(result.html,'text/html');
      let base=document.querySelector('base');
      if(!base){base=document.createElement('base');document.head.prepend(base);}
      base.href=config.publicSiteUrl+'/';
      setHtml('<!DOCTYPE html>'+document.documentElement.outerHTML);
    }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  return <><Button ref={trigger} variant="outline" disabled={!id || disabled || busy} onClick={open}><Eye data-icon="inline-start" />{busy ? 'Cargando…' : 'Vista previa'}</Button>
    <Dialog open={Boolean(html)} onOpenChange={(open) => { if (!open) setHtml(''); }}><DialogContent className="preview-modal" onCloseAutoFocus={(e) => { e.preventDefault(); trigger.current?.focus(); }}><DialogHeader><DialogTitle>Vista previa</DialogTitle><DialogDescription>Última versión guardada. Las compras están deshabilitadas.</DialogDescription></DialogHeader><iframe title="Detalle público del producto" sandbox="allow-scripts" srcDoc={html} /></DialogContent></Dialog>
  </>;
}
