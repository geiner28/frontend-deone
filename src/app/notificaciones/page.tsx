'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BellIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  ChevronUpDownIcon,
  ChevronDownIcon,
  ArrowsUpDownIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

import Toast, { ToastType } from '@/components/ui/Toast';
import { FullPageSpinner } from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import ValidarFacturaModal from '@/components/modals/ValidarFacturaModal';
import AprobarRechazarRecargaModal from '@/components/modals/AprobarRechazarRecargaModal';
import {
  getAdminNotificaciones,
  getAdminNotificacionesEstadisticas,
  deleteNotificacion,
  updateNotificacion,
  marcarNotificacionEnviada,
  aprobarRecarga,
  actualizarRecarga,
  getDisponible,
} from '@/lib/api';
import type { NotificacionAPI, Factura, UpdateNotificacionPayload } from '@/types';
import { formatDate, formatCurrency, getErrorMsg } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────────────────
// Tipos & helpers visuales
// ──────────────────────────────────────────────────────────────────────────

type Vista = 'admin' | 'bot';
type Tab = 'todos' | 'facturas' | 'recargas';
type SortDir = 'recientes' | 'antiguas';

type NotificacionConUsuario = NotificacionAPI & {
  usuarios?: { nombre: string; apellido: string; telefono: string };
};

interface Estadisticas {
  total: number;
  no_enviadas: number;
  enviadas: number;
  leidas: number;
  por_tipo: Record<string, { total: number; pendiente: number; enviada: number; leida: number }>;
}

const ADMIN_TIPOS = new Set(['factura_por_validar', 'recarga_por_validar', 'alerta_admin']);
const BOT_TIPOS_PERMITIDOS = new Set([
  'solicitud_recarga',
  'solicitud_recarga_inicio_mes',
  'recordatorio_recarga',
  'obligacion_cumplida',
  'pago_confirmado',
  'obligaciones_pagadas_grupal',
]);

const TIPO_LABEL: Record<string, string> = {
  // ADMIN (internas)
  factura_por_validar: 'Factura agregada',
  recarga_por_validar: 'Recarga',
  alerta_admin: 'Alerta admin',
  // BOT (mensajes al usuario)
  solicitud_recarga: 'Recarga requerida',
  solicitud_recarga_inicio_mes: 'Recarga requerida',
  recordatorio_recarga: 'Recarga requerida',
  recarga_confirmada: 'Recarga validada',
  recarga_aprobada: 'Recarga validada',
  obligacion_cumplida: 'Pago de factura',
  pago_confirmado: 'Pago de factura',
  obligaciones_pagadas_grupal: 'Pagos agrupados',
};

const formatTipo = (tipo: string) =>
  TIPO_LABEL[tipo] || tipo.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const isTipoSolicitudRecarga = (tipo: string) =>
  tipo === 'solicitud_recarga' || tipo === 'solicitud_recarga_inicio_mes' || tipo === 'recordatorio_recarga';

const isTipoPagoObligacion = (tipo: string) =>
  tipo === 'obligacion_cumplida' || tipo === 'pago_confirmado' || tipo === 'obligaciones_pagadas_grupal';

// Categoría visual de la fila (para tabs Facturas/Recargas)
const tipoCategoria = (tipo: string): 'factura' | 'recarga' | 'otro' => {
  if (tipo === 'factura_por_validar' || tipo === 'obligacion_cumplida' || tipo === 'pago_confirmado' || tipo === 'obligaciones_pagadas_grupal') return 'factura';
  if (
    tipo === 'recarga_por_validar' ||
    tipo === 'solicitud_recarga' ||
    tipo === 'solicitud_recarga_inicio_mes' ||
    tipo === 'recordatorio_recarga' ||
    tipo === 'recarga_confirmada' ||
    tipo === 'recarga_aprobada'
  ) return 'recarga';
  return 'otro';
};

interface EstadoStyle {
  label: string;
  // tailwind: text + border + bg subtle
  cls: string;
}

function estadoVisual(estado: string, tipo: string): EstadoStyle {
  if (ADMIN_TIPOS.has(tipo)) {
    if (estado === 'pendiente' || estado === 'sin_revisar') {
      return { label: 'Sin revisar', cls: 'text-amber-600 border-amber-300 bg-amber-50' };
    }
    return { label: 'Revisada', cls: 'text-emerald-600 border-emerald-300 bg-emerald-50' };
  }
  switch (estado) {
    case 'sin_respuesta':
      return { label: 'Sin respuesta', cls: 'text-gray-500 border-gray-300 bg-gray-50' };
    case 'pendiente':
      return { label: 'Pendiente', cls: 'text-amber-600 border-amber-300 bg-amber-50' };
    case 'enviada':
      return { label: 'Enviada', cls: 'text-emerald-600 border-emerald-300 bg-emerald-50' };
    case 'entregada':
      return { label: 'Entregada', cls: 'text-sky-600 border-sky-300 bg-sky-50' };
    case 'rechazada':
      return { label: 'Rechazada', cls: 'text-rose-600 border-rose-300 bg-rose-50' };
    case 'leida':
      return { label: 'Leída', cls: 'text-emerald-600 border-emerald-300 bg-emerald-50' };
    default:
      return { label: estado, cls: 'text-gray-600 border-gray-300 bg-gray-50' };
  }
}

// Extraer numero_ref desde el payload (compatibilidad con varios formatos)
function getNumeroRef(n: NotificacionAPI): string {
  const p = (n.payload || {}) as Record<string, unknown>;
  const candidatos = [
    p['numero_ref'],
    p['numero_factura'],
    p['referencia_pago'],
    p['etiqueta'],
    p['recarga_id'],
    p['factura_id'],
  ];
  for (const c of candidatos) {
    if (c != null && String(c).trim() !== '') return String(c);
  }
  return '—';
}

function getMonto(n: NotificacionAPI): number | null {
  const p = (n.payload || {}) as Record<string, unknown>;
  const v = p['monto'] ?? p['monto_total'] ?? p['valor'];
  if (v == null) return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

function getNombreUsuario(n: NotificacionConUsuario): string {
  if (n.usuarios) {
    const full = `${n.usuarios.nombre || ''} ${n.usuarios.apellido || ''}`.trim();
    if (full) return full;
  }
  const p = (n.payload || {}) as Record<string, unknown>;
  const candidatos = [p['usuario_nombre'], p['nombre_usuario'], p['usuario_telefono'], p['usuario_id']];
  for (const c of candidatos) {
    if (c != null && String(c).trim() !== '') return String(c);
  }
  return '—';
}

// ──────────────────────────────────────────────────────────────────────────
// Página
// ──────────────────────────────────────────────────────────────────────────

export default function NotificacionesPage() {
  const [vista, setVista] = useState<Vista>('bot');
  const [tab, setTab] = useState<Tab>('todos');
  const [sortDir, setSortDir] = useState<SortDir>('recientes');
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [searchUsuario, setSearchUsuario] = useState('');

  const [notificaciones, setNotificaciones] = useState<NotificacionConUsuario[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Modales (solo activos en vista admin para validar/aprobar)
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [showValidarModal, setShowValidarModal] = useState(false);
  const [showRecargaModal, setShowRecargaModal] = useState(false);
  const [selectedRecargaId, setSelectedRecargaId] = useState<string | null>(null);
  const [showEditRecargaModal, setShowEditRecargaModal] = useState(false);
  const [editRecargaNotif, setEditRecargaNotif] = useState<NotificacionConUsuario | null>(null);
  const [showMensajeRecargaModal, setShowMensajeRecargaModal] = useState(false);
  const [mensajeRecarga, setMensajeRecarga] = useState('');
  const [loadingMensajeRecarga, setLoadingMensajeRecarga] = useState(false);
  const [showMensajeBotModal, setShowMensajeBotModal] = useState(false);
  const [mensajeBot, setMensajeBot] = useState('');
  const [loadingMensajeBot, setLoadingMensajeBot] = useState(false);
  const [editRecarga, setEditRecarga] = useState({
    monto: '',
    periodo: '',
    comprobante_url: '',
    referencia_tx: '',
    observaciones_admin: '',
  });

  const [notifToDelete, setNotifToDelete] = useState<NotificacionConUsuario | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [changingEstado, setChangingEstado] = useState<string | null>(null); // id de notif que se está actualizando
  const [openDropdown, setOpenDropdown] = useState<string | null>(null); // id de notif con dropdown abierto

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!openDropdown) return;
    const handler = () => setOpenDropdown(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openDropdown]);

  // ────────────────────────────────────────
  // Reset paginación al cambiar filtros
  // ────────────────────────────────────────
  useEffect(() => {
    setPage(1);
  }, [tab, sortDir, filterEstado, searchUsuario]);

  // ────────────────────────────────────────
  // Cargar datos
  // ────────────────────────────────────────
  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        canal_grupo: vista,
        estado: filterEstado || undefined,
        page,
        limit,
      };

      const [resList, resStats] = await Promise.all([
        getAdminNotificaciones(filters),
        getAdminNotificacionesEstadisticas({ canal_grupo: vista }),
      ]);

      if (!resList.ok || !resList.data) {
        throw new Error(getErrorMsg(resList) || 'Error al listar');
      }

      let items = (resList.data.notificaciones || []) as NotificacionConUsuario[];

      // Filtrar por tab (categoría)
      if (tab === 'facturas') items = items.filter(n => tipoCategoria(n.tipo) === 'factura');
      else if (tab === 'recargas') items = items.filter(n => tipoCategoria(n.tipo) === 'recarga');

      // Búsqueda por nombre/teléfono (cliente, ya que API no soporta search)
      const q = searchUsuario.trim().toLowerCase();
      if (q) {
        items = items.filter(n => {
          const nombre = getNombreUsuario(n).toLowerCase();
          const tel = (n.usuarios?.telefono || '').toLowerCase();
          return nombre.includes(q) || tel.includes(q);
        });
      }

      // Sort
      items.sort((a, b) => {
        const ta = new Date(a.creado_en).getTime();
        const tb = new Date(b.creado_en).getTime();
        return sortDir === 'recientes' ? tb - ta : ta - tb;
      });

      // En vista BOT-JAVIER solo mostramos los tipos permitidos de mensajería.
      if (vista === 'bot') {
        items = items.filter((n) => BOT_TIPOS_PERMITIDOS.has(n.tipo));
      }

      setNotificaciones(items);
      setTotal(resList.data.total || 0);
      setTotalPages(resList.data.total_pages || 1);
      setEstadisticas((resStats.ok && resStats.data ? resStats.data.estadisticas : null) as Estadisticas | null);
    } catch (err) {
      setToast({ message: getErrorMsg(err as any) || 'Error cargando notificaciones', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [vista, tab, sortDir, filterEstado, searchUsuario, page]);

  useEffect(() => { void cargar(); }, [cargar]);

  // ────────────────────────────────────────
  // Stats derivadas (Tipos: Facturas vs Recargas)
  // ────────────────────────────────────────
  const tiposCount = useMemo(() => {
    const por = estadisticas?.por_tipo || {};
    let facturas = 0;
    let recargas = 0;
    Object.entries(por).forEach(([tipo, info]) => {
      const cat = tipoCategoria(tipo);
      if (cat === 'factura') facturas += info.total;
      else if (cat === 'recarga') recargas += info.total;
    });
    return { facturas, recargas };
  }, [estadisticas]);

  // ────────────────────────────────────────
  // Acciones
  // ────────────────────────────────────────
  const onClickRow = (n: NotificacionConUsuario) => {
    if (vista !== 'admin') return; // En vista BOT no hay acciones
    const p = (n.payload || {}) as Record<string, unknown>;
    if (n.tipo === 'factura_por_validar' && p.factura_id) {
      // Construir un Factura mínimo para los modales
      const facturaStub: Factura = {
        id: String(p.factura_id),
        usuario_id: String(p.usuario_id || n.usuario_id),
        servicio: String(p.servicio || ''),
        etiqueta: String(p.etiqueta || ''),
        periodo: String(p.periodo || ''),
        monto: Number(p.monto || 0),
        validacion_estado: String(p.validacion_estado || 'sin_validar'),
        estado: 'pendiente',
        creado_en: String(p.creada_en || n.creado_en),
      } as unknown as Factura;
      setSelectedFactura(facturaStub);
      setShowValidarModal(true);
    } else if (n.tipo === 'recarga_por_validar' && p.recarga_id) {
      setSelectedRecargaId(String(p.recarga_id));
      setShowRecargaModal(true);
    }
  };

  // Cambiar estado de notificación bot
  const handleChangeEstadoBot = async (n: NotificacionConUsuario, newEstado: string) => {
    setOpenDropdown(null);
    if (newEstado === n.estado) return;
    setChangingEstado(n.id);
    try {
      const res = await updateNotificacion(n.id, { estado: newEstado as UpdateNotificacionPayload['estado'] });
      if (!res.ok) throw new Error(getErrorMsg(res) || 'Error al cambiar estado');
      setToast({ message: `Estado cambiado a «${estadoVisual(newEstado, n.tipo).label}»`, type: 'success' });
      await cargar();
    } catch (err) {
      setToast({ message: getErrorMsg(err as any) || 'Error al cambiar estado', type: 'error' });
    } finally {
      setChangingEstado(null);
    }
  };

  // Cambiar estado de notificación admin (sin_revisar ↔ revisada)
  const handleChangeEstadoAdmin = async (n: NotificacionConUsuario, newEstado: string) => {
    setOpenDropdown(null);
    if (newEstado === n.estado) return;
    setChangingEstado(n.id);
    try {
      if (n.tipo === 'recarga_por_validar' && newEstado === 'revisada') {
        const p = (n.payload || {}) as Record<string, unknown>;
        const recargaId = p.recarga_id ? String(p.recarga_id) : '';
        if (!recargaId) throw new Error('La notificación no contiene recarga_id');
        const aprobarRes = await aprobarRecarga(recargaId, {
          observaciones_admin: 'Aprobada desde Notificaciones al marcar revisada',
        });
        if (!aprobarRes.ok) throw new Error(getErrorMsg(aprobarRes) || 'Error aprobando recarga');
        setToast({ message: 'Recarga aprobada y saldo actualizado', type: 'success' });
        await cargar();
        return;
      }

      const res = await updateNotificacion(n.id, { estado: newEstado as UpdateNotificacionPayload['estado'] });
      if (!res.ok) throw new Error(getErrorMsg(res) || 'Error');
      setToast({ message: `Notificación marcada como «${estadoVisual(newEstado, n.tipo).label}»`, type: 'success' });
      await cargar();
    } catch (err) {
      setToast({ message: getErrorMsg(err as any) || 'Error', type: 'error' });
    } finally {
      setChangingEstado(null);
    }
  };

  // Marcar notif admin como revisada directamente (sin abrir modal)
  const handleMarcarRevisada = async (n: NotificacionConUsuario) => {
    setChangingEstado(n.id);
    try {
      const res = await marcarNotificacionEnviada(n.id);
      if (!res.ok) throw new Error(getErrorMsg(res) || 'Error');
      setToast({ message: 'Marcada como revisada', type: 'success' });
      await cargar();
    } catch (err) {
      setToast({ message: getErrorMsg(err as any) || 'Error', type: 'error' });
    } finally {
      setChangingEstado(null);
    }
  };

  const handleDelete = async () => {
    if (!notifToDelete) return;
    try {
      await deleteNotificacion(notifToDelete.id);
      setToast({ message: 'Notificación eliminada', type: 'success' });
      setShowDeleteModal(false);
      setNotifToDelete(null);
      await cargar();
    } catch (err) {
      setToast({ message: getErrorMsg(err as any) || 'Error eliminando', type: 'error' });
    }
  };

  const handleOpenEditRecarga = (n: NotificacionConUsuario) => {
    const p = (n.payload || {}) as Record<string, unknown>;
    setEditRecargaNotif(n);
    setEditRecarga({
      monto: p.monto != null ? String(p.monto) : '',
      periodo: p.periodo != null ? String(p.periodo) : '',
      comprobante_url: p.comprobante_url != null ? String(p.comprobante_url) : '',
      referencia_tx: p.referencia_tx != null ? String(p.referencia_tx) : '',
      observaciones_admin: '',
    });
    setShowEditRecargaModal(true);
  };

  const handleSaveEditRecarga = async () => {
    if (!editRecargaNotif) return;
    const p = (editRecargaNotif.payload || {}) as Record<string, unknown>;
    const recargaId = p.recarga_id ? String(p.recarga_id) : '';
    if (!recargaId) {
      setToast({ message: 'No se encontró recarga_id en la notificación', type: 'error' });
      return;
    }

    const payload = {
      monto: editRecarga.monto ? Number(editRecarga.monto) : undefined,
      periodo: editRecarga.periodo || undefined,
      comprobante_url: editRecarga.comprobante_url || null,
      referencia_tx: editRecarga.referencia_tx || null,
      observaciones_admin: editRecarga.observaciones_admin || null,
    };

    setChangingEstado(editRecargaNotif.id);
    try {
      const res = await actualizarRecarga(recargaId, payload);
      if (!res.ok) throw new Error(getErrorMsg(res) || 'No se pudo editar la recarga');
      setToast({ message: 'Recarga actualizada', type: 'success' });
      setShowEditRecargaModal(false);
      setEditRecargaNotif(null);
      await cargar();
    } catch (err) {
      setToast({ message: getErrorMsg(err as any) || 'Error actualizando recarga', type: 'error' });
    } finally {
      setChangingEstado(null);
    }
  };

  const handleOpenMensajeRecarga = async (n: NotificacionConUsuario) => {
    const p = (n.payload || {}) as Record<string, unknown>;
    const telefono = String(n.usuarios?.telefono || p.usuario_telefono || '').trim();
    const periodo = String(p.periodo || '').trim();
    const nombreUsuario = getNombreUsuario(n) !== '—' ? getNombreUsuario(n) : 'cliente';

    setShowMensajeRecargaModal(true);
    setLoadingMensajeRecarga(true);
    try {
      let saldoTexto = '(saldo_usuario)';
      if (telefono && periodo) {
        const disp = await getDisponible(telefono, periodo);
        if (disp.ok && disp.data && typeof disp.data.disponible === 'number') {
          saldoTexto = formatCurrency(disp.data.disponible);
        }
      }

      const mensaje = `Recibido, ¡${nombreUsuario}! 🙌🏼\nYa registré tu recarga. Tu saldo disponible en deOne es de ${saldoTexto}\n\nTe aviso cuando pague tus obligaciones.`;
      setMensajeRecarga(mensaje);
    } catch {
      const mensaje = `Recibido, ¡${nombreUsuario}! 🙌🏼\nYa registré tu recarga. Tu saldo disponible en deOne es de (saldo_usuario)\n\nTe aviso cuando pague tus obligaciones.`;
      setMensajeRecarga(mensaje);
    } finally {
      setLoadingMensajeRecarga(false);
    }
  };

  const handleCopiarMensajeRecarga = async () => {
    try {
      await navigator.clipboard.writeText(mensajeRecarga);
      setToast({ message: 'Mensaje copiado al portapapeles', type: 'success' });
    } catch {
      setToast({ message: 'No se pudo copiar el mensaje', type: 'error' });
    }
  };

  const getObligacionesCercanas = (n: NotificacionConUsuario) => {
    const p = (n.payload || {}) as Record<string, unknown>;
    const usuarioIdBase = String(p.usuario_id || n.usuario_id || '');
    const baseTs = new Date(n.creado_en).getTime();

    const cercanas = notificaciones.filter((x) => {
      if (!isTipoPagoObligacion(x.tipo)) return false;
      const xp = (x.payload || {}) as Record<string, unknown>;
      const xid = String(xp.usuario_id || x.usuario_id || '');
      if (!usuarioIdBase || !xid || xid !== usuarioIdBase) return false;
      const diffMs = Math.abs(new Date(x.creado_en).getTime() - baseTs);
      return diffMs <= 30 * 60 * 1000; // ventana de 30 minutos
    });

    const dedup = new Map();
    for (const item of cercanas) {
      const ip = (item.payload || {}) as Record<string, unknown>;
      const etiqueta = String(ip.etiqueta || ip.servicio || 'obligación').trim();
      const valor = Number(ip.valor || ip.monto || ip.monto_aplicado || 0);
      const key = `${etiqueta}|${valor}`;
      if (!dedup.has(key)) {
        dedup.set(key, { etiqueta, valor });
      }
    }
    return Array.from(dedup.values());
  };

  const handleOpenMensajeBot = async (n: NotificacionConUsuario) => {
    setShowMensajeBotModal(true);
    setLoadingMensajeBot(true);

    const p = (n.payload || {}) as Record<string, unknown>;
    const telefono = String(n.usuarios?.telefono || p.usuario_telefono || '').trim();
    const periodo = String(p.periodo || '').trim();
    const usuario = getNombreUsuario(n) !== '—' ? getNombreUsuario(n) : 'Usuario';

    try {
      let saldoTexto = '(saldo_usuario)';
      if (telefono && periodo) {
        const disp = await getDisponible(telefono, periodo);
        if (disp.ok && disp.data && typeof disp.data.disponible === 'number') {
          saldoTexto = formatCurrency(disp.data.disponible);
        }
      }

      if (isTipoSolicitudRecarga(n.tipo)) {
        const valorRecarga = Number(p.valor_recarga ?? p.monto_solicitado ?? p.monto ?? 0);
        const valorTexto = valorRecarga > 0 ? formatCurrency(valorRecarga) : '(valor_recarga)';
        setMensajeBot(`${usuario} 👋🏼\n\nEs momento de recargar tu cuenta para cubrir tus próximas obligaciones 🙌🏼\n\nTu saldo actual en deOne es de ${saldoTexto}\n\nValor a recargar: ${valorTexto}\n\nPuedes hacer la recarga a la llave 0090944088.\n\nCuando la hagas, envíame el comprobante y yo me encargo del resto deOne 👍🏼`);
      } else if (n.tipo === 'obligaciones_pagadas_grupal') {
        // Payload ya viene con array obligaciones del backend
        const oblsPayload = (p.obligaciones as Array<{ etiqueta: string; valor: number }> | undefined) || [];
        if (oblsPayload.length >= 2) {
          const lines = oblsPayload.map((o) => `${o.etiqueta} por ${formatCurrency(o.valor)}.`).join('\n');
          setMensajeBot(`¡${usuario}! 🙌🏼\n\nYa hice el pago de:\n${lines}\n\nTu saldo actualizado en deOne es de ${saldoTexto}\n\nLos comprobantes ya quedaron cargados en tu enlace habitual!`);
        } else if (oblsPayload.length === 1) {
          const o = oblsPayload[0];
          setMensajeBot(`¡${usuario}! 🙌🏼\nYa hice el pago de ${o.etiqueta} por ${formatCurrency(o.valor)}.\n\nTu saldo actualizado en deOne es de ${saldoTexto}\n\nEl comprobante ya quedó cargado en tu enlace habitual.`);
        } else {
          setMensajeBot(`¡${usuario}! 🙌🏼\nYa hice el pago de tus obligaciones.\n\nTu saldo actualizado en deOne es de ${saldoTexto}\n\nLos comprobantes ya quedaron cargados en tu enlace habitual!`);
        }
      } else if (isTipoPagoObligacion(n.tipo)) {
        const oblsCercanas = getObligacionesCercanas(n);
        if (oblsCercanas.length >= 2) {
          const lines = oblsCercanas.slice(0, 3).map((o) => `${o.etiqueta} por ${formatCurrency(o.valor)}.`).join('\n');
          setMensajeBot(`¡${usuario}! 🙌🏼\n\nYa hice el pago de:\n${lines}\n\nTu saldo actualizado en deOne es de ${saldoTexto}\n\nLos comprobantes ya quedaron cargados en tu enlace habitual!`);
        } else {
          const etiqueta = String(p.etiqueta || p.servicio || 'obligación');
          const valor = Number(p.valor || p.monto || p.monto_aplicado || 0);
          const valorTexto = valor > 0 ? formatCurrency(valor) : '(valor_obligacion)';
          setMensajeBot(`¡${usuario}! 🙌🏼\nYa hice el pago de ${etiqueta} por ${valorTexto}.\n\nTu saldo actualizado en deOne es de ${saldoTexto}\n\nEl comprobante ya quedó cargado en tu enlace habitual.`);
        }
      } else {
        setMensajeBot('Este tipo no tiene plantilla configurada.');
      }
    } catch {
      setMensajeBot('No se pudo generar el mensaje automáticamente.');
    } finally {
      setLoadingMensajeBot(false);
    }
  };

  const handleCopiarMensajeBot = async () => {
    try {
      await navigator.clipboard.writeText(mensajeBot);
      setToast({ message: 'Mensaje copiado al portapapeles', type: 'success' });
    } catch {
      setToast({ message: 'No se pudo copiar el mensaje', type: 'error' });
    }
  };

  // ────────────────────────────────────────
  // Render
  // ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">
        {/* HEADER */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {vista === 'admin'
                ? 'Notificaciones internas del panel admin (sin mensaje al usuario).'
                : 'Mensajes que el bot envía a los clientes por WhatsApp.'}
            </p>
          </div>
          <ToggleVista value={vista} onChange={(v) => { setVista(v); setFilterEstado(''); setTab('todos'); setPage(1); }} />
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total" value={estadisticas?.total ?? 0} />
          <StatCard
            label="No leídas"
            value={(estadisticas?.no_enviadas ?? 0) + (estadisticas?.enviadas ?? 0)}
            hint="pendientes + enviadas"
          />
          <StatCard label="Leídas" value={estadisticas?.leidas ?? 0} />
          <TiposCard facturas={tiposCount.facturas} recargas={tiposCount.recargas} />
        </div>

        {/* TABS */}
        <div className="bg-gray-50 rounded-lg p-1 inline-flex gap-1">
          <TabButton active={tab === 'todos'} onClick={() => setTab('todos')} label="Todos" count={total} />
          <TabButton active={tab === 'facturas'} onClick={() => setTab('facturas')} label="Facturas" />
          <TabButton active={tab === 'recargas'} onClick={() => setTab('recargas')} label="Recargas" />
        </div>

        {/* FILTER ROW */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setSortDir(sortDir === 'recientes' ? 'antiguas' : 'recientes')}
            className="px-4 py-2 rounded-lg border border-orange-500 text-orange-600 bg-white text-sm font-medium hover:bg-orange-50 inline-flex items-center gap-2"
            title="Ordenar"
          >
            {sortDir === 'recientes' ? 'Más recientes' : 'Más antiguas'}
            <ArrowsUpDownIcon className="h-4 w-4" />
          </button>

          <div className="relative">
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="appearance-none pl-9 pr-9 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Estado: Todos</option>
              {vista === 'admin' ? (
                <>
                  <option value="sin_revisar">Sin revisar</option>
                  <option value="revisada">Revisada</option>
                </>
              ) : (
                <>
                  <option value="sin_respuesta">Sin respuesta</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="enviada">Enviada</option>
                  <option value="entregada">Entregada</option>
                  <option value="rechazada">Rechazada</option>
                </>
              )}
            </select>
            <ShieldCheckIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronUpDownIcon className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative ml-auto w-full md:w-[320px]">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchUsuario}
              onChange={(e) => setSearchUsuario(e.target.value)}
              placeholder="Buscar por nombre, celular…"
              className="w-full pl-9 pr-3 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#1D212B] text-white">
                <tr>
                  <Th label="Tipo" />
                  <Th label="Usuario" />
                  <Th label="Número de ref" />
                  <Th label="Fecha" />
                  <Th label="Monto" align="right" />
                  <Th label="Estado" />
                  <Th label="" align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16">
                      <FullPageSpinner />
                    </td>
                  </tr>
                ) : notificaciones.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16">
                      <EmptyState
                        icon={<BellIcon className="h-12 w-12" />}
                        title="Sin notificaciones"
                        description={
                          vista === 'admin'
                            ? 'No hay validaciones internas pendientes en este filtro.'
                            : 'El bot no ha enviado mensajes que coincidan con este filtro.'
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  notificaciones.map((n) => {
                    const est = estadoVisual(n.estado, n.tipo);
                    const monto = getMonto(n);
                    const ref = getNumeroRef(n);
                    return (
                      <tr
                        key={n.id}
                        className={`hover:bg-gray-50 transition-colors ${vista === 'admin' ? 'cursor-pointer' : ''}`}
                        onClick={() => onClickRow(n)}
                      >
                        <td className="px-4 py-4 text-gray-800">{formatTipo(n.tipo)}</td>
                        <td className="px-4 py-4 text-gray-800">{getNombreUsuario(n)}</td>
                        <td className="px-4 py-4 text-gray-600">{ref}</td>
                        <td className="px-4 py-4 text-gray-600">{formatDate(n.creado_en)}</td>
                        <td className="px-4 py-4 text-gray-800 text-right">
                          {monto != null ? formatCurrency(monto) : '—'}
                        </td>
                        {/* ── ESTADO ── */}
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block">
                            <button
                              disabled={changingEstado === n.id}
                              onClick={() => setOpenDropdown(openDropdown === n.id ? null : n.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-opacity ${est.cls} ${changingEstado === n.id ? 'opacity-50 cursor-wait' : 'hover:opacity-80 cursor-pointer'}`}
                            >
                              {changingEstado === n.id ? '...' : est.label}
                              <ChevronDownIcon className="h-3 w-3 opacity-70" />
                            </button>
                            {openDropdown === n.id && (
                              <div className="absolute left-0 top-full mt-1 z-50 min-w-[140px] bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                                {(vista === 'admin' ? (
                                  [
                                    ['sin_revisar', 'Sin revisar'],
                                    ['revisada',    'Revisado'],
                                  ]
                                ) : (
                                  [
                                    ['sin_respuesta', 'Sin respuesta'],
                                    ['pendiente',     'Pendiente'],
                                    ['enviada',       'Enviada'],
                                    ['entregada',     'Entregada'],
                                    ['rechazada',     'Rechazada'],
                                  ]
                                ) as [string, string][]).map(([val, lbl]) => (
                                  <button
                                    key={val}
                                    onClick={() => vista === 'admin' ? handleChangeEstadoAdmin(n, val) : handleChangeEstadoBot(n, val)}
                                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${
                                      n.estado === val ? 'font-semibold text-orange-600' : 'text-gray-700'
                                    }`}
                                  >
                                    {lbl}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        {/* ── ACCIONES ── */}
                        <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1">
                            {vista === 'admin' && (
                              <button
                                onClick={() => {
                                  if (n.tipo === 'recarga_por_validar') {
                                    handleOpenEditRecarga(n);
                                  } else {
                                    onClickRow(n);
                                  }
                                }}
                                disabled={changingEstado === n.id}
                                className="p-2 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors disabled:opacity-40"
                                title={n.tipo === 'recarga_por_validar' ? 'Editar recarga' : 'Abrir y revisar'}
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>
                            )}
                            {vista === 'bot' && (
                              <button
                                onClick={() => { void handleOpenMensajeBot(n); }}
                                className="p-2 text-sky-500 hover:text-sky-700 hover:bg-sky-50 rounded-md transition-colors"
                                title="Mensaje para copiar"
                              >
                                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                              </button>
                            )}
                            {vista === 'admin' && n.tipo === 'recarga_por_validar' && n.estado === 'revisada' && (
                              <button
                                onClick={() => { void handleOpenMensajeRecarga(n); }}
                                className="p-2 text-sky-500 hover:text-sky-700 hover:bg-sky-50 rounded-md transition-colors"
                                title="Mensaje para usuario"
                              >
                                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => { setNotifToDelete(n); setShowDeleteModal(true); }}
                              className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                              title="Eliminar"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-white">
            <p className="text-xs text-gray-500">
              Mostrando {notificaciones.length === 0 ? 0 : (page - 1) * limit + 1}-
              {(page - 1) * limit + notificaciones.length} de {total.toLocaleString('es-CO')} registros
            </p>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      </div>

      {/* Modales admin */}
      {selectedFactura && (
        <ValidarFacturaModal
          open={showValidarModal}
          onClose={() => { setShowValidarModal(false); setSelectedFactura(null); }}
          factura={selectedFactura}
          showToast={(msg, type) => setToast({ message: msg, type })}
          onSuccess={async () => {
            setShowValidarModal(false);
            setSelectedFactura(null);
            await cargar();
          }}
        />
      )}
      {selectedRecargaId && (
        <AprobarRechazarRecargaModal
          open={showRecargaModal}
          onClose={() => { setShowRecargaModal(false); setSelectedRecargaId(null); }}
          recargaId={selectedRecargaId}
          showToast={(msg, type) => setToast({ message: msg, type })}
          onSuccess={async () => {
            setShowRecargaModal(false);
            setSelectedRecargaId(null);
            await cargar();
          }}
        />
      )}

      <Modal
        open={showEditRecargaModal && !!editRecargaNotif}
        onClose={() => { setShowEditRecargaModal(false); setEditRecargaNotif(null); }}
        title="Editar recarga"
        maxWidth="md"
      >
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monto</label>
              <input
                type="number"
                min="1"
                value={editRecarga.monto}
                onChange={(e) => setEditRecarga((prev) => ({ ...prev, monto: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Periodo</label>
              <input
                type="date"
                value={editRecarga.periodo ? String(editRecarga.periodo).slice(0, 10) : ''}
                onChange={(e) => setEditRecarga((prev) => ({ ...prev, periodo: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Referencia TX</label>
              <input
                type="text"
                value={editRecarga.referencia_tx}
                onChange={(e) => setEditRecarga((prev) => ({ ...prev, referencia_tx: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Comprobante URL</label>
              <input
                type="text"
                value={editRecarga.comprobante_url}
                onChange={(e) => setEditRecarga((prev) => ({ ...prev, comprobante_url: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Observación admin</label>
            <textarea
              value={editRecarga.observaciones_admin}
              onChange={(e) => setEditRecarga((prev) => ({ ...prev, observaciones_admin: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => { setShowEditRecargaModal(false); setEditRecargaNotif(null); }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveEditRecarga}>
              Guardar cambios
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showMensajeRecargaModal}
        onClose={() => setShowMensajeRecargaModal(false)}
        title="Mensaje para enviar"
        maxWidth="md"
      >
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Copia y pega este mensaje para enviarlo al usuario que reportó la recarga.
          </p>
          {loadingMensajeRecarga ? (
            <div className="text-sm text-gray-500">Generando mensaje...</div>
          ) : (
            <textarea
              value={mensajeRecarga}
              readOnly
              rows={6}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800"
            />
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowMensajeRecargaModal(false)}>
              Cerrar
            </Button>
            <Button size="sm" onClick={handleCopiarMensajeRecarga}>
              Copiar mensaje
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showMensajeBotModal}
        onClose={() => setShowMensajeBotModal(false)}
        title="💬 Mensaje BOT-JAVIER"
        maxWidth="md"
      >
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Mensaje listo para copiar y pegar.
          </p>
          {loadingMensajeBot ? (
            <div className="text-sm text-gray-500">Generando mensaje...</div>
          ) : (
            <textarea
              value={mensajeBot}
              readOnly
              rows={10}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800"
            />
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowMensajeBotModal(false)}>
              Cerrar
            </Button>
            <Button size="sm" onClick={handleCopiarMensajeBot}>
              Copiar mensaje
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal
        open={showDeleteModal && !!notifToDelete}
        onClose={() => { setShowDeleteModal(false); setNotifToDelete(null); }}
        title="Eliminar notificación"
        maxWidth="sm"
      >
        {notifToDelete && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-700">
              ¿Eliminar la notificación <strong>{formatTipo(notifToDelete.tipo)}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="secondary" onClick={() => { setShowDeleteModal(false); setNotifToDelete(null); }}>
                Cancelar
              </Button>
              <Button size="sm" variant="danger" onClick={handleDelete}>
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Subcomponentes
// ──────────────────────────────────────────────────────────────────────────

function ToggleVista({ value, onChange }: { value: Vista; onChange: (v: Vista) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onChange('admin')}
        className={`px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2 transition-colors ${
          value === 'admin' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <ShieldCheckIcon className="h-4 w-4" />
        ADMIN
      </button>
      <button
        type="button"
        onClick={() => onChange('bot')}
        className={`px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2 transition-colors ${
          value === 'bot' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <ChatBubbleLeftRightIcon className="h-4 w-4" />
        BOT - JAVIER
      </button>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-700 font-medium">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value.toLocaleString('es-CO').padStart(3, '0')}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function TiposCard({ facturas, recargas }: { facturas: number; recargas: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-700 font-medium mb-3">Tipos</p>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-sm text-gray-600">Facturas</span>
          <span className="text-sm font-semibold text-gray-900">{facturas}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          <span className="text-sm text-gray-600">Recargas</span>
          <span className="text-sm font-semibold text-gray-900">{recargas}</span>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2 transition-colors ${
        active ? 'bg-white text-orange-600 border border-orange-200 shadow-sm' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
      {typeof count === 'number' && (
        <span className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-semibold ${
          active ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

function Th({ label, align = 'left' }: { label: string; align?: 'left' | 'right' }) {
  return (
    <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-${align}`}>
      <span className="inline-flex items-center gap-1">
        {label}
        {label && <ChevronUpDownIcon className="h-3 w-3 opacity-60" />}
      </span>
    </th>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages: (number | '…')[] = [];
  const push = (n: number | '…') => pages.push(n);
  const window = 1;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= window) push(i);
    else if (pages[pages.length - 1] !== '…') push('…');
  }
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-2 py-1 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 inline-flex items-center gap-1"
      >
        <ChevronLeftIcon className="h-4 w-4" /> Anterior
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="px-2 text-gray-400 text-sm">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`min-w-[28px] h-7 px-2 rounded text-sm font-medium transition-colors ${
              p === page ? 'bg-white border border-orange-500 text-orange-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-2 py-1 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 inline-flex items-center gap-1"
      >
        Siguiente <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
