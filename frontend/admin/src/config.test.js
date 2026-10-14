import { describe, expect, it } from 'vitest';
import { isAllowedAdminPath } from './config';

describe('ruta administrativa discreta', () => {
  it('acepta la ruta configurada y sus subrutas', () => {
    expect(isAllowedAdminPath('/admin')).toBe(true);
    expect(isAllowedAdminPath('/admin/productos')).toBe(true);
  });

  it('no expone el admin en rutas publicas', () => {
    expect(isAllowedAdminPath('/catalogo')).toBe(false);
    expect(isAllowedAdminPath('/')).toBe(false);
  });
});
