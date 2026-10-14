import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import ActivityFeed from './ActivityFeed';
import {apiRequest} from '../lib/api';
vi.mock('../lib/api',()=>({apiRequest:vi.fn()}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('marca el historial completo hasta el último evento, incluso si no está en esta página',async()=>{
 apiRequest.mockResolvedValue({items:[{id:'older',actor:'Equipo',action:'product.updated',entity_type:'product',created_at:'2026-10-01T00:00:00Z',details:{name:'Calza'}}],total:50,unreadCount:30,latestAt:'2026-10-14T12:00:00Z'});
 const read=vi.fn();render(<ActivityFeed token="qa" onRead={read}/>);
 await screen.findByText('Equipo actualizó · producto');
 fireEvent.click(screen.getByRole('button',{name:'Marcar como leídas'}));
 expect(read).toHaveBeenCalledWith('2026-10-14T12:00:00Z');
 fireEvent.mouseDown(screen.getByRole('tab',{name:'No leídas 30'}),{button:0,ctrlKey:false});
 await waitFor(()=>expect(apiRequest.mock.calls.at(-1)[0]).toContain('unread=true'));
});
