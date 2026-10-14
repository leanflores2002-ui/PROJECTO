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

El correo indicado todavía no existía en `auth.users`. La invitación **no se ejecutó** desde la conexión de base de datos: esa conexión no dispone de la API privada de Auth. No editar manualmente `auth.users` para crear credenciales.

Validación: 27 pruebas backend, 21 pruebas frontend, lint y build. Navegación a Mi cuenta, guardado de nombre y rechazo de contraseñas diferentes probados en escritorio y móvil con API simulada. La invitación y el cambio real de contraseña requieren validación con Supabase configurado.
