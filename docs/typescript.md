# TypeScript en ROMIX

La fuente TypeScript vive en `frontend/src/`. Por ahora contiene solamente una
base de tipos de producto y el componente nativo `romix-toast`.

Para validar los tipos sin generar archivos:

```bash
npm run check:ts
```

Para compilar:

```bash
npm run build:ts
```

El JavaScript generado se escribe en `frontend/public/assets/js/ts/` y se
versiona porque el sitio se despliega como archivos estáticos. No editar esos
`.js` manualmente: los cambios deben hacerse en `frontend/src/*.ts` y luego
regenerarse.

La estrategia es migrar componentes progresivamente. No se deben convertir de
una vez los scripts vanilla existentes ni agregar un bundler frontend.
