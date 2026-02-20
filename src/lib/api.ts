// Nota: las llamadas al API se hacen mediante la ruta proxy server-side `/api/proxy`.
// Esto evita exponer el `DEONE_API_KEY` al bundle cliente.
import type {
  ApiResponse,
  HealthData,
  Usuario,
  UpsertUsuarioPayload,
  UpsertUsuarioData,
  UpdatePlanPayload,
  UpdatePlanData,
  ListUsuariosData,
  Obligacion,
  CreateObligacionPayload,
  UpdateObligacionPayload,
  Factura,
  CapturaFacturaPayload,
  CapturaFacturaData,
  ValidarFacturaPayload,
  ValidarFacturaData,
  RechazarFacturaPayload,
  RechazarFacturaData,
  ReportarRecargaPayload,
  RecargaData,
  AprobarRecargaPayload,
  AprobarRecargaData,
  RechazarRecargaPayload,
  RechazarRecargaData,
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
  request<Usuario>(`/users/by-telefono/${encodeURIComponent(telefono)}`);

// GET /api/users?page=&limit=&search=
export const listUsuarios = (params?: { page?: number; limit?: number; search?: string }) => {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.search) sp.set('search', params.search);
  return request<ListUsuariosData>(`/users?${sp.toString()}`);
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
// GET /api/admin/dashboard
export const getAdminDashboard = () =>
  request<AdminDashboardData>('/admin/dashboard');

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

// GET /api/admin/clientes/:telefono
export const getAdminClientePerfil = (telefono: string) =>
  request<AdminClientePerfilData>(`/admin/clientes/${encodeURIComponent(telefono)}`);

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
