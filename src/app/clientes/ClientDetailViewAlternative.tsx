'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeftIcon,
  PencilIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  MapPinIcon,
  PlusIcon,
  DocumentTextIcon,
  TrashIcon,
  PencilSquareIcon,
  ReceiptPercentIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import UpdatePlanModal from '@/components/modals/UpdatePlanModal';
import EditarFechasRecargasModal from '@/components/modals/EditarFechasRecargasModal';
import UpsertUsuarioAdminModal from '@/components/modals/UpsertUsuarioAdminModal';
import UpsertObligacionConFacturasModal from '@/components/modals/UpsertObligacionConFacturasModal';
import ReportarRecargaModal from '@/components/modals/ReportarRecargaModal';
import AproximarValorModal from '@/components/modals/AproximarValorModal';
import EditarFacturaModal from '@/components/modals/EditarFacturaModal';
import type { AdminClientePerfilData, ActualizarFacturaPayload, Factura } from '@/types';
import { formatCurrency, formatDate, getErrorMsg, isDateBeforeToday } from '@/lib/utils';
import { getAdminClientePerfil, actualizarFactura, deleteUsuario, deleteObligacion, deleteFactura, crearSiguienteMes, crearPago, confirmarPago } from '@/lib/api';
import Toast from '@/components/ui/Toast';

// ─── Types ──────────────────────────────────────────────────────────────────
type FacturaFilterTab = 'todas' | 'pagadas' | 'pendientes' | 'sin-validar';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getPlanColor = (plan: string): string => {
  switch (plan) {
    case 'tranquilidad': return '#f59e0b';
    case 'respaldo': return '#10b981';
    default: return '#6b7280';
  }
};

type InlineFacturaField =
  | 'etiqueta'
  | 'referencia_pago'
  | 'tipo_referencia'
  | 'pagina_pago'
  | 'archivo_url'
  | 'fecha_emision'
  | 'fecha_vencimiento'
  | 'monto';

const getFacturaCountByTab = (facturas: Factura[], tab: FacturaFilterTab): number => {
  if (tab === 'todas') return facturas.length;
  if (tab === 'pagadas') return facturas.filter(f => f.estado === 'pagada').length;
  // Pendientes = todas las facturas no pagadas (incluye aproximadas y sin_factura)
  if (tab === 'pendientes') return facturas.filter(f => f.estado !== 'pagada').length;
  // Sin validar = validacion_estado='sin_validar'
  if (tab === 'sin-validar') return facturas.filter(f => f.validacion_estado === 'sin_validar').length;
  return 0;
};

type CuotasCalculadasLike = {
  cuota1?: { facturas?: Array<{ id: string }> };
  cuota2?: { facturas?: Array<{ id: string }> };
} | null | undefined;

const filterFacturasByTab = (facturas: Factura[], tab: FacturaFilterTab): Factura[] => {
  if (tab === 'todas') return facturas;
  if (tab === 'pagadas') return facturas.filter(f => f.estado === 'pagada');
  if (tab === 'pendientes') return facturas.filter(f => f.estado !== 'pagada');
  if (tab === 'sin-validar') return facturas.filter(f => f.validacion_estado === 'sin_validar');
  return facturas;
};

/**
 * Calcula el grupo de una factura
 * - Si cantidad_recargas = 1: TODAS las facturas van a grupo 1
 * - Si cantidad_recargas = 2: usa cuotasCalculadas O factura.grupo del backend
 */
const calcularGrupoFactura = (
  factura: Factura,
  cuotasCalculadas: CuotasCalculadasLike,
  cantidadRecargas: number | undefined | null
): number | null => {
  // Normalizar cantidad
  const cantidad = Number(cantidadRecargas);
  
  // Si cantidad_recargas es 1: TODAS van a grupo 1
  if (cantidad === 1) {
    return factura.validacion_estado === 'validada' ? 1 : null;
  }

  // Si cantidad_recargas es 2:
  if (cantidad === 2) {
    // Primero intentar usar cuotasCalculadas
    if (cuotasCalculadas) {
      const idsGrupo1 = new Set((cuotasCalculadas.cuota1?.facturas || []).map((f) => f.id));
      const idsGrupo2 = new Set((cuotasCalculadas.cuota2?.facturas || []).map((f) => f.id));
      
      if (idsGrupo1.has(factura.id)) return 1;
      if (idsGrupo2.has(factura.id)) return 2;
    }
    
    // Fallback: usar factura.grupo que viene del backend
    if (factura.grupo) {
      return factura.grupo;
    }
  }

  return null;
};

// Generar meses disponibles a partir de cualquier periodo presente en obligaciones/facturas.
const normalizePeriodoMonth = (periodo?: string | null): string | null => {
  if (!periodo) return null;
  const match = periodo.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-01`;
};

const generateMonthOptionsFromFacturas = (perfil?: AdminClientePerfilData | null) => {
  const periodos = new Set<string>();

  for (const obligacion of perfil?.obligaciones || []) {
    const periodoObligacion = normalizePeriodoMonth(obligacion.periodo);
    if (periodoObligacion) periodos.add(periodoObligacion);

    for (const factura of obligacion.facturas || []) {
      const normalized = normalizePeriodoMonth(factura.periodo || obligacion.periodo);
      if (normalized) periodos.add(normalized);
    }
  }

  return Array.from(periodos)
    .sort((a, b) => b.localeCompare(a))
    .map((value) => {
      const d = new Date(`${value}T00:00:00`);
      const monthName = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      return {
        value,
        label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      };
    });
};

const periodoToOption = (periodo?: string | null) => {
  const normalized = normalizePeriodoMonth(periodo);
  if (!normalized) return null;
  const d = new Date(`${normalized}T00:00:00`);
  const monthName = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return {
    value: normalized,
    label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT DETAIL VIEW ALTERNATIVE
// ═══════════════════════════════════════════════════════════════════════════════
export default function ClientDetailViewAlternative({
  perfil: initialPerfil,
  onBack,
}: {
  perfil: AdminClientePerfilData;
  onBack: () => void;
}) {
  const [perfil, setPerfil] = useState<AdminClientePerfilData | null>(initialPerfil);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (initialPerfil?.periodo) return initialPerfil.periodo;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [activeTab, setActiveTab] = useState<FacturaFilterTab>('todas');
  const [openPlanModal, setOpenPlanModal] = useState(false);
  const [openFechasRecargasModal, setOpenFechasRecargasModal] = useState(false);
  const [openEditUserModal, setOpenEditUserModal] = useState(false);
  const [openObligacionModal, setOpenObligacionModal] = useState(false);
  const [openReportarRecargaModal, setOpenReportarRecargaModal] = useState(false);

  // ─── DELETE STATES ────────────────────────────────────────────────────────────
  const [openDeleteUserModal, setOpenDeleteUserModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [openDeleteObligacionModal, setOpenDeleteObligacionModal] = useState(false);
  const [deleteObligacionForce, setDeleteObligacionForce] = useState<Record<string, boolean>>({});
  const [deletingObligacionId, setDeletingObligacionId] = useState<string | null>(null);
  const [facturaToDelete, setFacturaToDelete] = useState<Factura | null>(null);
  const [deletingFactura, setDeletingFactura] = useState(false);

  // ─── FACTURA ACTION STATES ────────────────────────────────────────────────────
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [updatingFacturaId, setUpdatingFacturaId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: InlineFacturaField; value: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Modal visibility states for factura actions
  const [openAproximarModal, setOpenAproximarModal] = useState(false);
  const [openEditarFacturaModal, setOpenEditarFacturaModal] = useState(false);
  const [payingFacturaId, setPayingFacturaId] = useState<string | null>(null);

  // Crear siguiente mes
  const [creandoSiguienteMes, setCreandoSiguienteMes] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const monthOptions = useMemo(() => {
    const generated = generateMonthOptionsFromFacturas(perfil);
    if (generated.length > 0) return generated;

    // Fallback: mostrar al menos el periodo consultado/actual para evitar "Sin registros"
    const fallback =
      periodoToOption(perfil?.periodo) ||
      periodoToOption(selectedMonth) ||
      periodoToOption(new Date().toISOString().slice(0, 10));

    return fallback ? [fallback] : [];
  }, [perfil, selectedMonth]);

  // ─── HANDLER: Refrescar datos de facturas ─────────────────────────────────────
  const refreshFacturas = useCallback(async () => {
    try {
      const res = await getAdminClientePerfil(perfil?.usuario.telefono || '', selectedMonth);
      if (res.ok && res.data) {
        setPerfil(prev => {
          if (!prev) return res.data;
          return {
            ...res.data,
            programacion_recargas: prev.programacion_recargas,
          } as AdminClientePerfilData;
        });
      }
    } catch (err) {
      console.error('Error refrescando facturas:', err);
      showToast('Error al refrescar facturas', 'error');
    }
  }, [perfil?.usuario.telefono, selectedMonth]);

  // ─── HANDLER: Aproximar Valor ──────────────────────────────────────────────
  const handleAproximarSuccess = useCallback(async () => {
    await refreshFacturas();
  }, [refreshFacturas]);

  // ─── HANDLER: Pagar factura directo (sin pedir datos extra) ───────────────
  const pagarFacturaDirecto = useCallback(async (factura: Factura) => {
    if (!factura?.id || !perfil?.usuario?.telefono) return;

    setPayingFacturaId(factura.id);

    const crearRes = await crearPago({
      telefono: perfil.usuario.telefono,
      factura_id: factura.id,
    });

    if (!crearRes.ok || !crearRes.data) {
      setPayingFacturaId(null);
      showToast(getErrorMsg(crearRes, 'No se pudo crear el pago'), 'error');
      return;
    }

    const confRes = await confirmarPago(crearRes.data.pago_id, {});
    setPayingFacturaId(null);

    if (!confRes.ok) {
      showToast(getErrorMsg(confRes, 'No se pudo confirmar el pago'), 'error');
      return;
    }

    showToast('Pago confirmado', 'success');
    await refreshFacturas();
  }, [perfil?.usuario?.telefono, refreshFacturas]);

  // ─── HANDLER: Cambiar estado inline ────────────────────────────────────────
  const handleEstadoChange = useCallback(async (factura: Factura, newEstado: 'pagada' | 'pendiente' | 'sin_factura' | 'aproximada') => {
    if (!factura?.id) return;

    if (newEstado === 'aproximada') {
      setSelectedFactura(factura);
      setOpenAproximarModal(true);
      return;
    }

    setUpdatingFacturaId(factura.id);
    const payload: { estado: 'pagada' | 'pendiente' | 'sin_factura'; validacion_estado?: 'revisada' } = {
      estado: newEstado,
    };

    // Al marcar pagada desde la lista no pedimos referencias/comprobante.
    if (newEstado === 'pagada') {
      payload.validacion_estado = 'revisada';
    }

    const res = await actualizarFactura(factura.id, payload);
    setUpdatingFacturaId(null);

    if (res.ok) {
      showToast('Estado actualizado', 'success');
      await refreshFacturas();
    } else {
      showToast(getErrorMsg(res, 'No se pudo actualizar el estado'), 'error');
    }
  }, [refreshFacturas]);

  // ─── HANDLER: Cambiar grupo inline ─────────────────────────────────────────
  const handleGrupoChange = useCallback(async (factura: Factura, grupo: 1 | 2) => {
    if (!factura?.id) return;

    setUpdatingFacturaId(factura.id);
    const res = await actualizarFactura(factura.id, { grupo });
    setUpdatingFacturaId(null);

    if (res.ok) {
      showToast('Grupo actualizado', 'success');
      await refreshFacturas();
    } else {
      showToast(getErrorMsg(res, 'No se pudo actualizar el grupo'), 'error');
    }
  }, [refreshFacturas]);

  const startEdit = useCallback((factura: Factura, field: InlineFacturaField, value: string) => {
    setEditingCell({ id: factura.id, field, value });
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const commitEdit = useCallback(async (factura: Factura) => {
    if (!editingCell || editingCell.id !== factura.id) return;

    const original =
      editingCell.field === 'monto'
        ? String(factura.monto ?? '')
        : String((factura as unknown as Record<string, unknown>)[editingCell.field] ?? '');

    if (editingCell.value !== original) {
      if (editingCell.field === 'monto' && editingCell.value.trim() === '') {
        setEditingCell(null);
        return;
      }

      const payload: ActualizarFacturaPayload = {
        [editingCell.field]: editingCell.field === 'monto'
          ? Number(editingCell.value)
          : editingCell.value,
      } as ActualizarFacturaPayload;

      setUpdatingFacturaId(factura.id);
      const res = await actualizarFactura(factura.id, payload);
      setUpdatingFacturaId(null);

      if (res.ok) {
        showToast('Factura actualizada', 'success');
        await refreshFacturas();
      } else {
        showToast(getErrorMsg(res, 'No se pudo actualizar la factura'), 'error');
      }
    }

    setEditingCell(null);
  }, [editingCell, refreshFacturas]);

  const renderInlineCell = useCallback((
    factura: Factura,
    field: InlineFacturaField,
    display: React.ReactNode,
    rawValue: string,
    inputType: 'text' | 'date' | 'number' | 'url' = 'text',
    className = '',
  ) => {
    const isEditing = editingCell?.id === factura.id && editingCell?.field === field;

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          type={inputType}
          value={editingCell.value}
          onChange={(e) => setEditingCell((prev) => (prev ? { ...prev, value: e.target.value } : null))}
          onBlur={() => void commitEdit(factura)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void commitEdit(factura);
            }
            if (e.key === 'Escape') setEditingCell(null);
          }}
          className={`w-full min-w-[90px] rounded border border-blue-400 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${className}`}
        />
      );
    }

    return (
      <span
        onDoubleClick={() => startEdit(factura, field, rawValue)}
        title="Doble clic para editar"
        className={`cursor-text select-none ${className}`}
      >
        {display}
      </span>
    );
  }, [commitEdit, editingCell, startEdit]);

  // ─── HANDLER: Eliminar Usuario ─────────────────────────────────────────────
  const handleDeleteUsuario = useCallback(async () => {
    if (!perfil) return;
    setDeletingUser(true);
    const res = await deleteUsuario({ id: perfil.usuario.id });
    setDeletingUser(false);
    if (res.ok) {
      showToast('Cliente eliminado permanentemente', 'success');
      setOpenDeleteUserModal(false);
      onBack();
    } else {
      showToast(getErrorMsg(res, 'No se pudo eliminar el cliente'), 'error');
    }
  }, [perfil, onBack]);

  // ─── HANDLER: Eliminar Obligación ──────────────────────────────────────────
  const handleDeleteObligacion = useCallback(async (obligacionId: string) => {
    setDeletingObligacionId(obligacionId);
    const res = await deleteObligacion(obligacionId, { force: !!deleteObligacionForce[obligacionId] });
    setDeletingObligacionId(null);
    if (res.ok) {
      showToast('Obligación eliminada', 'success');
      try {
        const r2 = await getAdminClientePerfil(perfil?.usuario.telefono || '', selectedMonth);
        if (r2.ok && r2.data) setPerfil(r2.data);
      } catch (err) {
        console.error('Error recargando perfil tras eliminar obligación:', err);
      }
    } else {
      showToast(getErrorMsg(res, 'No se pudo eliminar la obligación'), 'error');
    }
  }, [deleteObligacionForce, perfil?.usuario.telefono, selectedMonth]);

  // ─── HANDLER: Eliminar Factura ─────────────────────────────────────────────
  const handleDeleteFactura = useCallback(async () => {
    if (!facturaToDelete?.id) return;
    setDeletingFactura(true);
    const res = await deleteFactura(facturaToDelete.id);
    setDeletingFactura(false);
    if (res.ok) {
      const pagos = res.data?.pagos_eliminados;
      showToast(
        pagos
          ? `Factura eliminada (${pagos} pago${pagos !== 1 ? 's' : ''} revertido${pagos !== 1 ? 's' : ''})`
          : 'Factura eliminada',
        'success'
      );
      setFacturaToDelete(null);
      await refreshFacturas();
    } else {
      showToast(getErrorMsg(res, 'No se pudo eliminar la factura'), 'error');
    }
  }, [facturaToDelete, refreshFacturas]);

  // Manejar cambio de mes
  const handleMonthChange = useCallback(
    async (newMonth: string) => {
      setSelectedMonth(newMonth);
      setIsLoadingMonth(true);
      try {
        const res = await getAdminClientePerfil(perfil?.usuario.telefono || '', newMonth);
        if (res.ok && res.data) {
          // Preservar programacion_recargas del estado anterior y actualizar con los datos del nuevo mes
          setPerfil(prev => {
            if (!prev) return res.data;
            return {
              ...res.data,
              programacion_recargas: prev.programacion_recargas,
            } as AdminClientePerfilData;
          });
        }
      } catch (err) {
        console.error('Error cargando datos del mes:', err);
      } finally {
        setIsLoadingMonth(false);
      }
    },
    [perfil?.usuario.telefono]
  );

  useEffect(() => {
    if (monthOptions.length === 0) return;
    if (!monthOptions.some((opt) => opt.value === selectedMonth)) {
      void handleMonthChange(monthOptions[0].value);
    }
  }, [monthOptions, selectedMonth, handleMonthChange]);

  // Obtener todas las facturas del mes actual
  const allFacturasMes = useMemo(() => {
    const facturas: Factura[] = [];
    const obligation = perfil?.obligaciones_mes || [];
    obligation.forEach(ob => {
      if (ob.facturas) {
        facturas.push(...ob.facturas);
      }
    });
    return facturas;
  }, [perfil?.obligaciones_mes]);

  const filteredFacturas = filterFacturasByTab(allFacturasMes, activeTab);


  if (!perfil) return null;

  const u = perfil.usuario;
  const r = perfil.resumen;
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-8 space-y-6">
        {/* BACK BUTTON + HEADER */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:border-gray-300 transition-all"
              title="Volver"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Usuario</h1>
              <p className="text-sm text-gray-500 mt-1">Detalles y gestión del cliente</p>
            </div>
          </div>

          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            disabled={isLoadingMonth || monthOptions.length === 0}
            className={`bg-white border border-gray-200 px-3 py-2 rounded-full text-sm font-medium text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 ${isLoadingMonth ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {monthOptions.length > 0 ? (
              monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            ) : (
              <option value="">Sin registros</option>
            )}
          </select>
        </div>

        <div className="h-px bg-gray-200 w-full" />

        {/* USER CARD - Sections + Quick Actions */}
        <div className="flex gap-4">
          <div className="bg-white border border-gray-200 rounded-xl flex overflow-hidden flex-1">
            {/* Section 1: Name & Balance */}
            <div className="p-5 flex-1 flex flex-col justify-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {u.nombre} {u.apellido}
              </h2>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-medium text-orange-500">{formatCurrency(r.saldo_disponible)}</span>
                <span className="text-sm text-gray-500">/ Saldo</span>
              </div>
            </div>

            <div className="w-px bg-gray-200 my-4" />

            {/* Section 2: Contact */}
            <div className="p-5 flex-1 relative">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setOpenEditUserModal(true)}
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <div className="text-sm text-gray-500 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <PhoneIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  {u.telefono}
                </div>
                <div className="flex items-center gap-2">
                  <EnvelopeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  {u.correo || 'No registrado'}
                </div>
                <div className="flex items-center gap-2">
                  <IdentificationIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  {[u.tipo_identificacion, u.numero_identificacion].filter(Boolean).join(' ') || 'No registrada'}
                </div>
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  {[u.ciudad, u.direccion].filter(Boolean).join(' · ') || 'No registrada'}
                </div>
              </div>
            </div>

            <div className="w-px bg-gray-200 my-4" />

            {/* Section 3: Plan */}
            <div className="p-5 flex-1 relative">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setOpenPlanModal(true)}
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <div className="text-xs text-gray-500 font-semibold mb-1">Plan</div>
              <div className="text-lg font-semibold mb-1" style={{ color: getPlanColor(u.plan) }}>
                {u.plan.charAt(0).toUpperCase() + u.plan.slice(1)}
              </div>
              <div className="text-sm font-medium text-gray-900">
                {r.facturas_validadas_count_mes} Factura{r.facturas_validadas_count_mes !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="w-px bg-gray-200 my-4" />

            {/* Section 4: Fechas de Recarga */}
            <div className="p-5 flex-1 relative">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setOpenFechasRecargasModal(true)}
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <div className="text-xs text-gray-500 font-semibold mb-3">Fechas de recarga</div>
              <div className="text-sm mb-2 text-gray-900">
                <span className="text-blue-500 font-semibold">Grupo 1</span>
                {perfil?.programacion_recargas?.dia_1 ? 
                  ` - Día ${perfil.programacion_recargas.dia_1}` 
                  : ' - —'
                }
              </div>
              <div className="text-sm mb-2 text-gray-900 font-semibold flex items-center gap-1">
                {formatCurrency(perfil?.cuotas_mes?.grupo1?.monto || 0)} 
                <span className="text-green-500 text-base">✓</span>
              </div>
              <div className="h-3" />
              {perfil?.programacion_recargas?.cantidad_recargas === 2 && (
                <>
                  <div className="text-sm mb-2 text-gray-900">
                    <span className="text-blue-500 font-semibold">Grupo 2</span>
                    {perfil?.programacion_recargas?.dia_2 ? ` - Día ${perfil.programacion_recargas.dia_2}` : ' - —'}
                  </div>
                  <div className="text-sm mb-2 text-gray-900 font-semibold flex items-center gap-1">
                    {formatCurrency(perfil?.cuotas_mes?.grupo2?.monto || 0)} 
                    <span className="text-amber-500 text-base">⚠</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section 5: Quick Actions - Separate card */}
          <div className="bg-gray-900 text-white flex flex-col justify-center w-[220px] flex-shrink-0 p-5 rounded-xl">
            <h3 className="text-sm font-medium mb-4">Acciones rápidas</h3>
            <button
              onClick={() => setOpenObligacionModal(true)}
              className="bg-transparent border border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white px-3 py-2 rounded-md mb-2 text-sm text-left transition-all flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Agregar obligación
            </button>
            <button
              onClick={() => setOpenReportarRecargaModal(true)}
              className="bg-transparent border border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white px-3 py-2 rounded-md text-sm text-left transition-all flex items-center gap-2"
            >
              <DocumentTextIcon className="h-4 w-4" />
              Registrar recarga
            </button>
            <button
              onClick={() => setOpenDeleteObligacionModal(true)}
              className="mt-2 bg-transparent border border-red-700/50 text-red-300 hover:border-red-500 hover:text-red-200 px-3 py-2 rounded-md text-sm text-left transition-all flex items-center gap-2"
            >
              <TrashIcon className="h-4 w-4" />
              Eliminar obligación
            </button>
            <button
              onClick={() => setOpenDeleteUserModal(true)}
              className="mt-2 bg-transparent border border-red-700/50 text-red-300 hover:border-red-500 hover:text-red-200 px-3 py-2 rounded-md text-sm text-left transition-all flex items-center gap-2"
            >
              <TrashIcon className="h-4 w-4" />
              Eliminar cliente
            </button>
            <button
              disabled={creandoSiguienteMes}
              onClick={async () => {
                if (!selectedMonth) return;
                setCreandoSiguienteMes(true);
                try {
                  const res = await crearSiguienteMes(u.telefono, selectedMonth);
                  if (res.ok) {
                    showToast(`Siguiente mes creado: ${res.data?.nuevas_obligaciones ?? 0} obligación(es)`, 'success');
                    const r2 = await getAdminClientePerfil(u.telefono, selectedMonth);
                    if (r2.ok && r2.data) setPerfil(r2.data);
                  } else {
                    showToast('Error al crear el siguiente mes', 'error');
                  }
                } catch {
                  showToast('Error al crear el siguiente mes', 'error');
                } finally {
                  setCreandoSiguienteMes(false);
                }
              }}
              className="mt-2 bg-transparent border border-blue-700/50 text-blue-300 hover:border-blue-500 hover:text-blue-200 px-3 py-2 rounded-md text-sm text-left transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4" />
              {creandoSiguienteMes ? 'Creando...' : 'Crear siguiente mes'}
            </button>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-sm font-semibold mb-4 text-gray-900">Total recargas</div>
            <div className="text-[28px] font-normal text-gray-900">{formatCurrency(r.total_recargas_aprobadas_mes)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-sm font-semibold mb-4 text-gray-900">Total pagado</div>
            <div className="text-[28px] font-normal text-gray-900">{formatCurrency(r.total_pagos_realizados_mes)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-sm font-semibold mb-4 text-gray-900">Total pendiente</div>
            <div className="text-[28px] font-normal text-gray-900">{formatCurrency(r.total_pendiente_mes)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-sm font-semibold mb-4 text-gray-900">Saldo disponible</div>
            <div className="text-[28px] font-normal text-gray-900">{formatCurrency(r.saldo_disponible)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-sm font-semibold mb-1 text-gray-900">Transacciones</div>
            <div className="text-xs font-medium mb-3 text-gray-500">Cash in</div>
            <div className="text-[28px] font-normal text-gray-900">{formatCurrency(r.total_recargas_aprobadas_mes)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-sm font-semibold mb-1 text-gray-900">Transacciones</div>
            <div className="text-xs font-medium mb-3 text-gray-500">Cash out</div>
            <div className="text-[28px] font-normal text-gray-900">{formatCurrency(r.total_pagos_realizados_mes)}</div>
          </div>
        </div>

        {/* TABS - Matching facturas/historial style */}
        <div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex gap-1">
          {(['todas', 'pagadas', 'pendientes', 'sin-validar'] as FacturaFilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === tab
                  ? 'bg-white text-orange-500 border border-orange-500'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab === 'todas' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              )}
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
              <span className={`text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 ${
                activeTab === tab
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {getFacturaCountByTab(allFacturasMes, tab)}
              </span>
            </button>
          ))}
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="px-4 py-3 text-left font-medium">
                    <span className="flex items-center gap-1">Etiqueta <span className="text-xs">↕</span></span>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    <span className="flex items-center gap-1">Número de ref <span className="text-xs">↕</span></span>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    <span className="flex items-center gap-1">Tipo de ref <span className="text-xs">↕</span></span>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    <span className="flex items-center gap-1">Portal <span className="text-xs">↕</span></span>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    <span className="flex items-center gap-1">F. emisión <span className="text-xs">↕</span></span>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    <span className="flex items-center gap-1">F. vencimiento <span className="text-xs">↕</span></span>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    <span className="flex items-center gap-1">Monto <span className="text-xs">↕</span></span>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    <span className="flex items-center gap-1">Grupo <span className="text-xs">↕</span></span>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    <span className="flex items-center gap-1">Estado <span className="text-xs">↕</span></span>
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody key={`tbody-${perfil?.programacion_recargas?.cantidad_recargas}-${selectedMonth}`}>
                {filteredFacturas.length > 0 ? (
                  filteredFacturas.map((factura, idx) => {
                    const esSuscripcion = (factura.tipo_referencia || '').toLowerCase() === 'suscripcion';

                    const grupo = calcularGrupoFactura(
                      factura,
                      perfil?.cuotasCalculadas,
                      perfil?.programacion_recargas?.cantidad_recargas
                    );

                    const cantidadRecargas = Number(perfil?.programacion_recargas?.cantidad_recargas || 1);
                    const grupoActual = esSuscripcion
                      ? 1
                      : Number(factura.grupo || grupo || (cantidadRecargas === 1 ? 1 : 0));
                    const estadoActual = String(factura.estado || 'pendiente');
                    const isUpdatingRow = updatingFacturaId === factura.id;
                    const saldoGlobal = perfil?.resumen.saldo_disponible || 0;
                    const canPay = estadoActual !== 'pagada' && factura.validacion_estado === 'revisada' && saldoGlobal >= Number(factura.monto || 0);

                    const getEstadoClasses = (estado: string) => {
                      switch (estado) {
                        case 'pagada': return 'text-green-600 border-green-200 bg-green-50';
                        case 'pendiente': return 'text-amber-600 border-amber-200 bg-amber-50';
                        case 'aproximada': return 'text-yellow-600 border-yellow-200 bg-yellow-50';
                        case 'sin_factura': return 'text-gray-500 border-gray-200 bg-gray-50';
                        // Compat
                        case 'extraida': return 'text-gray-500 border-gray-200 bg-gray-50';
                        case 'validada': return 'text-indigo-600 border-indigo-200 bg-indigo-50';
                        case 'rechazada': return 'text-red-600 border-red-200 bg-red-50';
                        default: return 'text-gray-500 border-gray-200 bg-gray-50';
                      }
                    };

                    return (
                      <tr
                        key={factura.id || `factura-${idx}`}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      >
                        <td className="px-4 py-4 text-gray-900 font-medium text-sm">
                          {renderInlineCell(
                            factura,
                            'etiqueta',
                            factura.etiqueta || '@\u2014',
                            factura.etiqueta || '',
                          )}
                        </td>
                        <td className="px-4 py-4 text-gray-600 font-mono text-xs">
                          {renderInlineCell(
                            factura,
                            'referencia_pago',
                            factura.referencia_pago || '\u2014',
                            factura.referencia_pago || '',
                          )}
                        </td>
                        <td className="px-4 py-4 text-gray-600 text-xs">
                          {renderInlineCell(
                            factura,
                            'tipo_referencia',
                            factura.tipo_referencia || '—',
                            factura.tipo_referencia || '',
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {esSuscripcion ? (
                            <span className="text-gray-400">N/A</span>
                          ) : (() => {
                            const portalUrl = factura.pagina_pago || factura.archivo_url;
                            const portalField: InlineFacturaField = factura.pagina_pago ? 'pagina_pago' : 'archivo_url';
                            return portalUrl ? (
                              renderInlineCell(
                                factura,
                                portalField,
                                <a
                                  href={portalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Link
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                  </svg>
                                </a>,
                                portalUrl,
                                'url',
                                'text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1'
                              )
                            ) : (
                              renderInlineCell(
                                factura,
                                portalField,
                                <span className="text-gray-400">--</span>,
                                '',
                                'url',
                                'text-gray-400'
                              )
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4 text-gray-600 text-sm">
                          {renderInlineCell(
                            factura,
                            'fecha_emision',
                            factura.fecha_emision ? formatDate(factura.fecha_emision) : '--',
                            factura.fecha_emision ? factura.fecha_emision.slice(0, 10) : '',
                            'date',
                          )}
                        </td>
                        <td
                          className={`px-4 py-4 text-sm font-medium ${
                            factura.fecha_vencimiento && isDateBeforeToday(factura.fecha_vencimiento)
                              ? 'text-red-500'
                              : 'text-gray-600'
                          }`}
                        >
                          {renderInlineCell(
                            factura,
                            'fecha_vencimiento',
                            factura.fecha_vencimiento ? formatDate(factura.fecha_vencimiento) : '--',
                            factura.fecha_vencimiento ? factura.fecha_vencimiento.slice(0, 10) : '',
                            'date',
                          )}
                        </td>
                        <td className="px-4 py-4 text-gray-900 font-medium text-sm">
                          {renderInlineCell(
                            factura,
                            'monto',
                            formatCurrency(factura.monto),
                            String(factura.monto ?? ''),
                            'number',
                            'font-medium text-gray-900'
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <select
                            value={grupoActual > 0 ? String(grupoActual) : ''}
                            disabled={isUpdatingRow || esSuscripcion}
                            onChange={(e) => {
                              if (esSuscripcion) return;
                              const value = Number(e.target.value);
                              if (value === 1 || value === 2) {
                                void handleGrupoChange(factura, value as 1 | 2);
                              }
                            }}
                            className="h-9 min-w-[86px] rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700 disabled:opacity-60"
                          >
                            {esSuscripcion || cantidadRecargas === 1 ? (
                              <option value="1">Grupo 1</option>
                            ) : (
                              <>
                                <option value="1">Grupo 1</option>
                                <option value="2">Grupo 2</option>
                              </>
                            )}
                          </select>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <select
                            value={estadoActual}
                            disabled={isUpdatingRow || payingFacturaId === factura.id}
                            onChange={(e) => {
                              const next = e.target.value as 'pagada' | 'pendiente' | 'sin_factura' | 'aproximada';
                              if (esSuscripcion && next === 'pagada') {
                                void pagarFacturaDirecto(factura);
                                return;
                              }
                              void handleEstadoChange(factura, next);
                            }}
                            className={`h-9 min-w-[132px] rounded-full border px-3 text-sm font-medium bg-white ${getEstadoClasses(estadoActual)} disabled:opacity-60`}
                          >
                            <option value="pagada">Pagada</option>
                            <option value="pendiente">Pendiente</option>
                            {!esSuscripcion && <option value="sin_factura">Sin factura</option>}
                            {!esSuscripcion && <option value="aproximada">Aproximada</option>}
                          </select>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                void pagarFacturaDirecto(factura);
                              }}
                              disabled={!canPay || payingFacturaId === factura.id}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                              title={canPay ? 'Pagar factura' : 'Solo se puede pagar una factura revisada y con saldo suficiente'}
                            >
                              <BanknotesIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (esSuscripcion) return;
                                setSelectedFactura(factura);
                                setOpenAproximarModal(true);
                              }}
                              disabled={esSuscripcion}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-purple-600 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Aproximar valor"
                            >
                              <ReceiptPercentIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (esSuscripcion) return;
                                setSelectedFactura(factura);
                                setOpenEditarFacturaModal(true);
                              }}
                              disabled={esSuscripcion}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Editar"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (esSuscripcion) return;
                                setFacturaToDelete(factura);
                              }}
                              disabled={esSuscripcion}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Eliminar"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-500 text-sm">
                      No hay facturas en esta categor\u00EDa
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <UpdatePlanModal
          open={openPlanModal}
          onClose={() => setOpenPlanModal(false)}
          telefono={u.telefono}
          currentPlan={u.plan}
          onSuccess={(data) => {
            setPerfil(prev => prev ? { ...prev, usuario: { ...prev.usuario, plan: data.plan_nuevo } } : null);
          }}
        />

        <EditarFechasRecargasModal
          open={openFechasRecargasModal}
          onClose={() => setOpenFechasRecargasModal(false)}
          usuario_id={u.id}
          currentData={perfil?.programacion_recargas}
          onSuccess={async (data) => {
            // Actualizar programacion_recargas inmediatamente
            setPerfil(prev => prev ? { ...prev, programacion_recargas: data } : null);
            
            // Recargar los datos del perfil para recalcular cuotas con la nueva distribución
            try {
              const res = await getAdminClientePerfil(u.telefono, selectedMonth);
              if (res.ok && res.data) {
                setPerfil(res.data);
              }
            } catch (err) {
              console.error('Error recargando perfil:', err);
            }
          }}
        />

        <UpsertUsuarioAdminModal
          open={openEditUserModal}
          onClose={() => setOpenEditUserModal(false)}
          mode="edit-profile"
          initialData={{
            usuario_id: u.id,
            telefono: u.telefono,
            nombre: u.nombre,
            apellido: u.apellido,
            correo: u.correo,
            tipo_identificacion: u.tipo_identificacion,
            numero_identificacion: u.numero_identificacion,
            ciudad: u.ciudad,
            direccion: u.direccion,
          }}
          onSuccess={async (data) => {
            // Recargar los datos del perfil (usa teléfono actualizado por si cambió)
            try {
              const tel = data?.telefono || u.telefono;
              const res = await getAdminClientePerfil(tel, selectedMonth);
              if (res.ok && res.data) {
                setPerfil(res.data);
              }
            } catch (err) {
              console.error('Error recargando perfil:', err);
            }
          }}
        />

        <UpsertObligacionConFacturasModal
          open={openObligacionModal}
          onClose={() => setOpenObligacionModal(false)}
          mode="from-profile"
          initialTelefono={u.telefono}
          initialPeriodo={selectedMonth ? selectedMonth.slice(0, 7) : undefined}
          cantidadRecargas={perfil?.programacion_recargas?.cantidad_recargas}
          usuarioNombre={`${u.nombre || ''} ${u.apellido || ''}`.trim()}
          onSuccess={async () => {
            // Recargar los datos del perfil para actualizar la lista de obligaciones
            try {
              const res = await getAdminClientePerfil(u.telefono, selectedMonth);
              if (res.ok && res.data) {
                setPerfil(res.data);
              }
            } catch (err) {
              console.error('Error recargando perfil:', err);
            }
          }}
        />

        <ReportarRecargaModal
          open={openReportarRecargaModal}
          onClose={() => setOpenReportarRecargaModal(false)}
          mode="from-profile"
          initialTelefono={u.telefono}
          usuarioNombre={`${u.nombre || ''} ${u.apellido || ''}`.trim()}
          onSuccess={async () => {
            // Recargar los datos del perfil para actualizar las recargas
            try {
              const res = await getAdminClientePerfil(u.telefono, selectedMonth);
              if (res.ok && res.data) {
                setPerfil(res.data);
              }
            } catch (err) {
              console.error('Error recargando perfil:', err);
            }
          }}
        />

        {/* ─ DELETE USER MODAL ──────────────────────────────────────────────── */}
        {openDeleteUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { if (!deletingUser) { setOpenDeleteUserModal(false); } }}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900">Eliminar cliente</h3>
              <p className="text-sm text-gray-700">
                ¿Seguro que deseas eliminar a <strong>{u.nombre} {u.apellido}</strong> ({u.telefono})?
              </p>
              <p className="text-xs text-gray-500">
                Esta acción es permanente.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  disabled={deletingUser}
                  onClick={() => { setOpenDeleteUserModal(false); }}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  disabled={deletingUser}
                  onClick={handleDeleteUsuario}
                  className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {deletingUser ? 'Eliminando…' : (<><TrashIcon className="h-4 w-4" /> Eliminar</>)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─ DELETE OBLIGACION MODAL ────────────────────────────────────────── */}
        {openDeleteObligacionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { if (!deletingObligacionId) { setOpenDeleteObligacionModal(false); } }}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Eliminar obligación</h3>
                <button
                  onClick={() => { if (!deletingObligacionId) setOpenDeleteObligacionModal(false); }}
                  className="text-gray-400 hover:text-gray-600"
                >✕</button>
              </div>
              <p className="text-sm text-gray-600">
                Selecciona la obligación del mes que deseas eliminar. Activa &ldquo;forzar cascada&rdquo; si necesitas eliminar también las facturas asociadas.
              </p>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {(perfil?.obligaciones_mes || []).length === 0 && (
                  <p className="text-sm text-gray-500 italic">No hay obligaciones para este mes.</p>
                )}
                {(perfil?.obligaciones_mes || []).map((ob) => (
                  <div key={ob.id} className="border border-gray-200 rounded-lg p-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{ob.descripcion || ob.servicio}</p>
                      <p className="text-xs text-gray-500">
                        {ob.total_facturas} factura{ob.total_facturas !== 1 ? 's' : ''} · {formatCurrency(ob.monto_total)} · Estado: {ob.estado}
                      </p>
                      <label className="flex items-center gap-2 text-xs text-gray-600 mt-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!deleteObligacionForce[ob.id]}
                          onChange={(e) => setDeleteObligacionForce((prev) => ({ ...prev, [ob.id]: e.target.checked }))}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        Forzar cascada (elimina facturas)
                      </label>
                    </div>
                    <button
                      disabled={!!deletingObligacionId}
                      onClick={() => handleDeleteObligacion(ob.id)}
                      className="shrink-0 px-3 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {deletingObligacionId === ob.id ? 'Eliminando…' : (<><TrashIcon className="h-3.5 w-3.5" /> Eliminar</>)}
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <button
                  disabled={!!deletingObligacionId}
                  onClick={() => setOpenDeleteObligacionModal(false)}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─ DELETE FACTURA MODAL ──────────────────────────────────────────── */}
        {facturaToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { if (!deletingFactura) setFacturaToDelete(null); }}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900">Eliminar factura</h3>
              <p className="text-sm text-gray-700">
                ¿Seguro que deseas eliminar la factura
                {facturaToDelete.etiqueta ? <> <strong>{facturaToDelete.etiqueta}</strong></> : ''}
                {facturaToDelete.referencia_pago ? <> (ref. {facturaToDelete.referencia_pago})</> : ''}?
              </p>
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                Estado actual: <strong>{facturaToDelete.estado}</strong>. Si tiene pagos asociados se eliminarán y se devolverá el saldo. Los contadores de la obligación se recalcularán automáticamente.
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  disabled={deletingFactura}
                  onClick={() => setFacturaToDelete(null)}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  disabled={deletingFactura}
                  onClick={handleDeleteFactura}
                  className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {deletingFactura ? 'Eliminando…' : (<><TrashIcon className="h-4 w-4" /> Eliminar</>)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─ FACTURA ACTION MODALS ─────────────────────────────────────────────── */}
        {selectedFactura && perfil && (
          <>
            <AproximarValorModal
              open={openAproximarModal}
              onClose={() => { setOpenAproximarModal(false); setSelectedFactura(null); }}
              factura={selectedFactura}
              onSuccess={handleAproximarSuccess}
              showToast={showToast}
            />

            <EditarFacturaModal
              open={openEditarFacturaModal}
              factura={selectedFactura}
              cantidadRecargas={perfil?.programacion_recargas?.cantidad_recargas}
              onClose={() => { setOpenEditarFacturaModal(false); setSelectedFactura(null); }}
              onSuccess={async () => {
                if (perfil) {
                  try {
                    const res = await getAdminClientePerfil(u.telefono, selectedMonth);
                    if (res.ok && res.data) setPerfil(res.data);
                  } catch (e) {
                    console.error(e);
                  }
                }
              }}
              showToast={showToast}
            />
          </>
        )}

        {/* ─ TOAST NOTIFICATION ────────────────────────────────────────────────── */}
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}
      </main>
    </div>
  );
}
