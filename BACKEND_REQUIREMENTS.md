# Requerimientos al Backend — Pendientes para cerrar el Dashboard Admin

**Fecha:** 28 de abril de 2026
**Repo frontend:** `frontend-deone` · rama `main`
**Contexto:** Cambios solicitados (estados de obligaciones, notificaciones admin/bot separadas, factura pagada → campaña bot, campos en pop-ups, etiqueta por servicio). Lo implementado en frontend está en commits previos; este documento lista lo que **necesita el backend** para cerrar las funcionalidades.

---

## 1. Filtrar notificaciones por canal (server-side)

**Endpoints afectados:**
- `GET /api/admin/notificaciones/list`
- `GET /api/admin/notificaciones/estadisticas`
- `GET /api/admin/notificaciones/alertas`
- `GET /api/admin/notificaciones/automaticas`

**Agregar query param:**

```
?canal=whatsapp|telegram|admin|interno
?canal_grupo=bot|admin     # (bot = whatsapp+telegram, admin = interno/dashboard)
```

**Por qué:** Hoy el filtro es client-side; con paginación se rompe (solo filtra la página actual). Las stats también deben respetar el filtro.

---

## 2. Separar destinatario admin vs usuario en notificaciones

**Problema actual:** No hay forma confiable de saber si una notificación es **para el admin** o **para el usuario/bot**. Hoy se infiere por `tipo` y `usuario_id IS NULL`.

**Cambio propuesto en la tabla `notificaciones`:**

```sql
ALTER TABLE notificaciones
ADD COLUMN destinatario VARCHAR(10)
  CHECK (destinatario IN ('admin', 'usuario'))
  DEFAULT 'usuario';
```

**Exponerlo en respuestas y como filtro:**

```
GET /api/admin/notificaciones/list?destinatario=admin
GET /api/admin/notificaciones/list?destinatario=usuario
```

---

## 3. Generar campaña automática "obligación pagada" para el bot

**Problema actual:** El frontend, después de confirmar el pago, llama manualmente a `POST /api/notificaciones` con `tipo: 'obligacion_cumplida'`. Es frágil: si se paga desde otro flujo (cron, bot, otro admin) la notificación no se dispara.

**Solución correcta:** Que `PUT /api/pagos/:id/confirmar` lo dispare automáticamente cuando detecta que `obligacion_estado` cambió a `'completada'`.

**Notificación esperada:**

```json
{
  "usuario_id": "...",
  "tipo": "obligacion_cumplida",
  "canal": "whatsapp",
  "destinatario": "usuario",
  "estado": "pendiente",
  "payload": {
    "obligacion_id": "...",
    "servicio": "...",
    "periodo": "2026-04-01",
    "monto_total": 250000,
    "mensaje": "✅ ¡Tu obligación de <periodo> fue completada!"
  }
}
```

> Si ya está implementado, confirmar para quitar la llamada manual del frontend en `PagarFacturaModal.tsx`.

---

## 4. Validaciones en cambio de estado de obligación

**Endpoint:** `PUT /api/obligaciones/:id` (acepta `{ estado }`).

**Confirmar/agregar:**

- ✅ Validar transiciones inválidas. Ej: de `completada` no debería volver a `activa` sin que el backend desmarque pagos.
- ✅ Al pasar a `cancelada`, **suspender los recordatorios y solicitudes de recarga** automáticos (cron job) de esa obligación.
- ✅ Al pasar manualmente a `completada`, disparar la campaña del **punto 3**.

---

## 5. Campos faltantes en endpoints (para los pop-ups del dashboard)

### 5a. `POST /api/obligaciones` — agregar campos opcionales

Hoy solo acepta `{ telefono, descripcion, periodo }`. Para el modal "Nueva obligación":

```json
{
  "telefono": "...",
  "descripcion": "...",
  "periodo": "2026-04-01",
  "servicio": "EPM Energía",          // 🆕 opcional
  "tipo_referencia": "factura",        // 🆕 opcional
  "numero_referencia": "EPM-2026-04",  // 🆕 opcional
  "pagina_pago": "https://...",        // 🆕 opcional
  "periodicidad": "mensual"            // 🆕 opcional
}
```

### 5b. `POST /api/facturas/captura` — confirmar persistencia de `etiqueta`

Verificar que cuando enviamos `etiqueta` desde el frontend:
- Se **guarde** en la tabla `facturas`.
- Se **devuelva** en `GET /api/facturas/obligacion/:id`, `GET /api/admin/facturas` y `GET /api/admin/clientes/:telefono`.

Hoy en algunas respuestas el campo no aparece.

### 5c. `PUT /api/facturas/:id/validar` — agregar campo opcional `periodo`

Hoy `ValidarFacturaPayload` no incluye `periodo` aunque el modal lo muestra. Opciones:
1. Aceptar `periodo` en el body.
2. Documentar que se hereda de la obligación y removerlo del modal del frontend.

---

## 6. Catálogo de etiquetas (opcional pero útil)

Para que la etiqueta del servicio sea consistente entre clientes:

**Opción A — Tabla nueva:**

```
GET  /api/etiquetas       → [{ id, nombre, color? }]
POST /api/etiquetas       { "nombre": "energia_solar" }
```

**Opción B — Sin tabla (más simple):**

```
GET /api/facturas/etiquetas-distinct
→ ["energia", "agua", "internet", "gas", "celular", "tv", ...]
```

(`SELECT DISTINCT etiqueta FROM facturas WHERE etiqueta IS NOT NULL`)

---

## Resumen ejecutivo

| Prioridad | Cambio | Endpoint(s) | Esfuerzo |
|-----------|--------|-------------|----------|
| 🔴 Alta | Auto-generar `obligacion_cumplida` en `confirmarPago` | `PUT /pagos/:id/confirmar` | Bajo |
| 🔴 Alta | Filtros `?canal=` y `?destinatario=` | `/admin/notificaciones/*` | Medio |
| 🔴 Alta | Columna `destinatario` en tabla `notificaciones` | (DB + responses) | Bajo |
| 🟡 Media | Aceptar `servicio`, `tipo_referencia`, `numero_referencia`, `pagina_pago`, `periodicidad` | `POST /obligaciones` | Bajo |
| 🟡 Media | Persistir y devolver `etiqueta` consistentemente | `POST /facturas/captura` + GETs | Bajo |
| 🟡 Media | Validar transiciones de estado + suspender jobs en `cancelada` | `PUT /obligaciones/:id` | Medio |
| 🟢 Baja | Aceptar `periodo` en validación de factura | `PUT /facturas/:id/validar` | Bajo |
| 🟢 Baja | Catálogo de etiquetas | `GET /etiquetas` o `/facturas/etiquetas-distinct` | Medio |

---

## Estado del frontend (qué ya quedó listo)

- ✅ Estados `en_progreso`, `completada`, `cancelada` con colores en `<Badge>`.
- ✅ `<select>` para cambiar estado en cada tarjeta de obligación (`PUT /obligaciones/:id`).
- ✅ Columna `Canal` y filtro client-side **Todos / Bot·WhatsApp / Admin** en `/notificaciones`.
- ✅ Auto-completar `etiqueta` desde `servicio` en modales de captura y validación de factura.
- ✅ Llamada manual a `crearNotificacion('obligacion_cumplida')` cuando `obligacion_estado === 'completada'` tras `confirmarPago` *(removible cuando el backend cubra el punto 3)*.

---

**Acción requerida:** Confirmar cuáles puntos se aprueban del backend y un estimado para ajustar el frontend a medida que se liberen.
