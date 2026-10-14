# Cuenta del propietario

El admin incluye **Mi cuenta** en la barra superior: nombre visible, correo y rol de consulta, y cambio de contraseña con confirmación. Supabase solicita un código por correo cuando necesita verificar nuevamente la sesión. Las contraseñas se envían solamente a Supabase Auth; no se registran en auditoría.

## Crear el primer superadmin

Ejecutar en la Shell del backend de Render, desde la raíz del repositorio, con `DATABASE_URL`, `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya configuradas. Si la Shell inicia en `backend/`, primero subir al directorio padre. Reemplazar la URL por el dominio público real del frontend:

```sh
python scripts/invite_superadmin.py --email leandro.cali20002@gmail.com --name Leandro --admin-url https://TU-DOMINIO/admin
```

Antes de ejecutar, autorizar `https://TU-DOMINIO/admin/activate` en Supabase Authentication → URL Configuration → Redirect URLs. El script invita usando la API oficial de Auth y asigna el rol superadmin en `admin_profiles`. No requiere ni genera una contraseña temporal. Abrir el correo de invitación para elegir la contraseña. Si el correo ya existe, el script activa su perfil como superadmin sin modificar la contraseña; usar la contraseña existente.

La operación queda registrada en `audit_logs`. Si falla el envío, no se otorga el rol. Si la invitación se envía pero falla la escritura posterior, volver a ejecutar el mismo comando para completar el perfil existente.

## Estado verificado el 14 de octubre de 2026

El propietario creó la cuenta desde Authentication → Users. Se verificó el correo confirmado y se activó `leandro.cali20002@gmail.com` como superadmin en `admin_profiles`, con registro en auditoría. No se modificó su contraseña. No editar manualmente `auth.users` para crear credenciales.

Validación: 27 pruebas backend, 21 pruebas frontend, lint y build. Navegación a Mi cuenta, guardado de nombre y rechazo de contraseñas diferentes probados en escritorio y móvil con API simulada. La invitación y el cambio real de contraseña requieren validación con Supabase configurado.

## Mejoras de la interfaz administrativa

- Navegación con iconos y una descripción por sección. Ayuda accesible por teclado en la barra superior.
- Panel con accesos directos para agregar, editar, revisar stock y ver análisis. Cuatro indicadores principales; los demás y el período de actividad están en un desplegable.
- Catálogo con filtros y acción de limpieza visible. En móvil, fichas de productos con foto, precio, stock, edición y vista previa.
- Editor con pestañas Datos del producto, Colores y talles y Stock, y orientación para escribir descripciones propias.
- Historial de cambios con etiquetas legibles; nombres de permisos comprensibles. Mi cuenta organizada en dos columnas en escritorio y una en móvil.
- Contraste reforzado, foco visible, controles de 44 px y títulos jerárquicos. El frontend público y las reglas de autorización se mantienen.

Validación del rediseño: 21 pruebas frontend, lint y build. Browser plugin no disponible: se usó Playwright local con API simulada para verificar accesos del panel, ayuda con Escape y retorno de foco, guardado del editor, menú y fichas móviles y Mi cuenta. Se comparó la pantalla con el concepto visual generado; se conservaron textos precisos sobre la conexión pendiente de GA4 en lugar de insinuar que ya hay datos. Los gráficos usan únicamente respuestas del backend en la aplicación real.
