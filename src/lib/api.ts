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
  Obligacion,
  CreateObligacionPayload,
  CapturaFacturaPayload,
  CapturaFacturaData,
  ReportarRecargaPayload,
  RecargaData,
  AprobarRecargaData,
  DisponibleData,
} from '@/types';

const PROXY_PREFIX = '/api/proxy';

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const res = await fetch(`${PROXY_PREFIX}${path}`, {
    ...options,
    // El proxy añade el header X-admin-api-key. Aquí sólo garantizamos content-type cuando hay body.
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const json = await res.json();
  return json as ApiResponse<T>;
}

// ─── Health ───────────────────────────────────────────────────────────────────
export const getHealth = () =>
  request<HealthData>('/health', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

// ─── Usuarios ─────────────────────────────────────────────────────────────────
export const upsertUsuario = (payload: UpsertUsuarioPayload) =>
  request<UpsertUsuarioData>('/users/upsert', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getUsuarioByTelefono = (telefono: string) =>
  request<Usuario>(`/users/by-telefono/${telefono}`);

export const updatePlan = (payload: UpdatePlanPayload) =>
  request<UpdatePlanData>('/users/plan', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

// ─── Obligaciones ─────────────────────────────────────────────────────────────
export const createObligacion = (payload: CreateObligacionPayload) =>
  request<Obligacion>('/obligaciones', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getObligaciones = (telefono: string) =>
  request<Obligacion[]>(`/obligaciones?telefono=${encodeURIComponent(telefono)}`);

// ─── Facturas ─────────────────────────────────────────────────────────────────
export const capturaFactura = (payload: CapturaFacturaPayload) =>
  request<CapturaFacturaData>('/facturas/captura', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// ─── Recargas ─────────────────────────────────────────────────────────────────
export const reportarRecarga = (payload: ReportarRecargaPayload) =>
  request<RecargaData>('/recargas/reportar', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const aprobarRecarga = (recarga_id: string) =>
  request<AprobarRecargaData>(`/recargas/${recarga_id}/aprobar`, {
    method: 'PUT',
  });

// ─── Disponible ───────────────────────────────────────────────────────────────
export const getDisponible = (telefono: string, periodo: string) =>
  request<DisponibleData>(
    `/disponible?telefono=${encodeURIComponent(telefono)}&periodo=${encodeURIComponent(periodo)}`
  );
