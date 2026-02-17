// ─── API Response Wrapper ─────────────────────────────────────────────────────
export interface ApiResponse<T> {
  ok: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details: unknown | null;
  } | null;
}

// ─── Health ───────────────────────────────────────────────────────────────────
export interface HealthData {
  service: string;
  status: string;
  timestamp: string;
}

// ─── Usuario ──────────────────────────────────────────────────────────────────
export type Plan = 'control' | 'tranquilidad';

export interface AjustesUsuario {
  id: string;
  creado_en: string;
  usuario_id: string;
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
  nombre: string;
  apellido: string;
  correo: string;
}

export interface UpsertUsuarioData {
  usuario_id: string;
  creado: boolean;
}

export interface UpdatePlanPayload {
  telefono: string;
  plan: Plan;
}

export interface UpdatePlanData {
  usuario_id: string;
  telefono: string;
  plan_anterior: Plan;
  plan_nuevo: Plan;
}

// ─── Factura ──────────────────────────────────────────────────────────────────
export interface Factura {
  id: string;
  creado_en: string;
  servicio: string;
  monto: number;
  fecha_vencimiento: string;
  estado: string;
  requiere_revision: boolean;
}

// ─── Obligación ───────────────────────────────────────────────────────────────
export interface Obligacion {
  id: string;
  creado_en: string;
  usuario_id: string;
  servicio: string;
  pagina_pago: string | null;
  tipo_referencia: string;
  numero_referencia: string;
  periodicidad: string;
  estado: string;
  quincena_objetivo: string | null;
  descripcion: string;
  periodo: string;
  total_facturas: number;
  facturas_pagadas: number;
  monto_total: number;
  monto_pagado: number;
  completada_en: string | null;
  facturas?: Factura[];
  progreso?: number;
}

export interface CreateObligacionPayload {
  telefono: string;
  descripcion: string;
  periodo: string;
}

// ─── Factura Captura ──────────────────────────────────────────────────────────
export interface CapturaFacturaPayload {
  telefono: string;
  obligacion_id: string;
  servicio: string;
  monto: number;
  fecha_vencimiento: string;
  fecha_emision: string;
  periodo: string;
  origen: string;
  archivo_url: string;
  extraccion_estado: string;
  extraccion_confianza: number;
}

export interface CapturaFacturaData {
  factura_id: string;
  servicio: string;
  monto: number;
  estado: string;
  requiere_revision: boolean;
}

// ─── Recarga ──────────────────────────────────────────────────────────────────
export interface ReportarRecargaPayload {
  telefono: string;
  periodo: string;
  monto: number;
  comprobante_url: string;
  referencia_tx: string;
}

export interface RecargaData {
  recarga_id: string;
  estado: string;
}

export interface AprobarRecargaData {
  recarga_id: string;
  estado: string;
}

// ─── Disponible ───────────────────────────────────────────────────────────────
export interface DisponibleData {
  usuario_id: string;
  periodo: string;
  total_recargas_aprobadas: number;
  total_pagos_pagados: number;
  disponible: number;
}
