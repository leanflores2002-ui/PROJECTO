import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Analytics, TrafficChart, Users } from './Management';
import { apiRequest } from '../lib/api';
vi.mock('../lib/api',()=>({apiRequest:vi.fn()}));
vi.mock('../lib/supabase',()=>({supabase:null}));
describe('administración',()=>{
 it('no presenta números inventados sin conectar GA4',async()=>{
  apiRequest.mockResolvedValue({configured:false,daily:[],products:[],summary:null});
  render(<Analytics token="test"/>);
  expect(await screen.findByText('Conectar Google Analytics')).toBeInTheDocument();
  expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
 });
 it('el gráfico tiene alternativa accesible',()=>{
  render(<TrafficChart daily={[{date:'20261001',totalUsers:8,sessions:10}]}/>);
  expect(screen.getByRole('img')).toHaveAccessibleName('Usuarios de Google Analytics por día');
  expect(screen.getByText('Ver datos del gráfico')).toBeInTheDocument();
 });
 it('un editor no recibe el formulario de invitación',async()=>{
  apiRequest.mockResolvedValue([]);
  render(<Users token="test" admin={{role:'operator'}}/>);
  expect(screen.queryByRole('button',{name:'Enviar invitación'})).not.toBeInTheDocument();
  expect(await screen.findByText('La creación de cuentas está reservada al administrador propietario.')).toBeInTheDocument();
 });
});
