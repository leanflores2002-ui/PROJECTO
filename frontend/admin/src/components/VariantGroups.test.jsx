import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import VariantGroups from './VariantGroups';
vi.mock('../lib/api',()=>({apiRequest:vi.fn()}));
afterEach(cleanup);
const product={id:'p',variants:[{id:'v1',color:'Negro',size:'L',stock:3,status:'active'},{id:'v2',color:'Negro',size:'S',stock:2,status:'active'}]};
it('editar un talle ordenado conserva el identificador de esa variante',()=>{
 const change=vi.fn();render(<VariantGroups product={product} token="qa" onChange={change} onRemove={vi.fn()} onSync={vi.fn()}/>);
 fireEvent.change(screen.getByLabelText('Precio de Negro, talle S'),{target:{value:'1500'}});
 expect(change.mock.calls[0][0][0].id).toBe('v1');
 expect(change.mock.calls[0][0][1]).toMatchObject({id:'v2',price_override:'1500'});
});
it('agregar varios talles omite los existentes sin borrar datos',()=>{
 const change=vi.fn();render(<VariantGroups product={product} token="qa" onChange={change} onRemove={vi.fn()} onSync={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Agregar color y talles'}));
 fireEvent.change(screen.getByLabelText('Color'),{target:{value:'Negro'}});
 fireEvent.change(screen.getByLabelText('Talles separados por coma'),{target:{value:'S, M, L, M'}});
 fireEvent.submit(screen.getByRole('button',{name:'Agregar combinaciones'}).closest('form'));
 const variants=change.mock.calls[0][0];expect(variants).toHaveLength(3);expect(variants[0]).toBe(product.variants[0]);expect(variants[2]).toMatchObject({color:'Negro',size:'M',stock:0});
});
it('no mezcla dos colores existentes al cambiar su nombre',()=>{
 const change=vi.fn();render(<VariantGroups product={{...product,variants:[...product.variants,{id:'pink',color:'Rosa',size:'S',stock:2,status:'active'}]}} token="qa" onChange={change} onRemove={vi.fn()} onSync={vi.fn()}/>);
 const input=screen.getByLabelText('Nombre de este color');fireEvent.change(input,{target:{value:'Rosa'}});fireEvent.blur(input);
 expect(change).not.toHaveBeenCalled();expect(screen.getByText(/Ese color ya existe/)).toBeInTheDocument();
});
