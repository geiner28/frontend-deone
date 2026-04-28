// Nota: las llamadas al API se hacen mediante la ruta proxy server-side `/api/proxy`.
// Esto evita exponer el `DEONE_API_KEY` al bundle cliente.
import type {
  ApiResponse,
  HealthData,
  Usuario,
  UpsertUsuarioPayload,
  UpsertUsuarioData,
  UpsertUsuarioAdminPayload,
  UpsertUsuarioAdminData,
  UpdatePlanPayload,
  UpdatePlanData,
  ListUsuariosData,
  Obligacion,
  CreateObligacionPayload,
  UpdateObligacionPayload,
  DeleteObligacionData,
  DeleteUsuarioData,
  Factura,
  FacturaEnriquecida,
  ListarTodasLasFacturasData,
  CapturaFacturaPayload,
  CapturaFacturaData,
  ValidarFacturaPayload,
  ValidarFacturaData,
  RechazarFacturaPayload,
  RechazarFacturaData,
  AproximarFacturaPayload,
  AproximarFacturaData,
  ReportarRecargaPayload,
  RecargaData,
  AprobarRecargaPayload,
  AprobarRecargaData,
  RechazarRecargaPayload,
  RechazarRecargaData,
  ObtenerRecargasPendientesData,
  DisponibleData,
  CrearPagoPayload,
  CrearPagoData,
  ConfirmarPagoPayload,
  ConfirmarPagoData,
  FallarPagoPayload,
  FallarPagoData,
  Revision,
  TomarRevisionPayload,
  DescartarRevisionPayload,
  NotificacionAPI,
  ListNotificacionesData,
  CrearNotificacionPayload,
  CrearNotificacionMasivaPayload,
  UpdateNotificacionPayload,
  BatchEnviadasPayload,
  AdminDashboardData,
  ListAdminClientesData,
  AdminClientePerfilData,
  ListAdminPagosData,
  ListHistorialData,
  ListTransaccionesData,
  ProgramacionRecargas,
} from '@/types';

// ══════════════════════════════════════════════════════════════════════════════
// 🔧 Configuración de conexión al backend
// ══════════════════════════════════════════════════════════════════════════════
// Opción A (producción — Netlify, Vercel, etc.):
//   NEXT_PUBLIC_DEONE_API_BASE_URL = https://prueba-supabase.onrender.com/api
//   NEXT_PUBLIC_DEONE_API_KEY      = TK2026A7F9X3M8N2P5Q1R4T6Y8U0I9O3
//   → El frontend llama al backend directamente.
//
// Opción B (desarrollo local):
//   No defines NEXT_PUBLIC_*, y el frontend usa el proxy /api/proxy
//   que lee DEONE_API_KEY / ADMIN_API_KEY del servidor.
// ══════════════════════════════════════════════════════════════════════════════
const PUBLIC_API_BASE = process.env.NEXT_PUBLIC_DEONE_API_BASE_URL || '';
const PUBLIC_API_KEY = process.env.NEXT_PUBLIC_DEONE_API_KEY || '';
const API_PREFIX = PUBLIC_API_BASE ? PUBLIC_API_BASE.replace(/\/$/, '') : '/api/proxy';

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_PREFIX}${safePath}`;

  // Si llamamos directo al backend (no al proxy), incluir headers de autenticación
  const authHeaders: Record<string, string> = {};
  if (PUBLIC_API_BASE && PUBLIC_API_KEY) {
    authHeaders['X-admin-api-key'] = PUBLIC_API_KEY;
    authHeaders['X-bot-api-key'] = PUBLIC_API_KEY;
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers || {}),
    },
  });
  const json = await res.json();
  return json as ApiResponse<T>;
}

// ─── 1. Health ────────────────────────────────────────────────────────────────
// GET /api/health
export const getHealth = () => request<HealthData>('/health');

// ─── 2. Usuarios (4 endpoints) ───────────────────────────────────────────────
// POST /api/users/upsert
export const upsertUsuario = (payload: UpsertUsuarioPayload) =>
  request<UpsertUsuarioData>('/users/upsert', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// PUT /api/users/plan
export const updatePlan = (payload: UpdatePlanPayload) =>
  request<UpdatePlanData>('/users/plan', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

// GET /api/users/by-telefono/:telefono
export const getUsuarioByTelefono = (telefono: string) =>
  request<Usuario>(`/admin/users/by-telefono/${encodeURIComponent(telefono)}`);

// GET /api/users?page=&limit=&search=
export const listUsuarios = (params?: { page?: number; limit?: number; search?: string }) => {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.search) sp.set('search', params.search);
  return request<ListUsuariosData>(`/users?${sp.toString()}`);
};

// DELETE /api/users/:id  ó  /api/users?telefono=XXX
// Por defecto soft delete; pasar { hard: true } para borrado físico.
export const deleteUsuario = (
  identifier: { id?: string; telefono?: string },
  options?: { hard?: boolean }
) => {
  const sp = new URLSearchParams();
  if (options?.hard) sp.set('hard', 'true');
  const qs = sp.toString();
  const suffix = qs ? `?${qs}` : '';
  if (identifier.id) {
    return request<DeleteUsuarioData>(`/users/${encodeURIComponent(identifier.id)}${suffix}`, {
      method: 'DELETE',
    });
  }
  if (identifier.telefono) {
    const sp2 = new URLSearchParams({ telefono: identifier.telefono });
    if (options?.hard) sp2.set('hard', 'true');
    return request<DeleteUsuarioData>(`/users?${sp2.toString()}`, { method: 'DELETE' });
  }
  return Promise.resolve({
    ok: false,
    data: null,
    error: { code: 'VALIDATION_ERROR', message: 'Debes indicar id o telefono', details: null },
  } as ApiResponse<DeleteUsuarioData>);
};

// ─── 3. Obligaciones (4 endpoints) ───────────────────────────────────────────
// POST /api/obligaciones
export const createObligacion = (payload: CreateObligacionPayload) =>
  request<Obligacion>('/obligaciones', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// GET /api/obligaciones?telefono=&estado=
export const getObligaciones = (telefono: string, estado?: string) => {
  const sp = new URLSearchParams({ telefono });
  if (estado) sp.set('estado', estado);
  return request<Obligacion[]>(`/obligaciones?${sp.toString()}`);
};

// GET /api/obligaciones/:id
export const getObligacionById = (id: string) =>
  request<Obligacion>(`/obligaciones/${id}`);

// PUT /api/obligaciones/:id
export const updateObligacion = (id: string, payload: UpdateObligacionPayload) =>
  request<Obligacion>(`/obligaciones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

// DELETE /api/obligaciones/:id  (?force=true para cascada en facturas)
export const deleteObligacion = (id: string, options?: { force?: boolean }) => {
  const sp = new URLSearchParams();
  if (options?.force) sp.set('force', 'true');
  const qs = sp.toString();
  return request<DeleteObligacionData>(`/obligaciones/${id}${qs ? `?${qs}` : ''}`, {
    method: 'DELETE',
  });
};

// ─── 4. Facturas (4 endpoints) ───────────────────────────────────────────────
// POST /api/facturas/captura
export const capturaFactura = (payload: CapturaFacturaPayload) =>
  request<CapturaFacturaData>('/facturas/captura', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// GET /api/facturas/obligacion/:obligacion_id
export const getFacturasByObligacion = (obligacionId: string) =>
  request<Factura[]>(`/facturas/obligacion/${obligacionId}`);

// PUT /api/facturas/:id/validar
export const validarFactura = (facturaId: string, payload: ValidarFacturaPayload) =>
  request<ValidarFacturaData>(`/facturas/${facturaId}/validar`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

// PUT /api/facturas/:id/rechazar
export const rechazarFactura = (facturaId: string, payload: RechazarFacturaPayload) =>
  request<RechazarFacturaData>(`/facturas/${facturaId}/rechazar`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

// PUT /api/facturas/:id/aproximar
export const aproximarFactura = (facturaId: string, payload: AproximarFacturaPayload) =>
  request<AproximarFacturaData>(`/facturas/${facturaId}/aproximar`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

// GET /api/admin/facturas — Listar todas las facturas (admin panel)
export const getAllFacturas = (params?: { estado?: string; usuario_id?: string; periodo?: string; page?: number; limit?: number }) => {
  const sp = new URLSearchParams();
  if (params?.estado) sp.set('estado', params.estado);
  if (params?.usuario_id) sp.set('usuario_id', params.usuario_id);
  if (params?.periodo) sp.set('periodo', params.periodo);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  return request<ListarTodasLasFacturasData>(`/admin/facturas?${sp.toString()}`);
};

// ─── 5. Recargas (3 endpoints) ───────────────────────────────────────────────
// POST /api/recargas/reportar
export const reportarRecarga = (payload: ReportarRecargaPayload) =>
  request<RecargaData>('/recargas/reportar', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// PUT /api/recargas/:id/aprobar
export const aprobarRecarga = (recargaId: string, payload?: AprobarRecargaPayload) =>
  request<AprobarRecargaData>(`/recargas/${recargaId}/aprobar`, {
    method: 'PUT',
    body: JSON.stringify(payload ?? {}),
  });

// PUT /api/recargas/:id/rechazar
export const rechazarRecarga = (recargaId: string, payload: RechazarRecargaPayload) =>
  request<RechazarRecargaData>(`/recargas/${recargaId}/rechazar`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

// GET /api/recargas/pendientes?telefono=XXXX
export const obtenerRecargasPendientes = (telefono: string) =>
  request<ObtenerRecargasPendientesData>(`/recargas/pendientes?telefono=${encodeURIComponent(telefono)}`, {
    method: 'GET',
  });

// ─── 6. Disponible (1 endpoint) ──────────────────────────────────────────────
// GET /api/disponible?telefono=&periodo=
export const getDisponible = (telefono: string, periodo: string) =>
  request<DisponibleData>(
    `/disponible?telefono=${encodeURIComponent(telefono)}&periodo=${encodeURIComponent(periodo)}`
  );

// ─── 7. Pagos (3 endpoints) ──────────────────────────────────────────────────
// POST /api/pagos/crear
export const crearPago = (payload: CrearPagoPayload) =>
  request<CrearPagoData>('/pagos/crear', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// PUT /api/pagos/:id/confirmar
export const confirmarPago = (pagoId: string, payload?: ConfirmarPagoPayload) =>
  request<ConfirmarPagoData>(`/pagos/${pagoId}/confirmar`, {
    method: 'PUT',
    body: JSON.stringify(payload ?? {}),
  });

// PUT /api/pagos/:id/fallar
export const fallarPago = (pagoId: string, payload: FallarPagoPayload) =>
  request<FallarPagoData>(`/pagos/${pagoId}/fallar`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

// ─── 8. Revisiones Admin (3 endpoints) ───────────────────────────────────────
// GET /api/revisiones?tipo=&estado=
export const getRevisiones = (params?: { tipo?: string; estado?: string }) => {
  const sp = new URLSearchParams();
  if (params?.tipo) sp.set('tipo', params.tipo);
  if (params?.estado) sp.set('estado', params.estado);
  return request<Revision[]>(`/revisiones?${sp.toString()}`);
};

// PUT /api/revisiones/:id/tomar
export const tomarRevision = (id: string, payload?: TomarRevisionPayload) =>
  request<Revision>(`/revisiones/${id}/tomar`, {
    method: 'PUT',
    body: JSON.stringify(payload ?? {}),
  });

// PUT /api/revisiones/:id/descartar
export const descartarRevision = (id: string, payload?: DescartarRevisionPayload) =>
  request<Revision>(`/revisiones/${id}/descartar`, {
    method: 'PUT',
    body: JSON.stringify(payload ?? {}),
  });

// ─── 9. Notificaciones (6 endpoints) ─────────────────────────────────────────
// POST /api/notificaciones
export const crearNotificacion = (payload: CrearNotificacionPayload) =>
  request<NotificacionAPI>('/notificaciones', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// POST /api/notificaciones/masiva
export const crearNotificacionMasiva = (payload: CrearNotificacionMasivaPayload) =>
  request<{ total_enviadas: number }>('/notificaciones/masiva', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// GET /api/notificaciones?telefono=&tipo=&estado=&limit=&offset=
export const getNotificaciones = (params?: {
  telefono?: string;
  tipo?: string;
  estado?: string;
  limit?: number;
  offset?: number;
}) => {
  const sp = new URLSearchParams();
  if (params?.telefono) sp.set('telefono', params.telefono);
  if (params?.tipo) sp.set('tipo', params.tipo);
  if (params?.estado) sp.set('estado', params.estado);
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.offset) sp.set('offset', String(params.offset));
  return request<ListNotificacionesData>(`/notificaciones?${sp.toString()}`);
};

// GET /api/notificaciones/pendientes/:telefono
export const getNotificacionesPendientes = (telefono: string) =>
  request<NotificacionAPI[]>(`/notificaciones/pendientes/${encodeURIComponent(telefono)}`);

// PUT /api/notificaciones/:id
export const updateNotificacion = (id: string, payload: UpdateNotificacionPayload) =>
  request<NotificacionAPI>(`/notificaciones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

// POST /api/notificaciones/batch-enviadas
export const batchMarcarEnviadas = (payload: BatchEnviadasPayload) =>
  request<{ actualizadas: number }>('/notificaciones/batch-enviadas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// ─── 10. Admin Dashboard (4 endpoints) ───────────────────────────────────────
// GET /api/admin/dashboard?year=2026&month=2&plan=control
export const getAdminDashboard = (params?: {
  year?: number;
  month?: number;
  plan?: string;
}) => {
  const sp = new URLSearchParams();
  if (params?.year) sp.set('year', String(params.year));
  if (params?.month) sp.set('month', String(params.month));
  if (params?.plan && params.plan !== 'all') sp.set('plan', params.plan);
  
  const queryStr = sp.toString();
  const path = queryStr ? `/admin/dashboard?${queryStr}` : '/admin/dashboard';
  return request<AdminDashboardData>(path);
};

// GET /api/admin/clientes?page=&limit=&search=&plan=&activo=
export const getAdminClientes = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  plan?: string;
  activo?: boolean;
}) => {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.search) sp.set('search', params.search);
  if (params?.plan) sp.set('plan', params.plan);
  if (params?.activo !== undefined) sp.set('activo', String(params.activo));
  return request<ListAdminClientesData>(`/admin/clientes?${sp.toString()}`);
};

// GET /api/admin/clientes/:telefono?periodo=YYYY-MM-DD
export const getAdminClientePerfil = (telefono: string, periodo?: string) => {
  const sp = new URLSearchParams();
  if (periodo) sp.set('periodo', periodo);
  const query = sp.toString();
  const path = query ? `/admin/clientes/${encodeURIComponent(telefono)}?${query}` : `/admin/clientes/${encodeURIComponent(telefono)}`;
  return request<AdminClientePerfilData>(path);
};

// PUT /api/admin/users/:id — Actualizar datos de usuario (nombre, apellido, telefono, correo, etc.)
export const updateAdminUser = (userId: string, payload: Record<string, unknown>) =>
  request<Usuario>(`/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

// GET /api/admin/pagos?page=&limit=&telefono=&estado=&periodo=
export const getAdminPagos = (params?: {
  page?: number;
  limit?: number;
  telefono?: string;
  estado?: string;
  periodo?: string;
}) => {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.telefono) sp.set('telefono', params.telefono);
  if (params?.estado) sp.set('estado', params.estado);
  if (params?.periodo) sp.set('periodo', params.periodo);
  return request<ListAdminPagosData>(`/admin/pagos?${sp.toString()}`);
};

// POST /api/admin/users/upsert — Crear/actualizar usuario (admin-only con campos extendidos)
export const upsertUsuarioAdmin = (payload: UpsertUsuarioAdminPayload) =>
  request<UpsertUsuarioAdminData>('/admin/users/upsert', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// GET /api/programacion-recargas?usuario_id=
export const getProgramacionRecargas = (usuario_id: string) =>
  request<ProgramacionRecargas>(`/programacion-recargas?usuario_id=${encodeURIComponent(usuario_id)}`);

// PUT /api/programacion-recargas — Actualizar/crear programacion de recargas
export const updateProgramacionRecargas = (payload: {
  usuario_id: string;
  cantidad_recargas: 1 | 2;
  dia_1: number;
  dia_2?: number;
}) =>
  request<ProgramacionRecargas>('/programacion-recargas', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

// ─── 11. Admin Notificaciones (5 endpoints - PANEL PROFESIONAL) ──────────────
// GET /api/admin/notificaciones/list — Listar con filtros avanzados
export const getAdminNotificaciones = (filters?: {
  tipo?: string;
  estado?: string;
  usuario_id?: string;
  periodo?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}) => {
  const sp = new URLSearchParams();
  if (filters?.tipo) sp.set('tipo', filters.tipo);
  if (filters?.estado) sp.set('estado', filters.estado);
  if (filters?.usuario_id) sp.set('usuario_id', filters.usuario_id);
  if (filters?.periodo) sp.set('periodo', filters.periodo);
  if (filters?.desde) sp.set('desde', filters.desde);
  if (filters?.hasta) sp.set('hasta', filters.hasta);
  if (filters?.page) sp.set('page', String(filters.page));
  if (filters?.limit) sp.set('limit', String(filters.limit));
  return request<{
    notificaciones: NotificacionAPI[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }>(`/admin/notificaciones/list?${sp.toString()}`);
};

// GET /api/admin/notificaciones/estadisticas — Obtener estadísticas
export const getAdminNotificacionesEstadisticas = (filters?: {
  usuario_id?: string;
  periodo?: string;
  desde?: string;
  hasta?: string;
}) => {
  const sp = new URLSearchParams();
  if (filters?.usuario_id) sp.set('usuario_id', filters.usuario_id);
  if (filters?.periodo) sp.set('periodo', filters.periodo);
  if (filters?.desde) sp.set('desde', filters.desde);
  if (filters?.hasta) sp.set('hasta', filters.hasta);
  return request<{
    estadisticas: {
      total: number;
      no_enviadas: number;
      enviadas: number;
      leidas: number;
      por_tipo: Record<string, { total: number; pendiente: number; enviada: number; leida: number }>;
    };
  }>(`/admin/notificaciones/estadisticas?${sp.toString()}`);
};

// GET /api/admin/notificaciones/cliente/:usuario_id — Notificaciones de un cliente
export const getAdminNotificacionesCliente = (usuario_id: string, filters?: {
  tipo?: string;
  periodo?: string;
}) => {
  const sp = new URLSearchParams();
  if (filters?.tipo) sp.set('tipo', filters.tipo);
  if (filters?.periodo) sp.set('periodo', filters.periodo);
  const query = sp.toString();
  const path = query 
    ? `/admin/notificaciones/cliente/${usuario_id}?${query}`
    : `/admin/notificaciones/cliente/${usuario_id}`;
  return request<{
    usuario: { nombre: string; apellido: string; telefono: string };
    notificaciones: NotificacionAPI[];
    total: number;
  }>(path);
};

// PUT /api/admin/notificaciones/:id/enviada — Marcar como enviada
export const marcarNotificacionEnviada = (notificacion_id: string) =>
  request<NotificacionAPI>(`/admin/notificaciones/${notificacion_id}/enviada`, {
    method: 'PUT',
  });

// POST /api/admin/notificaciones/batch/enviadas — Marcar múltiples como enviadas
export const marcarNotificacionesEnviadasBatch = (notificacion_ids: string[]) =>
  request<{
    actualizadas: number;
    notificaciones: NotificacionAPI[];
  }>(`/admin/notificaciones/batch/enviadas`, {
    method: 'POST',
    body: JSON.stringify({ notificacion_ids }),
  });

// 🧪 GET /api/admin/notificaciones/mock/generar — SOLO TESTING: Generar datos de prueba
export const generarNotificacionesMock = () =>
  request<{
    mensaje: string;
    notificaciones: NotificacionAPI[];
  }>(`/admin/notificaciones/mock/generar`);

// GET /api/admin/notificaciones/alertas — Listar SOLO alertas
export const getAdminAlertasAdmin = (filters?: {
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}) => {
  const sp = new URLSearchParams();
  if (filters?.desde) sp.set('desde', filters.desde);
  if (filters?.hasta) sp.set('hasta', filters.hasta);
  if (filters?.page) sp.set('page', String(filters.page));
  if (filters?.limit) sp.set('limit', String(filters.limit));
  return request<{
    alertas: NotificacionAPI[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }>(`/admin/notificaciones/alertas?${sp.toString()}`);
};

// GET /api/admin/notificaciones/automaticas — Listar SOLO notificaciones automáticas
export const getAdminNotificacionesAutomaticas = (filters?: {
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}) => {
  const sp = new URLSearchParams();
  if (filters?.desde) sp.set('desde', filters.desde);
  if (filters?.hasta) sp.set('hasta', filters.hasta);
  if (filters?.page) sp.set('page', String(filters.page));
  if (filters?.limit) sp.set('limit', String(filters.limit));
  return request<{
    notificaciones: NotificacionAPI[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }>(`/admin/notificaciones/automaticas?${sp.toString()}`);
};

// GET /api/admin/notificaciones/:alerta_id/solicitud-original — Obtener solicitud original
export const getAdminSolicitudOriginal = (alerta_id: string) =>
  request<{
    alerta: NotificacionAPI;
    solicitud_original: NotificacionAPI;
  }>(`/admin/notificaciones/${alerta_id}/solicitud-original`);

// GET /api/admin/notificaciones/acciones — Obtener acciones pendientes agrupadas por usuario
export const getAdminNotificacionesAcciones = (filters?: {
  usuario_id?: string;
  tipo?: string;
  estado?: string;
  page?: number;
  limit?: number;
}) => {
  const sp = new URLSearchParams();
  if (filters?.usuario_id) sp.set('usuario_id', filters.usuario_id);
  if (filters?.tipo) sp.set('tipo', filters.tipo);
  if (filters?.estado) sp.set('estado', filters.estado);
  if (filters?.page) sp.set('page', filters.page.toString());
  if (filters?.limit) sp.set('limit', filters.limit.toString());
  return request<{
    acciones_por_usuario: Array<{
      usuario_id: string;
      usuario: { id: string; nombre: string; apellido: string; telefono: string };
      acciones: Array<{
        revision_id: string;
        tipo: 'factura' | 'recarga';
        prioridad: number;
        razon: string;
        creado_en: string;
        estado: string;
        factura_id?: string;
        servicio?: string;
        monto?: number;
        periodo?: string;
        factura_estado?: string;
        recarga_id?: string;
        recarga_estado?: string;
        comprobante_url?: string;
        display_label: string;
      }>;
      total: number;
    }>;
    total_usuarios: number;
    total_acciones: number;
    page: number;
    limit: number;
    total_pages: number;
  }>(`/admin/notificaciones/acciones?${sp.toString()}`);
};

// ─── 12. Transacciones (Pagos + Recargas unificados) ─────────────────────────
// GET /api/admin/transacciones?page=&limit=&tipo=&usuario_id=&search=
export const getAdminTransacciones = (params?: {
  page?: number;
  limit?: number;
  tipo?: string;
  usuario_id?: string;
  search?: string;
}) => {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.tipo) sp.set('tipo', params.tipo);
  if (params?.usuario_id) sp.set('usuario_id', params.usuario_id);
  if (params?.search) sp.set('search', params.search);
  return request<ListTransaccionesData>(`/admin/transacciones?${sp.toString()}`);
};

// ─── 13. Historial (Audit Log) ───────────────────────────────────────────────
// GET /api/admin/historial?page=&limit=&tipo=&usuario_id=&search=
export const getAdminHistorial = (params?: {
  page?: number;
  limit?: number;
  tipo?: string;
  usuario_id?: string;
  search?: string;
}) => {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.tipo) sp.set('tipo', params.tipo);
  if (params?.usuario_id) sp.set('usuario_id', params.usuario_id);
  if (params?.search) sp.set('search', params.search);
  return request<ListHistorialData>(`/admin/historial?${sp.toString()}`);
};
