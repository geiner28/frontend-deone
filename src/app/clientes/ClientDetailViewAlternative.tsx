'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
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
import { formatCurrency, formatDate } from '@/lib/utils';
import { getAdminClientePerfil, validarFactura, rechazarFactura } from '@/lib/api';
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
  options.push({ value: `${today_y}-${today_m}-01`, label: `📌 ${todayName.charAt(0).toUpperCase() + todayName.slice(1)} (Actual)` });
  
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

  // ─── FACTURA ACTION STATES ────────────────────────────────────────────────────
  const [expandedFacturaId, setExpandedFacturaId] = useState<string | null>(null);
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
  const handleValidarSuccess = useCallback(async () => {
    setOpenValidarModal(false);
    setExpandedFacturaId(null);
    setSelectedFactura(null);
    showToast('Factura validada correctamente', 'success');
    await refreshFacturas();
  }, [refreshFacturas]);

  // ─── HANDLER: Rechazar Factura ──────────────────────────────────────────────────
  const handleRechazarSuccess = useCallback(async () => {
    setOpenRechazarModal(false);
    setExpandedFacturaId(null);
    setSelectedFactura(null);
    showToast('Factura rechazada correctamente', 'success');
    await refreshFacturas();
  }, [refreshFacturas]);

  // ─── HANDLER: Pagar Factura ────────────────────────────────────────────────────
  const handlePagarSuccess = useCallback(async () => {
    setOpenPagarModal(false);
    setExpandedFacturaId(null);
    setSelectedFactura(null);
    showToast('Pago realizado correctamente', 'success');
    await refreshFacturas();
  }, [refreshFacturas]);
  // ─── HANDLER: Aproximar Valor ──────────────────────────────────────────────
  const handleAproximarSuccess = useCallback(async () => {
    setOpenAproximarModal(false);
    setExpandedFacturaId(null);
    setSelectedFactura(null);
    showToast('Valor aproximado correctamente', 'success');
    await refreshFacturas();
  }, [refreshFacturas]);
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', fontFamily: "'Inter', sans-serif" }}>
      {/* MAIN CONTENT - Sin sidebar, solo padding */}
      <main style={{ padding: '32px' }}>
        {/* BACK BUTTON + HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '24px' }}>
          {/* Back Button- Esquina Superior Izquierda */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <button
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                color: '#6b7280',
                fontSize: '16px',
                transition: 'all 0.2s',
                padding: 0,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
              title="Volver"
            >
              ←
            </button>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>Usuario</h1>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Detalles y gestión del cliente</p>
            </div>
          </div>

          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            disabled={isLoadingMonth}
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              padding: '8px 12px',
              borderRadius: '20px',
              fontSize: '14px',
              cursor: isLoadingMonth ? 'not-allowed' : 'pointer',
              color: '#111827',
              fontWeight: '500',
              transition: 'all 0.2s',
              opacity: isLoadingMonth ? 0.6 : 1,
            }}
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                📅 {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* USER CARD - 5 Secciones */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', display: 'flex', overflow: 'hidden', marginBottom: '24px' }}>
          {/* Section 1: Name & Balance */}
          <div style={{ padding: '20px', borderRight: '1px solid #e5e7eb', flex: 1, position: 'relative' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>
              {u.nombre} {u.apellido}
            </h2>
            <div style={{ fontSize: '24px', fontWeight: '500', display: 'flex', alignItems: 'baseline', gap: '4px', color: '#f58220' }}>
              {formatCurrency(r.saldo_disponible)}
              <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '400' }}>/ Saldo</span>
            </div>
          </div>

          {/* Section 2: Contact */}
          <div style={{ padding: '20px', borderRight: '1px solid #e5e7eb', flex: 1, position: 'relative' }}>
            <div 
              style={{ position: 'absolute', top: '16px', right: '16px', color: '#9ca3af', cursor: 'pointer', fontSize: '16px', opacity: 0.5, transition: 'opacity 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '0.5'}
              onClick={() => setOpenEditUserModal(true)}
            >
              <PencilIcon className="h-5 w-5" style={{ cursor: 'pointer' }} />
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>📱 {u.telefono}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>✉️ {u.correo || 'No registrado'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>📍 {u.direccion || 'No registrada'}</div>
            </div>
          </div>

          {/* Section 3: Plan */}
          <div style={{ padding: '20px', borderRight: '1px solid #e5e7eb', flex: 1, position: 'relative' }}>
            <div 
              style={{ position: 'absolute', top: '16px', right: '16px', color: '#9ca3af', cursor: 'pointer', fontSize: '16px', opacity: 0.5, transition: 'opacity 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '0.5'}
              onClick={() => setOpenPlanModal(true)}
            >
              <PencilIcon className="h-5 w-5" style={{ cursor: 'pointer' }} />
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>Plan</div>
            <div style={{ fontSize: '18px', color: getPlanColor(u.plan), marginBottom: '4px', fontWeight: '600' }}>
              {u.plan.charAt(0).toUpperCase() + u.plan.slice(1)}
            </div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
              {r.facturas_validadas_count_mes} Factura{r.facturas_validadas_count_mes !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Section 4: Fechas de Recarga/Grupos */}
          <div style={{ padding: '20px', borderRight: '1px solid #e5e7eb', flex: 1, position: 'relative' }}>
            <div 
              style={{ position: 'absolute', top: '16px', right: '16px', color: '#9ca3af', cursor: 'pointer', fontSize: '16px', opacity: 0.5, transition: 'opacity 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '0.5'}
              onClick={() => setOpenFechasRecargasModal(true)}
            >
              <PencilIcon className="h-5 w-5" style={{ cursor: 'pointer' }} />
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', display: 'block', fontWeight: '600' }}>Fechas de recarga</div>
            
            {/* Grupo 1 */}
            <div style={{ fontSize: '14px', marginBottom: '8px', color: '#111827' }}>
              <span style={{ color: '#3b82f6', fontWeight: '600' }}>Grupo 1</span>
              {perfil?.programacion_recargas?.dia_1 ? 
                ` - Día ${perfil.programacion_recargas.dia_1}` 
                : ' - —'
              }
            </div>
            <div style={{ fontSize: '14px', marginBottom: '8px', color: '#111827', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {formatCurrency(perfil?.cuotas_mes?.grupo1?.monto || 0)} 
              <span style={{ color: '#10b981', fontSize: '16px' }}>✓</span>
            </div>
            <div style={{ height: '12px' }} />
            
            {/* Grupo 2 - Mostrar solo si existe según programacion_recargas */}
            {perfil?.programacion_recargas?.cantidad_recargas === 2 && (
              <>
                <div style={{ fontSize: '14px', marginBottom: '8px', color: '#111827' }}>
                  <span style={{ color: '#3b82f6', fontWeight: '600' }}>Grupo 2</span>
                  {perfil?.programacion_recargas?.dia_2 ? ` - Día ${perfil.programacion_recargas.dia_2}` : ' - —'}
                </div>
                <div style={{ fontSize: '14px', marginBottom: '8px', color: '#111827', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {formatCurrency(perfil?.cuotas_mes?.grupo2?.monto || 0)} 
                  <span style={{ color: '#f59e0b', fontSize: '16px' }}>⚠</span>
                </div>
              </>
            )}
          </div>

          {/* Section 5: Quick Actions */}
          <div style={{ backgroundColor: '#1f222a', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '220px', flex: '0 0 220px', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '16px' }}>Acciones rápidas</h3>
            <button
              onClick={() => setOpenObligacionModal(true)}
              style={{
                background: 'transparent',
                border: '1px solid #4b5563',
                color: '#d1d5db',
                padding: '8px',
                borderRadius: '6px',
                marginBottom: '8px',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#6b7280';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#4b5563';
                e.currentTarget.style.color = '#d1d5db';
              }}
            >
              ➕ Agregar obligación
            </button>
            <button
              onClick={() => setOpenReportarRecargaModal(true)}
              style={{
                background: 'transparent',
                border: '1px solid #4b5563',
                color: '#d1d5db',
                padding: '8px',
                borderRadius: '6px',
                marginBottom: '0',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#6b7280';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#4b5563';
                e.currentTarget.style.color = '#d1d5db';
              }}
            >
              📝 Registrar recarga
            </button>
          </div>
        </div>

        {/* STATS GRID - 5 Cards (Mes actual) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>Total recargas</div>
            <div style={{ fontSize: '28px', fontWeight: '400', color: '#111827' }}>{formatCurrency(r.total_recargas_aprobadas_mes)}</div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>Total pagado</div>
            <div style={{ fontSize: '28px', fontWeight: '400', color: '#111827' }}>{formatCurrency(r.total_pagos_realizados_mes)}</div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>Total pendiente</div>
            <div style={{ fontSize: '28px', fontWeight: '400', color: '#111827' }}>{formatCurrency(r.total_pendiente_mes)}</div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>Saldo disponible</div>
            <div style={{ fontSize: '28px', fontWeight: '400', color: '#111827' }}>{formatCurrency(r.saldo_disponible)}</div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>Transacciones realizadas</div>
            <div style={{ fontSize: '28px', fontWeight: '400', color: '#111827' }}>{r.recargas_aprobadas_count_mes}</div>
          </div>
        </div>

        {/* TABS */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px 8px 0 0', background: 'white', borderBottom: 'none', display: 'flex', padding: '8px', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
          {(['todas', 'pagadas', 'pendientes', 'sin-validar'] as FacturaFilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: activeTab === tab ? 'white' : '#6b7280',
                cursor: 'pointer',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: activeTab === tab ? '#f58220' : 'transparent',
                whiteSpace: 'nowrap',
                border: 'none',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.backgroundColor = 'rgba(245, 130, 32, 0.1)';
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {tab === 'todas' && '📋'}
              {tab === 'pagadas' && '✓'}
              {tab === 'pendientes' && '⏳'}
              {tab === 'sin-validar' && '❓'}
              <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
              <span
                style={{
                  backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.3)' : '#e5e7eb',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: activeTab === tab ? 'white' : '#6b7280',
                  fontWeight: '500',
                }}
              >
                {getFacturaCountByTab(allFacturasMes, tab)}
              </span>
            </button>
          ))}
        </div>

        {/* TABLE */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0 0 8px 8px', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#1f222a', color: 'white' }}>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', width: '40px', textAlign: 'center' }}>
                  <input type="checkbox" style={{ cursor: 'pointer' }} />
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>Etiqueta</th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>Tipo de ref</th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>Número de ref</th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>Portal</th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>F. Emisión</th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>F. Vencimiento</th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>Monto</th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>Grupo</th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>Estado</th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody key={`tbody-${perfil?.programacion_recargas?.cantidad_recargas}-${selectedMonth}`}>
              {filteredFacturas.length > 0 ? (
                filteredFacturas.map((factura, idx) => {
                  const isExpanded = expandedFacturaId === factura.id;
                  // ✅ Detectar si es heredada y mostrar estado especial
                  let displayEstado = getEstadoBadgeContent(factura.estado);
                  if (factura.origen === 'auto' && factura.estado === 'extraida') {
                    displayEstado = 'Heredada (Sin validar)';
                  }
                  
                  return (
                    <tr
                      key={factura.id || `factura-${idx}`}
                      style={{
                        borderBottom: '1px solid #e5e7eb',
                        transition: 'background-color 0.2s',
                        cursor: 'pointer',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9f9fa';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '16px', fontSize: '13px', color: '#111827', textAlign: 'center' }}>
                        <input type="checkbox" style={{ cursor: 'pointer' }} />
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#111827', fontWeight: '500' }}>
                        {factura.etiqueta || '@—'}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#111827' }}>
                        {factura.referencia_pago ? 'N. de contrato' : '—'}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#111827' }}>
                        {factura.referencia_pago || '—'}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px' }}>
                        {factura.archivo_url ? (
                          <a href={factura.archivo_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
                            Link →
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#111827' }}>
                        {factura.fecha_emision ? formatDate(factura.fecha_emision) : '—'}
                      </td>
                      <td style={{
                        padding: '16px',
                        fontSize: '13px',
                        color: factura.fecha_vencimiento && new Date(factura.fecha_vencimiento) < new Date() ? '#f87171' : '#111827',
                        fontWeight: factura.fecha_vencimiento && new Date(factura.fecha_vencimiento) < new Date() ? '600' : '400',
                      }}>
                        {factura.fecha_vencimiento ? formatDate(factura.fecha_vencimiento) : '—'}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#111827', fontWeight: '500' }}>
                        {formatCurrency(factura.monto)}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#111827' }}>
                        {(() => {
                          // SIEMPRE calcular localmente basándose en cantidad_recargas
                          // NO confiar en factura.grupo del backend
                          const grupo = calcularGrupoFactura(
                            factura,
                            perfil?.cuotasCalculadas,
                            perfil?.programacion_recargas?.cantidad_recargas
                          );
                          
                          if (!grupo) {
                            return (
                              <span style={{ border: '1px solid #e5e7eb', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                                —
                              </span>
                            );
                          }
                          
                          return (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '700',
                              color: grupo === 1 ? '#6b7280' : '#ff8d2d',
                              backgroundColor: 'white',
                              border: `1px solid ${grupo === 1 ? '#d1d5db' : '#ff8d2d'}`,
                            }}>
                              {grupo}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            minWidth: '90px',
                            border: '1px solid',
                            backgroundColor: 'transparent',
                            whiteSpace: 'nowrap',
                            ...(factura.estado === 'pagada' && {
                              color: '#10b981',
                              borderColor: '#a7f3d0',
                              backgroundColor: '#ecfdf5',
                            }),
                            ...(factura.estado === 'pendiente' && {
                              color: '#f59e0b',
                              borderColor: '#fde68a',
                              backgroundColor: '#fffbeb',
                            }),
                            ...(factura.estado === 'extraida' && {
                              color: '#9ca3af',
                              borderColor: '#e5e7eb',
                              backgroundColor: '#f9fafb',
                            }),
                            ...(factura.estado === 'validada' && {
                              color: '#6366f1',
                              borderColor: '#c7d2fe',
                              backgroundColor: '#eef2ff',
                            }),
                            ...(factura.estado === 'rechazada' && {
                              color: '#ef4444',
                              borderColor: '#fecaca',
                              backgroundColor: '#fee2e2',
                            }),
                          }}
                        >
                          {displayEstado}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#111827', textAlign: 'center' }}>
                        {isExpanded ? (
                          // ─── EXPANDED: Show Action Buttons ─────────────────────────────
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                            {factura.estado === 'extraida' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedFactura(factura);
                                    setOpenValidarModal(true);
                                  }}
                                  disabled={actionLoading}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    backgroundColor: '#ff8d2d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                                    opacity: actionLoading ? 0.6 : 1,
                                    transition: 'all 0.2s ease',
                                  }}
                                  onMouseOver={(e) => {
                                    if (!actionLoading) {
                                      e.currentTarget.style.backgroundColor = '#ff7a0d';
                                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 141, 45, 0.3)';
                                    }
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#ff8d2d';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                  title="Validar esta factura"
                                >
                                  ✓ Validar
                                </button>
                                {/* Botón "Aproximar Valor" - Solo para heredadas */}
                                {factura.origen === 'auto' && (
                                  <button
                                    onClick={() => {
                                      setSelectedFactura(factura);
                                      setOpenAproximarModal(true);
                                    }}
                                    disabled={actionLoading}
                                    style={{
                                      padding: '6px 12px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      backgroundColor: '#8b5cf6',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                                      opacity: actionLoading ? 0.6 : 1,
                                      transition: 'all 0.2s ease',
                                    }}
                                    onMouseOver={(e) => {
                                      if (!actionLoading) {
                                        e.currentTarget.style.backgroundColor = '#7c3aed';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.3)';
                                      }
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = '#8b5cf6';
                                      e.currentTarget.style.boxShadow = 'none';
                                    }}
                                    title="Aproximar valor de factura heredada"
                                  >
                                    ↻ Aproximar
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedFactura(factura);
                                    setOpenRechazarModal(true);
                                  }}
                                  disabled={actionLoading}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                                    opacity: actionLoading ? 0.6 : 1,
                                    transition: 'all 0.2s ease',
                                  }}
                                  onMouseOver={(e) => {
                                    if (!actionLoading) {
                                      e.currentTarget.style.backgroundColor = '#dc2626';
                                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
                                    }
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#ef4444';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                  title="Rechazar esta factura"
                                >
                                  ✗ Rechazar
                                </button>
                              </>
                            )}
                            {(factura.estado === 'validada' || factura.estado === 'pendiente') && (
                              <button
                                onClick={() => {
                                  setSelectedFactura(factura);
                                  setOpenPagarModal(true);
                                }}
                                disabled={actionLoading}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  backgroundColor: '#ff8d2d',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                                  opacity: actionLoading ? 0.6 : 1,
                                  transition: 'all 0.2s ease',
                                }}
                                onMouseOver={(e) => {
                                  if (!actionLoading) {
                                    e.currentTarget.style.backgroundColor = '#ff7a0d';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 141, 45, 0.3)';
                                  }
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.backgroundColor = '#ff8d2d';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                                title="Pagar esta factura"
                              >
                                💰 Pagar
                              </button>
                            )}
                          </div>
                        ) : (
                          // ─── COLLAPSED: Show Pencil Icon ONLY if editable ─────────────────────────────
                          (factura.estado === 'extraida' || factura.estado === 'validada' || factura.estado === 'pendiente') && (
                            <button
                              onClick={() => {
                                if (expandedFacturaId !== factura.id) {
                                  setExpandedFacturaId(factura.id || null);
                                  setSelectedFactura(factura);
                                } else {
                                  setExpandedFacturaId(null);
                                  setSelectedFactura(null);
                                }
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '16px',
                                cursor: 'pointer',
                                color: '#9ca3af',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                transition: 'all 0.2s',
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.color = '#ff8d2d';
                                e.currentTarget.style.backgroundColor = 'rgba(255, 141, 45, 0.1)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.color = '#9ca3af';
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                              title="Editar acciones de factura"
                            >
                              ✎
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                    No hay facturas en esta categoría
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
            telefono: u.telefono,
            nombre: u.nombre,
            apellido: u.apellido,
            correo: u.correo,
            direccion: u.direccion,
          }}
          onSuccess={async () => {
            // Recargar los datos del perfil para actualizar la información personal
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

        {/* ─ FACTURA ACTION MODALS ─────────────────────────────────────────────── */}
        {selectedFactura && perfil && (
          <>
            <ValidarFacturaModal
              open={openValidarModal}
              onClose={() => setOpenValidarModal(false)}
              factura={selectedFactura}
              onSuccess={handleValidarSuccess}
              showToast={showToast}
            />

            <RechazarFacturaModal
              open={openRechazarModal}
              onClose={() => setOpenRechazarModal(false)}
              factura={selectedFactura}
              onSuccess={handleRechazarSuccess}
              showToast={showToast}
            />

            <AproximarValorModal
              open={openAproximarModal}
              onClose={() => setOpenAproximarModal(false)}
              factura={selectedFactura}
              onSuccess={handleAproximarSuccess}
              showToast={showToast}
            />

            <PagarFacturaModal
              open={openPagarModal}
              onClose={() => setOpenPagarModal(false)}
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
