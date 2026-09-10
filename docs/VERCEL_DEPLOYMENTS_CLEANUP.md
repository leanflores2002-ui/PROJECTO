# VERCEL DEPLOYMENTS CLEANUP

Fecha: 2026-09-10. Estado: **REVIEW_REQUIRED ? inventario remoto pendiente de acceso autenticado**.

No se eliminaron deployments. No se configur? retenci?n autom?tica. La autorizaci?n para borrar debe ser posterior a una lista concreta y revisable.

## Inventario

| Proyecto | Deployment | Tipo | Fecha | Branch | Commit | Estado | Clasificaci?n | Espacio recuperable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ROMIX Admin | No disponible | No disponible | No disponible | No disponible | No disponible | No verificado | REVIEW_REQUIRED | No disponible |
| romix-public | No disponible | No disponible | No disponible | No disponible | No disponible | No verificado | REVIEW_REQUIRED | No disponible |

Estas filas son bloqueos de auditor?a, no deployments inventados. Production/Preview: cantidades desconocidas en ambos proyectos. **0 candidatos identificados para borrar; no significa que no existan.**

## Criterios a aplicar al obtener acceso

- **KEEP**: deployment actualmente servido por el dominio/alias Production y rollback reciente que el usuario considere importante. Verificar aliases, promoci?n y protecciones; no deducir el activo s?lo por fecha.
- **SAFE_TO_DELETE** (candidato, nunca autorizaci?n): previews antiguos o pruebas reemplazadas de ramas cerradas, sin aliases activos, sin uso como rollback ni revisiones pendientes. Registrar evidencia de esos criterios antes de asignar la categor?a.
- **REVIEW_REQUIRED**: deployment referenciado, rama activa, rollback incierto, alias desconocido, datos incompletos, builds fallidos o estados cuya retenci?n no se haya evaluado.

Listar todas las p?ginas de Production y Preview, con ID/URL, fecha UTC, commit, branch, estado, alias y tama?o si la API lo informa. Verificar estado de ramas/PR y revisar la lista con el usuario. No borrar por antig?edad sin evaluar uso.

## Espacio hist?rico

**No cuantificable con los accesos actuales; 0 bytes recuperados por esta tarea.** Las exclusiones locales existentes afectan uploads futuros cuando se aplican correctamente. No liberan autom?ticamente contenido de deployments previos. La eliminaci?n puede recuperar almacenamiento seg?n la medici?n real de la plataforma; no hay una cifra garantizada basada en los archivos locales.

No se ejecutan comandos DELETE, `vercel remove` ni cambios de retenci?n. Esperar autorizaci?n expl?cita para IDs concretos despu?s de completar este inventario.

[Auditor?a de almacenamiento y mediciones](VERCEL_STORAGE_AUDIT.md)
