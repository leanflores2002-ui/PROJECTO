import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PasswordForm } from './Account';
import { supabase } from '../lib/supabase';
vi.mock('../lib/supabase',()=>({supabase:{auth:{updateUser:vi.fn(),reauthenticate:vi.fn()}}}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe('contraseña de mi cuenta',()=>{
 it('no envía contraseñas que no coinciden',()=>{
  render(<PasswordForm/>);
  fireEvent.change(screen.getByLabelText('Nueva contraseña'),{target:{value:'test-password-123'}});
  fireEvent.change(screen.getByLabelText('Repetir contraseña'),{target:{value:'test-password-456'}});
  fireEvent.submit(screen.getByRole('button',{name:'Guardar contraseña'}).closest('form'));
  expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
  expect(supabase.auth.updateUser).not.toHaveBeenCalled();
 });
 it('confirma el cambio y limpia los campos',async()=>{
  supabase.auth.updateUser.mockResolvedValue({error:null});
  render(<PasswordForm/>);
  for(const label of ['Nueva contraseña','Repetir contraseña'])fireEvent.change(screen.getByLabelText(label),{target:{value:'test-password-123'}});
  fireEvent.submit(screen.getByRole('button',{name:'Guardar contraseña'}).closest('form'));
  expect(await screen.findByText('Contraseña guardada.')).toBeInTheDocument();
  expect(screen.getByLabelText('Nueva contraseña')).toHaveValue('');
 });
});
