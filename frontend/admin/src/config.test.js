import { describe, expect, it } from 'vitest';
import { isAllowedAdminPath, resolvePublicSiteUrl } from './config';

describe('ruta administrativa discreta', () => {
  it('usa la tienda desplegada en lugar de localhost cuando no hay URL explícita',()=>{
    expect(resolvePublicSiteUrl('', 'https://api.example.test',{hostname:'tienda.example.test',origin:'https://tienda.example.test'})).toBe('https://tienda.example.test');
    expect(resolvePublicSiteUrl('', 'http://localhost:8000',{hostname:'localhost',origin:'http://localhost:5173'})).toBe('http://localhost:8000');
    expect(resolvePublicSiteUrl('https://otra.example.test/', 'https://api.example.test',{hostname:'tienda.example.test'})).toBe('https://otra.example.test');
  });
  it('acepta la ruta configurada y sus subrutas', () => {
    expect(isAllowedAdminPath('/admin')).toBe(true);
    expect(isAllowedAdminPath('/admin/productos')).toBe(true);
  });

  it('no expone el admin en rutas publicas', () => {
    expect(isAllowedAdminPath('/catalogo')).toBe(false);
    expect(isAllowedAdminPath('/')).toBe(false);
  });
});
