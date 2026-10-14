import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
const request=vi.hoisted(()=>vi.fn());
vi.mock('../lib/api',()=>({apiRequest:(...args)=>request(...args)}));
import { InventoryTable } from './Inventory';
it('submitting the stock dialog never submits the containing product editor',async()=>{
  const product={id:'product',name:'Producto QA',sku:'QA',variants:[{id:'variant',color:'Negro',size:'M',stock:5,status:'active',updated_at:'2026-09-10T00:00:00Z'}]};
  request.mockResolvedValueOnce({stockBefore:5,quantityDelta:2,stock:7,updated_at:'2026-09-10T00:01:00Z'}).mockResolvedValueOnce({...product,variants:[{...product.variants[0],stock:7}]});
  const saveProduct=vi.fn(e=>e.preventDefault()),sync=vi.fn();
  render(<form onSubmit={saveProduct}><InventoryTable token="qa" product={product} onSync={sync}/></form>);
  fireEvent.click(screen.getByRole('button',{name:'Ajustar stock'}));
  fireEvent.change(screen.getByLabelText('Operación'),{target:{value:'add'}});
  fireEvent.change(screen.getByLabelText('Cantidad'),{target:{value:'2'}});
  fireEvent.change(screen.getByLabelText('Motivo'),{target:{value:'Ingreso QA'}});
  fireEvent.submit(screen.getByRole('button',{name:'Confirmar'}).closest('form'));
  await waitFor(()=>expect(sync).toHaveBeenCalled());
  expect(saveProduct).not.toHaveBeenCalled();
  expect(request).toHaveBeenCalledTimes(2);
});
