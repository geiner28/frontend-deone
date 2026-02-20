// ─── API Response Wrapper ─────────────────────────────────────────────────────
export interface ApiResponse<T> {
  ok: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details: unknown | null;
  } | string | null;
}

// ─── Health ───────────────────────────────────────────────────────────────────
export interface HealthData {
  service: string;
  status: string;
  timestamp: string;
}

// ─── Usuario ──────────────────────────────────────────────────────────────────
export type Plan = 'control' | 'tranquilidad' | 'respaldo';

export interface AjustesUsuario {
  id: string;
  creado_en?: string;
  usuario_id?: string;
  tipo_notificacion: string;
  umbral_monto_alto: number;
  recordatorios_activos: boolean;
  dias_anticipacion_recordatorio: number;
  requiere_autorizacion_monto_alto: boolean;
}

export interface Usuario {
  id: string;
  creado_en: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  direccion: string | null;
  plan: Plan;
  activo: boolean;
  ajustes_usuario: AjustesUsuario;
}

export interface UpsertUsuarioPayload {
  telefono: string;
  nombre?: string;
  apellido?: string;
  correo?: string;
}

// API devuelve { usuario, ajustes, es_nuevo }
export interface UpsertUsuarioData {
  usuario: Usuario;
  ajustes: AjustesUsuario;
  es_nuevo: boolean;
}

export interface UpdatePlanPayload {
  telefono: string;
  plan: Plan;
}

// API devuelve { usuario, plan_anterior, plan_nuevo }
export interface UpdatePlanData {
  usuario: Usuario;
  plan_anterior: Plan;
  plan_nuevo: Plan;
}

// GET /api/users response
export interface ListUsuariosData {
  usuarios: Usuario[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ─── Factura ──────────────────────────────────────────────────────────────────
export interface Factura {
  id: string;
  creado_en?: string;
  servicio: string;
  monto: number;
  fecha_vencimiento?: string;
  fecha_emision?: string;
  estado: string;
  requiere_revision?: boolean;
  periodo?: string;
  origen?: string;
  archivo_url?: string;
  extraccion_estado?: string;
  extraccion_confianza?: number;
  obligacion_id?: string;
  motivo_rechazo?: string;
}

// ─── Obligación ───────────────────────────────────────────────────────────────
export interface Obligacion {
  id: string;
  creado_en: string;
  usuario_id: string;
  servicio?: string;
  pagina_pago?: string | null;
  tipo_referencia?: string;
  numero_referencia?: string;
  periodicidad?: string | null;
  estado: string;
  quincena_objetivo?: string | null;
  descripcion: string;
  periodo: string;
  total_facturas: number;
  facturas_pagadas: number;
  monto_total: number;
  monto_pagado: number;
  completada_en: string | null;
  facturas?: Factura[];
  progreso?: number;
  // GET /api/obligaciones/:id includes user info
  usuarios?: { nombre: string; apellido: string; telefono: string };
}

export interface CreateObligacionPayload {
  telefono: string;
  descripcion: string;
  periodo: string;
}

export interface UpdateObligacionPayload {
  descripcion?: string;
  estado?: 'activa' | 'en_progreso' | 'completada' | 'cancelada';
}

// ─── Factura Captura ──────────────────────────────────────────────────────────
export interface CapturaFacturaPayload {
  telefono: string;
  obligacion_id: string;
  servicio: string;
  monto: number;
  periodo?: string;
  fecha_vencimiento?: string;
  fecha_emision?: string;
  origen?: string;
  archivo_url?: string;
  extraccion_estado?: string;
  extraccion_json?: Record<string, unknown>;
  extraccion_confianza?: number;
}

export interface CapturaFacturaData {
  factura_id: string;
  servicio: string;
  monto: number;
  estado: string;
  requiere_revision: boolean;
}

// ─── Factura Validación ───────────────────────────────────────────────────────
export interface ValidarFacturaPayload {
  monto: number;
  fecha_vencimiento?: string;
  fecha_emision?: string;
  observaciones_admin?: string;
}

export interface ValidarFacturaData {
  factura_id: string;
  servicio: string;
  estado: string;
}

// ─── Factura Rechazo ──────────────────────────────────────────────────────────
export interface RechazarFacturaPayload {
  motivo_rechazo: string;
}

export interface RechazarFacturaData {
  factura_id: string;
  servicio: string;
  estado: string;
}

// ─── Pago ─────────────────────────────────────────────────────────────────────
export interface CrearPagoPayload {
  telefono: string;
  factura_id: string;
}

export interface CrearPagoData {
  pago_id: string;
  estado: string;
  monto: number;
  servicio?: string;
}

export interface ConfirmarPagoPayload {
  proveedor_pago?: string;
  referencia_pago?: string;
  comprobante_pago_url?: string;
}

export interface ConfirmarPagoData {
  pago_id: string;
  estado: string;
  factura_estado: string;
  obligacion_estado: string;
  nueva_obligacion_id: string | null;
}

export interface FallarPagoPayload {
  error_detalle: string;
}

export interface FallarPagoData {
  pago_id: string;
  estado: string;
}

// ─── Recarga ──────────────────────────────────────────────────────────────────
export interface ReportarRecargaPayload {
  telefono: string;
  periodo: string;
  monto: number;
  comprobante_url: string;
  referencia_tx?: string;
}

export interface RecargaData {
  recarga_id: string;
  estado: string;
  mensaje?: string;
}

export interface AprobarRecargaPayload {
  observaciones_admin?: string;
}

export interface AprobarRecargaData {
  id: string;
  usuario_id: string;
  monto: number;
  estado: string;
  periodo: string;
  comprobante_url: string;
  validada_en: string;
  observaciones_admin?: string;
}

export interface RechazarRecargaPayload {
  motivo_rechazo: string;
}

export interface RechazarRecargaData {
  id: string;
  monto: number;
  estado: string;
  motivo_rechazo: string;
  validada_en: string;
}

// ─── Disponible ───────────────────────────────────────────────────────────────
export interface DisponibleData {
  usuario_id: string;
  periodo: string;
  total_recargas: number;
  total_pagos: number;
  disponible: number;
}

// ─── Revisiones Admin ─────────────────────────────────────────────────────────
export interface Revision {
  id: string;
  tipo: 'factura' | 'recarga';
  estado: 'pendiente' | 'en_proceso' | 'resuelta' | 'descartada';
  prioridad: number;
  razon: string;
  factura_id: string | null;
  recarga_id: string | null;
  creado_en: string;
  asignada_a: string | null;
  resuelta_por: string | null;
  resuelta_en: string | null;
  notificada: boolean;
  usuarios?: {
    nombre: string;
    apellido: string;
    telefono: string;
  };
}

export interface TomarRevisionPayload {
  admin_id?: string;
}

export interface DescartarRevisionPayload {
  razon?: string;
}

// ─── Notificaciones (API real) ────────────────────────────────────────────────
export interface NotificacionAPI {
  id: string;
  creado_en: string;
  usuario_id: string;
  tipo: string;
  canal: string;
  payload: Record<string, unknown>;
  estado: 'pendiente' | 'enviada' | 'fallida' | 'leida';
  ultimo_error: string | null;
  usuarios?: {
    nombre: string;
    apellido: string;
    telefono: string;
  };
}

export interface ListNotificacionesData {
  notificaciones: NotificacionAPI[];
  total: number;
  limit: number;
  offset: number;
}

export interface CrearNotificacionPayload {
  telefono: string;
  tipo: string;
  canal?: string;
  payload?: Record<string, unknown>;
}

export interface CrearNotificacionMasivaPayload {
  tipo: string;
  canal?: string;
  payload?: Record<string, unknown>;
  filtro_plan?: Plan;
}

export interface UpdateNotificacionPayload {
  estado: 'enviada' | 'fallida' | 'leida';
  ultimo_error?: string;
}

export interface BatchEnviadasPayload {
  ids: string[];
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
export interface AdminDashboardData {
  clientes: {
    total: number;
    activos: number;
  };
  obligaciones: {
    activas: number;
    completadas: number;
  };
  financiero: {
    total_recargas_aprobadas: number;
    total_pagos_realizados: number;
    pagos_en_proceso: number;
    recargas_pendientes_validacion: number;
    saldo_global: number;
  };
  revisiones_pendientes: {
    total: number;
    facturas: number;
    recargas: number;
  };
  notificaciones_pendientes: number;
}

// ─── Admin Clientes ───────────────────────────────────────────────────────────
export interface ListAdminClientesData {
  clientes: Usuario[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AdminClientePerfilData {
  usuario: Usuario;
  resumen: {
    total_obligaciones: number;
    obligaciones_activas: number;
    obligaciones_completadas: number;
    total_recargas_aprobadas: number;
    total_pagos_realizados: number;
    saldo_disponible: number;
  };
  obligaciones: Obligacion[];
  recargas: {
    id: string;
    monto: number;
    estado: string;
    periodo: string;
    comprobante_url?: string;
    motivo_rechazo?: string;
    observaciones_admin?: string;
  }[];
  pagos: {
    id: string;
    monto_aplicado: number;
    estado: string;
    ejecutado_en?: string;
    proveedor_pago?: string;
    referencia_pago?: string;
    comprobante_pago_url?: string;
    facturas?: {
      servicio: string;
      monto: number;
      periodo: string;
    };
  }[];
  notificaciones_recientes: NotificacionAPI[];
}

// ─── Admin Pagos ──────────────────────────────────────────────────────────────
export interface AdminPago {
  id: string;
  creado_en: string;
  usuario_id: string;
  factura_id: string;
  recarga_id?: string;
  monto_aplicado: number;
  estado: string;
  ejecutado_en?: string;
  proveedor_pago?: string;
  referencia_pago?: string;
  comprobante_pago_url?: string;
  error_detalle?: string;
  facturas?: {
    monto: number;
    periodo: string;
    servicio: string;
    obligacion_id: string;
  };
  usuarios?: {
    nombre: string;
    apellido: string;
    telefono: string;
  };
}

export interface ListAdminPagosData {
  pagos: AdminPago[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ─── Notificaciones (frontend-only, para panel UI) ───────────────────────────
export type NotificationType =
  | 'recarga_pendiente'
  | 'factura_nueva'
  | 'recarga_aprobada'
  | 'obligacion_cumplida'
  | 'pago_confirmado'
  | 'usuario_nuevo'
  | 'plan_actualizado';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  target: 'admin' | 'usuario';
  meta?: Record<string, string>;
  /** URL to navigate to when the notification is clicked */
  actionUrl?: string;
  /** Label for the action button */
  actionLabel?: string;
}
