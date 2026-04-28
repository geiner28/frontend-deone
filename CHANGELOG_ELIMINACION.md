# Actualizaciones — Eliminación desde el Dashboard

**Fecha:** 27 de abril de 2026
**Rama:** `main` · Último commit: `a1587b3`

## Resumen
Se implementó la eliminación de **usuarios**, **obligaciones** y **facturas** desde el panel admin, consumiendo los nuevos endpoints `DELETE` del backend.

## Cambios por endpoint

| Endpoint | Helper en `src/lib/api.ts` | Default |
|----------|---------------------------|---------|
| `DELETE /api/users/:id` | `deleteUsuario({ id }, { hard?, force? })` | `force=true` (cascada) |
| `DELETE /api/obligaciones/:id` | `deleteObligacion(id, { force? })` | `force=true` (cascada en facturas) |
| `DELETE /api/facturas/:id` | `deleteFactura(id)` | sin restricciones de estado |

## UI añadida

- **`/clientes` (detalle del cliente)** — panel "Acciones rápidas":
  - Botón **Eliminar cliente** → modal con opción de borrado físico (soft delete por defecto). Cascada automática (`force=true`) sobre obligaciones, facturas, recargas y pagos.
  - Botón **Eliminar obligación** → modal con la lista de obligaciones del mes y botón individual por cada una.
  - En cada fila de factura, menú de acciones con opción **Eliminar** (siempre disponible). Modal de confirmación que avisa si hay pagos asociados.
- **`/usuarios`** — botón **Eliminar** en el perfil del usuario (modal con borrado físico opcional).
- **`/obligaciones`** — icono de papelera en cada tarjeta + modal con cascada opcional.

## Tipos nuevos (`src/types/index.ts`)
- `DeleteUsuarioData`
- `DeleteObligacionData`

## Notas
- Las llamadas pasan por `/api/proxy/*`, que añade el header `x-admin-api-key`.
- Tras eliminar, se recargan automáticamente los datos del perfil para reflejar contadores recalculados.
- Build de Next.js validado (`npm run build`) antes de cada despliegue.
