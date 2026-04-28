'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ChevronLeftIcon,
  PencilIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  PlusIcon,
  DocumentTextIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import Badge from '@/components/ui/Badge';
import UpdatePlanModal from '@/components/modals/UpdatePlanModal';
import EditarFechasRecargasModal from '@/components/modals/EditarFechasRecargasModal';
import UpsertUsuarioAdminModal from '@/components/modals/UpsertUsuarioAdminModal';
import UpsertObligacionConFacturasModal from '@/components/modals/UpsertObligacionConFacturasModal';
import ReportarRecargaModal from '@/components/modals/ReportarRecargaModal';
import ValidarFacturaModal from '@/components/modals/ValidarFacturaModal';
import RechazarFacturaModal from '@/components/modals/RechazarFacturaModal';
import PagarFacturaModal from '@/components/modals/PagarFacturaModal';
import AproximarValorModal from '@/components/modals/AproximarValorModal';
import type { AdminClientePerfilData, Factura, Plan, ProgramacionRecargas } from '@/types';
import { formatCurrency, formatDate, getErrorMsg } from '@/lib/utils';
import { getAdminClientePerfil, validarFactura, rechazarFactura, deleteUsuario, deleteObligacion, deleteFactura } from '@/lib/api';
import Toast from '@/components/ui/Toast';

// ─── Types ──────────────────────────────────────────────────────────────────
type FacturaFilterTab = 'todas' | 'pagadas' | 'pendientes' | 'sin-validar';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getPlanColor = (plan: string): string => {
  switch (plan) {
    case 'control': return '#3b82f6';
    case 'tranquilidad': return '#f59e0b';
    case 'respaldo': return '#10b981';
    default: return '#6b7280';
  }
};

const getFacturaCountByTab = (facturas: Factura[], tab: FacturaFilterTab): number => {
  if (tab === 'todas') return facturas.length;
  if (tab === 'pagadas') return facturas.filter(f => f.estado === 'pagada').length;
  // Pendientes = validadas pero NO pagadas (estado validada o pendiente)
  if (tab === 'pendientes') return facturas.filter(f => ['validada', 'pendiente'].includes(f.estado)).length;
  if (tab === 'sin-validar') return facturas.filter(f => f.estado === 'extraida').length;
  return 0;
};

const filterFacturasByTab = (facturas: Factura[], tab: FacturaFilterTab): Factura[] => {
  if (tab === 'todas') return facturas;
  if (tab === 'pagadas') return facturas.filter(f => f.estado === 'pagada');
  // Pendientes = validadas pero NO pagadas (estado validada o pendiente)
  if (tab === 'pendientes') return facturas.filter(f => ['validada', 'pendiente'].includes(f.estado));
  if (tab === 'sin-validar') return facturas.filter(f => f.estado === 'extraida');
  return facturas;
};

/**
 * Calcula el grupo de una factura
 * - Si cantidad_recargas = 1: TODAS las facturas van a grupo 1
 * - Si cantidad_recargas = 2: usa cuotasCalculadas O factura.grupo del backend
 */
const calcularGrupoFactura = (
  factura: Factura,
  cuotasCalculadas: any,
  cantidadRecargas: number | undefined | null
): number | null => {
  // Normalizar cantidad
  const cantidad = Number(cantidadRecargas);
  
  // Si cantidad_recargas es 1: TODAS van a grupo 1
  if (cantidad === 1) {
    return factura.estado === 'validada' ? 1 : null;
  }

  // Si cantidad_recargas es 2:
  if (cantidad === 2) {
    // Primero intentar usar cuotasCalculadas
    if (cuotasCalculadas) {
      const idsGrupo1 = new Set((cuotasCalculadas?.cuota1?.facturas || []).map((f: any) => f.id));
      const idsGrupo2 = new Set((cuotasCalculadas?.cuota2?.facturas || []).map((f: any) => f.id));
      
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

const getEstadoBadgeContent = (estado: string) => {
  const estadoLower = estado.toLowerCase();
  if (estadoLower === 'pagada') return 'Pagado';
  if (estadoLower === 'pendiente') return 'Pendiente';
  if (estadoLower === 'extraida') return 'Sin Validar';
  if (estadoLower === 'validada') return 'Validada';
  if (estadoLower === 'rechazada') return 'Rechazada';
  return estado;
};

// Generar meses disponibles (6 futuro + 12 pasado)
const generateMonthOptions = () => {
  const options = [];
  const today = new Date();
  
  // 6 meses hacia el FUTURO
  for (let i = 6; i > 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const monthName = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    options.push({ value: `${year}-${month}-01`, label: monthName.charAt(0).toUpperCase() + monthName.slice(1) });
  }
  
  // MES ACTUAL (separador visual)
  const today_y = today.getFullYear();
  const today_m = String(today.getMonth() + 1).padStart(2, '0');
  const todayName = today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  options.push({ value: `${today_y}-${today_m}-01`, label: `${todayName.charAt(0).toUpperCase() + todayName.slice(1)} (Actual)` });
  
  // 12 meses hacia el PASADO
  for (let i = 1; i <= 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const monthName = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    options.push({ value: `${year}-${month}-01`, label: monthName.charAt(0).toUpperCase() + monthName.slice(1) });
  }
  
  return options;
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
  const [deleteUserHard, setDeleteUserHard] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [openDeleteObligacionModal, setOpenDeleteObligacionModal] = useState(false);
  const [deleteObligacionForce, setDeleteObligacionForce] = useState<Record<string, boolean>>({});
  const [deletingObligacionId, setDeletingObligacionId] = useState<string | null>(null);
  const [facturaToDelete, setFacturaToDelete] = useState<Factura | null>(null);
  const [deletingFactura, setDeletingFactura] = useState(false);

  // ─── FACTURA ACTION STATES ────────────────────────────────────────────────────
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal visibility states for factura actions
  const [openValidarModal, setOpenValidarModal] = useState(false);
  const [openRechazarModal, setOpenRechazarModal] = useState(false);
  const [openPagarModal, setOpenPagarModal] = useState(false);
  const [openAproximarModal, setOpenAproximarModal] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const monthOptions = useMemo(() => generateMonthOptions(), []);

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

  // ─── HANDLER: Validar Factura ───────────────────────────────────────────────────
  // NO cerrar el modal ni limpiar la factura aquí — el modal muestra NotificationDisplay
  // y el usuario cierra manualmente con el botón "Cerrar" (onClose)
  const handleValidarSuccess = useCallback(async () => {
    await refreshFacturas();
  }, [refreshFacturas]);

  // ─── HANDLER: Rechazar Factura ──────────────────────────────────────────────────
  const handleRechazarSuccess = useCallback(async () => {
    await refreshFacturas();
  }, [refreshFacturas]);

  // ─── HANDLER: Pagar Factura ────────────────────────────────────────────────────
  const handlePagarSuccess = useCallback(async () => {
    await refreshFacturas();
  }, [refreshFacturas]);
  // ─── HANDLER: Aproximar Valor ──────────────────────────────────────────────
  const handleAproximarSuccess = useCallback(async () => {
    await refreshFacturas();
  }, [refreshFacturas]);

  // ─── HANDLER: Eliminar Usuario ─────────────────────────────────────────────
  const handleDeleteUsuario = useCallback(async () => {
    if (!perfil) return;
    setDeletingUser(true);
    const res = await deleteUsuario({ id: perfil.usuario.id }, { hard: deleteUserHard });
    setDeletingUser(false);
    if (res.ok) {
      showToast(`Cliente ${deleteUserHard ? 'eliminado permanentemente' : 'desactivado'}`, 'success');
      setOpenDeleteUserModal(false);
      setDeleteUserHard(false);
      onBack();
    } else {
      showToast(getErrorMsg(res, 'No se pudo eliminar el cliente'), 'error');
    }
  }, [perfil, deleteUserHard, onBack]);

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

  if (!perfil) return null;

  const u = perfil.usuario;
  const r = perfil.resumen;

  // Obtener todas las facturas del mes actual
  const allFacturasMes = useMemo(() => {
    const facturas: Factura[] = [];
    const obligation = perfil.obligaciones_mes || [];
    obligation.forEach(ob => {
      if (ob.facturas) {
        facturas.push(...ob.facturas);
      }
    });
    return facturas;
  }, [perfil.obligaciones_mes]);

  const filteredFacturas = filterFacturasByTab(allFacturasMes, activeTab);

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
            disabled={isLoadingMonth}
            className={`bg-white border border-gray-200 px-3 py-2 rounded-full text-sm font-medium text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 ${isLoadingMonth ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
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
                  <MapPinIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  {u.direccion || 'No registrada'}
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
          </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-5 gap-4">
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
            <div className="text-sm font-semibold mb-4 text-gray-900">Transacciones realizadas</div>
            <div className="text-[28px] font-normal text-gray-900">{r.recargas_aprobadas_count_mes}</div>
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
                    let displayEstado = getEstadoBadgeContent(factura.estado);
                    if (factura.origen === 'auto' && factura.estado === 'extraida') {
                      displayEstado = 'Heredada (Sin validar)';
                    }

                    const grupo = calcularGrupoFactura(
                      factura,
                      perfil?.cuotasCalculadas,
                      perfil?.programacion_recargas?.cantidad_recargas
                    );

                    const hasActions = true; // Eliminar siempre disponible

                    let actionCount = 1; // +1 por Eliminar
                    if (factura.estado === 'extraida') {
                      actionCount += 2;
                      if (factura.origen === 'auto') actionCount++;
                    } else if (factura.estado === 'validada' || factura.estado === 'pendiente') {
                      actionCount += 1;
                    }

                    const getEstadoClasses = (estado: string) => {
                      switch (estado) {
                        case 'pagada': return 'text-green-600 border-green-200 bg-green-50';
                        case 'pendiente': return 'text-amber-600 border-amber-200 bg-amber-50';
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
                          {factura.etiqueta || '@\u2014'}
                        </td>
                        <td className="px-4 py-4 text-gray-600 font-mono text-xs">
                          {factura.referencia_pago || '\u2014'}
                        </td>
                        <td className="px-4 py-4 text-gray-600 text-xs">
                          {factura.tipo_referencia || '—'}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {factura.archivo_url ? (
                            <a
                              href={factura.archivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                            >
                              Link
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                              </svg>
                            </a>
                          ) : (
                            <span className="text-gray-400">\u2014</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-gray-600 text-sm">
                          {factura.fecha_emision ? formatDate(factura.fecha_emision) : '\u2014'}
                        </td>
                        <td className={`px-4 py-4 text-sm font-medium ${
                          factura.fecha_vencimiento && new Date(factura.fecha_vencimiento) < new Date()
                            ? 'text-red-500'
                            : 'text-gray-600'
                        }`}>
                          {factura.fecha_vencimiento ? formatDate(factura.fecha_vencimiento) : '\u2014'}
                        </td>
                        <td className="px-4 py-4 text-gray-900 font-medium text-sm">
                          {formatCurrency(factura.monto)}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {grupo ? (
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-sm font-bold border ${
                              grupo === 1 ? 'text-gray-500 border-gray-300' : 'text-orange-500 border-orange-400'
                            }`}>
                              {grupo}
                            </span>
                          ) : (
                            <span className="border border-gray-200 px-2 py-0.5 rounded-full text-xs text-gray-400">\u2014</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getEstadoClasses(factura.estado)}`}>
                            {displayEstado}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {hasActions ? (
                            <div className="relative">
                              <button
                                onClick={() => {
                                  setOpenMenuId(openMenuId === factura.id ? null : (factura.id || null));
                                  setSelectedFactura(factura);
                                }}
                                className="px-3 py-2 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-lg transition-all duration-200 border border-gray-300 hover:border-gray-400 flex items-center justify-center gap-1.5 shadow-sm font-medium text-sm"
                                title={`${actionCount} acci\u00F3n(es) disponible(s)`}
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                                <span className="bg-gray-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                                  {actionCount}
                                </span>
                              </button>
                              {openMenuId === factura.id && (
                                <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-max">
                                  <div className="py-1">
                                    {factura.estado === 'extraida' && (
                                      <>
                                        <button
                                          onClick={() => {
                                            setSelectedFactura(factura);
                                            setOpenValidarModal(true);
                                            setOpenMenuId(null);
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 transition-colors cursor-pointer"
                                        >
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                          Validar
                                        </button>
                                        {factura.origen === 'auto' && (
                                          <button
                                            onClick={() => {
                                              setSelectedFactura(factura);
                                              setOpenAproximarModal(true);
                                              setOpenMenuId(null);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-2 transition-colors cursor-pointer"
                                          >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                            </svg>
                                            Aproximar
                                          </button>
                                        )}
                                        <button
                                          onClick={() => {
                                            setSelectedFactura(factura);
                                            setOpenRechazarModal(true);
                                            setOpenMenuId(null);
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                                        >
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                          </svg>
                                          Rechazar
                                        </button>
                                      </>
                                    )}
                                    {(factura.estado === 'validada' || factura.estado === 'pendiente') && (
                                      <button
                                        onClick={() => {
                                          setSelectedFactura(factura);
                                          setOpenPagarModal(true);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                                        </svg>
                                        Pagar
                                      </button>
                                    )}
                                    <div className="border-t border-gray-100 my-1" />
                                    <button
                                      onClick={() => {
                                        setFacturaToDelete(factura);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <TrashIcon className="w-4 h-4" />
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="px-3 py-2 text-gray-400 text-xs italic">
                              Sin acciones
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-500 text-sm">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { if (!deletingUser) { setOpenDeleteUserModal(false); setDeleteUserHard(false); } }}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900">Eliminar cliente</h3>
              <p className="text-sm text-gray-700">
                ¿Seguro que deseas eliminar a <strong>{u.nombre} {u.apellido}</strong> ({u.telefono})?
              </p>
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                Por defecto se realiza un <strong>soft delete</strong> (el cliente se desactiva y conserva su historial).
                Activa &ldquo;borrado físico&rdquo; solo si necesitas eliminarlo permanentemente.
                <br />
                <strong>Cascada automática:</strong> se eliminarán también sus obligaciones, facturas, recargas y pagos.
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deleteUserHard}
                  onChange={(e) => setDeleteUserHard(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                Borrado físico (irreversible)
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  disabled={deletingUser}
                  onClick={() => { setOpenDeleteUserModal(false); setDeleteUserHard(false); }}
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
            <ValidarFacturaModal
              open={openValidarModal}
              onClose={() => { setOpenValidarModal(false); setOpenMenuId(null); setSelectedFactura(null); }}
              factura={selectedFactura}
              onSuccess={handleValidarSuccess}
              showToast={showToast}
            />

            <RechazarFacturaModal
              open={openRechazarModal}
              onClose={() => { setOpenRechazarModal(false); setOpenMenuId(null); setSelectedFactura(null); }}
              factura={selectedFactura}
              onSuccess={handleRechazarSuccess}
              showToast={showToast}
            />

            <AproximarValorModal
              open={openAproximarModal}
              onClose={() => { setOpenAproximarModal(false); setOpenMenuId(null); setSelectedFactura(null); }}
              factura={selectedFactura}
              onSuccess={handleAproximarSuccess}
              showToast={showToast}
            />

            <PagarFacturaModal
              open={openPagarModal}
              onClose={() => { setOpenPagarModal(false); setOpenMenuId(null); setSelectedFactura(null); }}
              factura={selectedFactura}
              perfil={perfil}
              onSuccess={handlePagarSuccess}
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
