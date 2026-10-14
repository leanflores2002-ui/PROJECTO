import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import ProductPreview from './ProductPreview';
import { apiRequest } from '../lib/api';
import { config } from '../config';
vi.mock('../lib/api',()=>({apiRequest:vi.fn()}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('resuelve la base de recursos sin dar acceso al origen del admin',async()=>{
  apiRequest.mockResolvedValue({html:'<html><head><base href="https://backend.example.test/"></head><body>Producto</body></html>'});
  render(<ProductPreview token="qa" id="product-id"/>);
  fireEvent.click(screen.getByRole('button',{name:'Vista previa'}));
  const frame=await screen.findByTitle('Detalle público del producto');
  expect(frame).toHaveAttribute('sandbox','allow-scripts');
  expect(frame.getAttribute('srcdoc')).toContain(`href="${config.publicSiteUrl}/"`);
  expect(frame.getAttribute('srcdoc')).not.toContain('backend.example.test');
});
