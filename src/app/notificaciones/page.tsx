'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast, { ToastType } from '@/components/ui/Toast';
import { FullPageSpinner } from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import UserAccionesCard from '@/components/UserAccionesCard';
import { useNotifications } from '@/contexts/NotificationContext';
import ValidarFacturaModal from '@/components/modals/ValidarFacturaModal';
import RechazarFacturaModal from '@/components/modals/RechazarFacturaModal';
import AproximarValorModal from '@/components/modals/AproximarValorModal';
import AprobarRechazarRecargaModal from '@/components/modals/AprobarRechazarRecargaModal';
import {
  getAdminNotificaciones,
  getAdminNotificacionesEstadisticas,
  marcarNotificacionEnviada,
  marcarNotificacionesEnviadasBatch,
  generarNotificacionesMock,
  getAdminAlertasAdmin,
  getAdminNotificacionesAutomaticas,
  getAdminSolicitudOriginal,
  getAdminNotificacionesAcciones,
} from '@/lib/api';
import type { NotificacionAPI, Factura } from '@/types';
import { formatDateTime, getErrorMsg } from '@/lib/utils';
import {
  BellIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  UserIcon,
  ShieldCheckIcon,
  XMarkIcon,
  FunnelIcon,
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

type Tab = 'todas' | 'alertas' | 'acciones';

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

type DateFilterType = 'hoy' | 'semana' | 'mes' | 'custom';

interface DateFilter {
  type: DateFilterType;
  customDesde?: string;
  customHasta?: string;
}

const formatTipo = (tipo: string) =>
  tipo.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function NotificacionesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('todas');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  // Notificaciones simuladas del usuario
  const { notifications: simulated, markRead, markAllRead, clearAll } = useNotifications();
  const userNotifications = simulated.filter(n => n.target === 'usuario');
  const userUnread = userNotifications.filter(n => !n.read).length;
  
  // Filtros y búsqueda admin
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'mes' });
  const [searchUsuario, setSearchUsuario] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Datos para cada tab
  const [notificacionesTodas, setNotificacionesTodas] = useState<NotificacionConUsuario[]>([]);
  const [accionesData, setAccionesData] = useState<any>(null);
  const [alertas, setAlertas] = useState<NotificacionConUsuario[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  // Estado dinámico basado en la tab activa
  const getActiveData = () => {
    switch (activeTab) {
      case 'todas':
        return notificacionesTodas;
      case 'alertas':
        return alertas;
      case 'acciones':
        return accionesData?.acciones_por_usuario || [];
      default:
        return notificacionesTodas;
    }
  };

  const notificaciones = getActiveData();

  // Modales
  const [selectedNotif, setSelectedNotif] = useState<NotificacionConUsuario | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAlerta, setSelectedAlerta] = useState<NotificacionConUsuario | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [originalSolicitud, setOriginalSolicitud] = useState<any>(null);
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copyNotifId, setCopyNotifId] = useState<string | null>(null);

  // Modales para acciones (Facturas y Recargas)
  const [showValidarFacturaModal, setShowValidarFacturaModal] = useState(false);
  const [showRechazarFacturaModal, setShowRechazarFacturaModal] = useState(false);
  const [showAproximarValorModal, setShowAproximarValorModal] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [showAprobarRechazarModal, setShowAprobarRechazarModal] = useState(false);
  const [selectedRecargaUsuarioTelefono, setSelectedRecargaUsuarioTelefono] = useState<string>('');
  const [selectedRecargaId, setSelectedRecargaId] = useState<string | null>(null);

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  // Función para calcular desde/hasta basado en el filtro de fecha
  const getDateRange = (filter: DateFilter): { desde: string; hasta: string } => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    let desde: Date;
    
    switch (filter.type) {
      case 'hoy':
        desde = new Date(hoy);
        break;
      case 'semana':
        desde = new Date(hoy);
        desde.setDate(desde.getDate() - 7);
        break;
      case 'mes':
        desde = new Date(hoy);
        desde.setMonth(desde.getMonth() - 1); // Retroceder exactamente 1 mes
        break;
      case 'custom':
        if (!filter.customDesde) {
          desde = new Date(hoy);
          desde.setMonth(desde.getMonth() - 1);
        } else {
          desde = new Date(filter.customDesde);
        }
        break;
      default:
        desde = new Date(hoy);
    }
    
    const desdeStr = desde.toISOString().split('T')[0];
    const hastaStr = hoy.toISOString().split('T')[0];
    
    return { desde: desdeStr, hasta: hastaStr };
  };

  // Cargar datos admin - SIN searchUsuario (es solo búsqueda local)
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  // IMPORTANTE: searchUsuario NO está aquí porque el filtrado es 100% local en AccionesView
  // Solo recargamos cuando cambian filtros reales o tab
  useEffect(() => {
    loadData();
  }, [filterTipo, filterEstado, dateFilter, page, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log(`LOADING ${activeTab.toUpperCase()}:`, { page, limit });

      if (activeTab === 'todas') {
        const { desde, hasta } = getDateRange(dateFilter);
        await loadTodas(desde, hasta);
      } else if (activeTab === 'alertas') {
        const { desde, hasta } = getDateRange(dateFilter);
        await loadAlertas(desde, hasta);
      } else if (activeTab === 'acciones') {
        await loadAcciones();
      }
    } catch (err) {
      console.error('Error catch:', err);
      showToast('Error al cargar datos: ' + (err as any).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTodas = async (desde: string, hasta: string) => {
    const resNotifs = await getAdminNotificaciones({
      tipo: filterTipo || undefined,
      estado: filterEstado || undefined,
      desde,
      hasta,
      page,
      limit,
    });

    console.log('API RESPUESTA (Todas):', resNotifs);

    if (resNotifs.ok && resNotifs.data) {
      console.log('Notificaciones recibidas:', resNotifs.data.notificaciones?.length || 0);
      setNotificacionesTodas(resNotifs.data.notificaciones || []);
      setTotalPages(resNotifs.data.total_pages || 1);
    } else {
      console.log('Error en API:', resNotifs);
      showToast(getErrorMsg(resNotifs, 'Error cargando notificaciones'), 'error');
      setNotificacionesTodas([]);
    }

    // Estadísticas del período seleccionado
    const resStats = await getAdminNotificacionesEstadisticas({
      desde,
      hasta,
    });

    console.log('Estadísticas:', resStats);

    if (resStats.ok && resStats.data) {
      setEstadisticas(resStats.data.estadisticas);
    }
  };

  const loadAutomaticas = async (desde: string, hasta: string) => {
    // Esta función se mantiene por compatibilidad pero será reemplazada
    // La lógica de "acciones" está en loadAcciones()
  };

  const loadAcciones = async () => {
    // NO pasar searchUsuario como usuario_id (es solo para búsqueda local)
    // El filtrado por usuario se hace en el frontend dentro de AccionesView
    const res = await getAdminNotificacionesAcciones({
      page,
      limit,
    });

    console.log('API RESPUESTA (Acciones):', res);

    if (res.ok && res.data) {
      console.log('Acciones recibidas:', res.data.total_acciones);
      setAccionesData(res.data);
      setTotalPages(res.data.total_pages || 1);
    } else {
      console.log('Error en API:', res);
      showToast(getErrorMsg(res, 'Error cargando acciones'), 'error');
      setAccionesData(null);
    }
  };

  const loadAlertas = async (desde: string, hasta: string) => {
    const resNotifs = await getAdminAlertasAdmin({
      desde,
      hasta,
      page,
      limit,
    });

    console.log('API RESPUESTA (Alertas):', resNotifs);

    if (resNotifs.ok && resNotifs.data) {
      console.log('Alertas recibidas:', resNotifs.data.alertas?.length || 0);
      setAlertas(resNotifs.data.alertas || []);
      setTotalPages(resNotifs.data.total_pages || 1);
    } else {
      console.log('Error en API:', resNotifs);
      showToast(getErrorMsg(resNotifs, 'Error cargando alertas'), 'error');
      setAlertas([]);
    }
  };

  const handleCopyMessage = (notif: NotificacionConUsuario) => {
    const payload = notif.payload as any;
    const mensaje = (payload?.mensaje || payload?.mensaje_cobro || `Notificación: ${notif.tipo}`).toString();
    navigator.clipboard.writeText(mensaje);
    showToast('Mensaje copiado al portapapeles', 'success');
    setCopyNotifId(notif.id);
    setTimeout(() => setCopyNotifId(null), 2000);
  };

  const handleMarkSent = async (notifId: string) => {
    try {
      const res = await marcarNotificacionEnviada(notifId);
      if (res.ok) {
        showToast('Notificación marcada como enviada', 'success');
        setShowMarkModal(false);
        loadData();
      } else {
        showToast(getErrorMsg(res, 'Error marcando notificación'), 'error');
      }
    } catch (err) {
      showToast('Error al marcar notificación', 'error');
    }
  };

  const handleMarkBatch = async () => {
    if (selectedIds.size === 0) return;
    try {
      const res = await marcarNotificacionesEnviadasBatch(Array.from(selectedIds));
      if (res.ok) {
        showToast(`${res.data?.actualizadas || 0} notificaciones marcadas como enviadas`, 'success');
        setSelectedIds(new Set());
        loadData();
      } else {
        showToast(getErrorMsg(res, 'Error en operación batch'), 'error');
      }
    } catch (err) {
      showToast('Error en operación batch', 'error');
    }
  };

  const handleGenerarMock = async () => {
    try {
      setLoading(true);
      const res = await generarNotificacionesMock();
      if (res.ok) {
        showToast(`${res.data?.mensaje}`, 'success');
        setPage(1); // Volver a página 1
        await new Promise(r => setTimeout(r, 500)); // Pequeña pausa
        loadData();
      } else {
        showToast(getErrorMsg(res, 'Error generando datos de prueba'), 'error');
      }
    } catch (err) {
      showToast('Error al generar datos de prueba: ' + (err as any).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // FILTRO CLIENT-SIDE: Búsqueda de usuario (solo para 'todas')
  const notificacionesFiltradas = (activeTab === 'todas' && searchUsuario)
    ? notificaciones.filter((n: any) => {
        const notif = n as NotificacionConUsuario;
        const nombre = `${notif.usuarios?.nombre || ''} ${notif.usuarios?.apellido || ''}`.toLowerCase();
        const telefono = (notif.usuarios?.telefono || '').toLowerCase();
        const search = searchUsuario.toLowerCase();
        return nombre.includes(search) || telefono.includes(search);
      })
    : notificaciones;

  const currentNotifications = notificacionesFiltradas;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
        <p className="text-sm text-gray-500 mt-1">Gestiona alertas y notificaciones del sistema</p>
        <div className="h-px bg-gray-200 w-full mt-4" />
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex gap-1">
          <button
            onClick={() => { setActiveTab('todas'); setPage(1); setSearchUsuario(''); setFilterTipo(''); setFilterEstado(''); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'todas'
                ? 'bg-white text-orange-500 border border-orange-500'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Todas
            {notificacionesTodas.length > 0 && (
              <span className={`text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 ${
                activeTab === 'todas' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {notificacionesTodas.length > 99 ? '99+' : notificacionesTodas.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('alertas'); setPage(1); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'alertas'
                ? 'bg-white text-orange-500 border border-orange-500'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Alertas
            {alertas.length > 0 && (
              <span className={`text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 ${
                activeTab === 'alertas' ? 'bg-orange-500 text-white' : 'bg-red-100 text-red-600'
              }`}>
                {alertas.length > 99 ? '99+' : alertas.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('acciones'); setPage(1); setSearchUsuario(''); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'acciones'
                ? 'bg-white text-orange-500 border border-orange-500'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Acciones
            {(accionesData?.total_acciones || 0) > 0 && (
              <span className={`text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 ${
                activeTab === 'acciones' ? 'bg-orange-500 text-white' : 'bg-red-100 text-red-600'
              }`}>
                {accionesData?.total_acciones > 99 ? '99+' : accionesData?.total_acciones}
              </span>
            )}
          </button>
        </div>

        {/* Indicador de modo y acciones rápidas */}
        <div className="flex items-center gap-3 flex-wrap">
          {activeTab !== 'acciones' && (
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
              <label className="text-xs font-semibold text-gray-700">Período:</label>
              <select
                value={dateFilter.type}
                onChange={(e) => {
                  setDateFilter({ type: e.target.value as DateFilterType });
                  setPage(1);
                }}
                className="px-2 py-1 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 hover:border-orange-400 transition"
                title="Filtrar notificaciones por rango de fechas"
              >
                <option value="hoy">Últimas 24h</option>
                <option value="semana">Última semana</option>
                <option value="mes">Último mes</option>
              </select>
              {dateFilter.type === 'custom' && (
                <>
                  <input
                    type="date"
                    value={dateFilter.customDesde || ''}
                    onChange={(e) => {
                      setDateFilter({ ...dateFilter, customDesde: e.target.value });
                      setPage(1);
                    }}
                    className="px-2 py-1 text-sm border border-gray-200 rounded"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="date"
                    value={dateFilter.customHasta || ''}
                    onChange={(e) => {
                      setDateFilter({ ...dateFilter, customHasta: e.target.value });
                      setPage(1);
                    }}
                    className="px-2 py-1 text-sm border border-gray-200 rounded"
                  />
                </>
              )}
            </div>
          )}

          {selectedIds.size > 0 && activeTab === 'todas' && (
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
              <span className="text-sm font-medium text-blue-900">{selectedIds.size} seleccionadas</span>
              <Button
                size="sm"
                onClick={handleMarkBatch}
                title="Marca las notificaciones seleccionadas como enviadas"
              >
                <CheckIcon className="h-3.5 w-3.5" /> Marcar como enviadas
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Info banner */}
      {activeTab === 'alertas' && alertas.length === 0 && (
        <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700">
          No hay alertas activas. El sistema funciona correctamente.
        </div>
      )}

      {/* Estadísticas Admin con más info */}
      {activeTab === 'todas' && estadisticas && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Resumen del Período</h3>
            <button title="Las estadísticas se calculan por el período seleccionado" className="text-gray-400 hover:text-orange-500">
              <QuestionMarkCircleIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Total"
              value={estadisticas.total}
              highlight={estadisticas.total > 0}
            />
            <StatCard
              label="No Enviadas"
              value={estadisticas.no_enviadas}
              highlight={estadisticas.no_enviadas > 0}
              color="red"
            />
            <StatCard
              label="Enviadas"
              value={estadisticas.enviadas}
              color="green"
            />
            <StatCard
              label="Leídas"
              value={estadisticas.leidas}
              color="blue"
            />
          </div>
        </div>
      )}

      {/* Filtros */}
      {activeTab === 'todas' && (
        <div className="bg-gray-100 rounded-lg p-3">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            {/* Tipo filter */}
            <select
              id="filterTipo"
              value={filterTipo}
              onChange={(e) => { setFilterTipo(e.target.value); setPage(1); }}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label="Filtrar por tipo de notificación"
            >
              <option value="">Tipo: Todos</option>
              <option value="solicitud_recarga_inicio_mes">Inicio mes</option>
              <option value="solicitud_recarga">Solicitud recarga</option>
              <option value="recarga_aprobada">Recarga aprobada</option>
              <option value="recarga_rechazada">Recarga rechazada</option>
              <option value="factura_validada">Factura validada</option>
              <option value="pago_confirmado">Pago confirmado</option>
              <option value="alerta_admin">Alerta admin</option>
            </select>

            {/* Estado filter */}
            <select
              id="filterEstado"
              value={filterEstado}
              onChange={(e) => { setFilterEstado(e.target.value); setPage(1); }}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label="Filtrar por estado"
            >
              <option value="">Estado: Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="enviada">Enviada</option>
              <option value="leida">Leída</option>
            </select>

            {/* Clear filters */}
            {(filterTipo || filterEstado || searchUsuario) && (
              <button
                onClick={() => {
                  setFilterTipo('');
                  setFilterEstado('');
                  setSearchUsuario('');
                  setPage(1);
                }}
                className="px-4 py-2 bg-white border border-orange-500 text-orange-500 rounded-lg text-sm font-medium hover:bg-orange-50 flex items-center gap-2"
                title="Restablecer todos los filtros"
              >
                <XMarkIcon className="h-4 w-4" /> Limpiar filtros
              </button>
            )}

            {/* Search */}
            <div className="relative ml-auto w-[300px] flex-shrink-0">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono..."
                value={searchUsuario}
                onChange={(e) => { setSearchUsuario(e.target.value); setPage(1); }}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 pl-10"
              />
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      {loading ? (
        <FullPageSpinner />
      ) : activeTab === 'acciones' ? (
        <AccionesView
          accionesData={accionesData}
          onRefresh={() => loadData()}
          searchUsuario={searchUsuario}
          onSearchChange={setSearchUsuario}
          onShowToast={showToast}
          totalPages={totalPages}
          page={page}
          onPageChange={setPage}
          onOpenValidarFactura={(factura) => {
            setSelectedFactura(factura);
            setShowValidarFacturaModal(true);
          }}
          onOpenAprobarRecarga={(usuarioTelefono, recargaId) => {
            setSelectedRecargaUsuarioTelefono(usuarioTelefono);
            setSelectedRecargaId(recargaId || null);
            setShowAprobarRechazarModal(true);
          }}
          onOpenRechazarFactura={(factura) => {
            setSelectedFactura(factura);
            setShowRechazarFacturaModal(true);
          }}
          onOpenAproximarValor={(factura) => {
            setSelectedFactura(factura);
            setShowAproximarValorModal(true);
          }}
        />
      ) : currentNotifications.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            icon={<BellIcon className="h-6 w-6" />}
            title={searchUsuario ? "No hay resultados" : `Sin ${activeTab === 'alertas' ? 'alertas' : 'notificaciones'} para mostrar`}
            description={searchUsuario ? `No se encontraron resultados para "${searchUsuario}"` : "No hay notificaciones que coincidan con los filtros seleccionados."}
          />
          {activeTab === 'todas' && estadisticas && estadisticas.total > 0 && !searchUsuario && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900 mb-3">
                <strong>Tienes {estadisticas.total} notificaciones en la BD</strong>, pero no aparecen en la tabla. Esto sugiere:
              </p>
              <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                <li>Verifca que los filtros sean correctos (actualmente: {filterTipo || 'sin tipo'}, {filterEstado || 'sin estado'})</li>
                <li>Revisa la consola del navegador (F12) para ver los logs de depuración</li>
                <li>Comprueba que el API retorna datos en la estructura esperada</li>
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="px-4 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === currentNotifications.length && currentNotifications.length > 0}
                    onChange={() => {
                      if (selectedIds.size === currentNotifications.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(currentNotifications.map((n: any) => n.id)));
                      }
                    }}
                    aria-label="Seleccionar todas las notificaciones"
                    title="Seleccionar todas las notificaciones de esta página"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  <span className="flex items-center gap-1">Usuario <span className="text-xs">↕</span></span>
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  <span className="flex items-center gap-1">Tipo <span className="text-xs">↕</span></span>
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  <span className="flex items-center gap-1">Estado <span className="text-xs">↕</span></span>
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  <span className="flex items-center gap-1">Creada <span className="text-xs">↕</span></span>
                </th>
                <th className="px-4 py-3 text-left font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentNotifications.map((notif: any, idx: number) => {
                const notifTyped = notif as NotificacionConUsuario;
                return (
                  <tr key={notif.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.has(notif.id)} onChange={() => toggleSelect(notif.id)} /></td>
                    <td className="px-4 py-4">
                      {notifTyped.usuarios?.nombre ? (
                        <>
                          <p className="text-sm font-medium text-gray-900">{notifTyped.usuarios.nombre} {notifTyped.usuarios.apellido}</p>
                          <p className="text-xs text-gray-500">{notifTyped.usuarios.telefono}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-900">Administrador</p>
                          <p className="text-xs text-gray-400">Sistema</p>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Badge label={formatTipo(notifTyped.tipo)} variant="neutral" dot={false} />
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        label={notifTyped.estado}
                        variant={notifTyped.estado === 'pendiente' ? 'error' : notifTyped.estado === 'enviada' ? 'warning' : 'success'}
                        dot={false}
                      />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{formatDateTime(notifTyped.creado_en)}</td>
                    <td className="px-4 py-4 text-left">
                    <div className="flex items-center justify-start gap-1">
                      {activeTab === 'alertas' ? (
                        // Acciones para alertas
                        <>
                          <button
                            onClick={async () => {
                              setSelectedAlerta(notifTyped);
                              setShowAlertModal(true);
                              setLoadingOriginal(true);
                              try {
                                const res = await getAdminSolicitudOriginal(notif.id);
                                if (res.ok && res.data) {
                                  setOriginalSolicitud(res.data.solicitud_original);
                                } else {
                                  showToast('Error cargando solicitud original', 'error');
                                }
                              } catch (err) {
                                showToast('Error cargando solicitud original', 'error');
                              } finally {
                                setLoadingOriginal(false);
                              }
                            }}
                            className="p-2 text-red-400 hover:text-red-600 rounded hover:bg-red-50 transition-all"
                            aria-label={`Ver alerta para ${notifTyped.usuarios?.nombre}`}
                            title="Ver alerta y solicitud original"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const res = await getAdminSolicitudOriginal(notif.id);
                                if (res.ok && res.data && res.data.solicitud_original) {
                                  const mensaje = (res.data.solicitud_original.payload as any)?.mensaje || `Notificación: ${res.data.solicitud_original.tipo}`;
                                  navigator.clipboard.writeText(mensaje);
                                  showToast('Mensaje copiado al portapapeles', 'success');
                                  setCopyNotifId(notif.id);
                                  setTimeout(() => setCopyNotifId(null), 2000);
                                }
                              } catch (err) {
                                showToast('Error al copiar mensaje', 'error');
                              }
                            }}
                            className={`p-2 rounded transition-all ${copyNotifId === notif.id ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-orange-500 hover:bg-gray-100'}`}
                            title="Copiar mensaje original para reenviar"
                          >
                            <ClipboardDocumentIcon className="h-4 w-4" />
                          </button>
                          {notifTyped.estado === 'pendiente' && (
                            <button
                              onClick={() => { setSelectedNotif(notifTyped); setShowMarkModal(true); }}
                              className="p-2 text-gray-400 hover:text-orange-500 rounded hover:bg-gray-100 transition-all"
                              title="Registra que ya enviaste esta alerta"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      ) : (
                        // Acciones para otras notificaciones de admin
                        <>
                          <button
                            onClick={() => { setSelectedNotif(notifTyped); setShowDetailsModal(true); }}
                            className="p-2 text-gray-400 hover:text-orange-500 rounded hover:bg-gray-100 transition-all"
                            aria-label={`Ver detalles de ${notifTyped.tipo} para ${notifTyped.usuarios?.nombre}`}
                            title="Ver contenido completo de la notificación"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {notifTyped.estado === 'pendiente' && (
                            <>
                              <button
                                onClick={() => handleCopyMessage(notifTyped)}
                                className={`p-2 rounded transition-all ${copyNotifId === notif.id ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-orange-500 hover:bg-gray-100'}`}
                                aria-label={`Copiar contenido de ${notifTyped.tipo}`}
                                title="Copia el contenido para enviarlo manualmente (Ctrl+C)"
                              >
                                <ClipboardDocumentIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => { setSelectedNotif(notifTyped); setShowMarkModal(true); }}
                                className="p-2 text-gray-400 hover:text-orange-500 rounded hover:bg-gray-100 transition-all"
                                aria-label={`Marcar como enviada ${notifTyped.tipo}`}
                                title="Registra que ya enviaste esta notificación"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {totalPages > 1 && (
            <div className="bg-white border-t border-gray-200 px-4 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Página {page} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Detalles de Notificación */}
      <Modal
        open={showDetailsModal && !!selectedNotif}
        onClose={() => setShowDetailsModal(false)}
        title="Detalles de Notificación"
        maxWidth="md"
      >
        {selectedNotif && (
          <div className="space-y-4 p-5">
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1.5">Tipo</p>
              <p className="font-medium text-gray-900">{formatTipo(selectedNotif.tipo)}</p>
            </div>

            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1.5">Usuario</p>
              {selectedNotif.usuarios?.nombre ? (
                <>
                  <p className="font-medium text-gray-900">{selectedNotif.usuarios.nombre} {selectedNotif.usuarios.apellido}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedNotif.usuarios.telefono}</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-gray-900">Administrador</p>
                  <p className="text-xs text-gray-400 mt-0.5">Sistema</p>
                </>
              )}
            </div>

            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1.5">Estado</p>
              <Badge
                label={selectedNotif.estado}
                variant={selectedNotif.estado === 'pendiente' ? 'error' : selectedNotif.estado === 'enviada' ? 'warning' : 'success'}
                dot={false}
              />
            </div>

            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1.5">Creada</p>
              <p className="text-xs text-gray-900">{formatDateTime(selectedNotif.creado_en)}</p>
            </div>

            {selectedNotif.payload && (
              <div className="border-t pt-4">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">Contenido</p>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                  <code className="text-xs text-gray-700 whitespace-pre-wrap break-words font-mono leading-relaxed">
                    {((selectedNotif.payload as any)?.mensaje ||
                      (selectedNotif.payload as any)?.mensaje_cobro ||
                      JSON.stringify(selectedNotif.payload, null, 2)) as unknown as string}
                  </code>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <Button size="sm" variant="secondary" onClick={() => setShowDetailsModal(false)}>
                Cerrar
              </Button>
              {selectedNotif.estado === 'pendiente' && (
                <Button
                  size="sm"
                  onClick={() => {
                    handleCopyMessage(selectedNotif);
                  }}
                  title="Copia el contenido del mensaje para enviarlo manualmente"
                >
                  <ClipboardDocumentIcon className="h-4 w-4" /> Copiar Contenido
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Confirmar Envío */}
      <Modal
        open={showMarkModal && !!selectedNotif}
        onClose={() => setShowMarkModal(false)}
        title="Registrar Envío Manual"
        maxWidth="sm"
      >
        {selectedNotif && (
          <div className="space-y-4 p-5">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-medium">
                Confirma que <strong>ya enviaste</strong> esta notificación a {' '}
                <strong>{selectedNotif.usuarios?.nombre ? `${selectedNotif.usuarios.nombre} ${selectedNotif.usuarios.apellido}` : 'Administrador'}</strong>
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Notificación</p>
              <div>
                <p className="text-sm font-medium text-gray-900">{formatTipo(selectedNotif.tipo)}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(selectedNotif.creado_en)}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-900">
                Este registro es <strong>auditable</strong> y quedará documentado en el sistema.
              </p>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button size="sm" variant="secondary" onClick={() => setShowMarkModal(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => handleMarkSent(selectedNotif.id)}
                title="Marca la notificación como enviada (acción auditable)"
              >
                <CheckIcon className="h-4 w-4" /> Sí, Marcar Enviada
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal para detalles de alerta con solicitud original */}
      <Modal
        open={showAlertModal && !!selectedAlerta}
        onClose={() => {
          setShowAlertModal(false);
          setSelectedAlerta(null);
          setOriginalSolicitud(null);
        }}
        title="Detalles de Alerta"
        maxWidth="md"
      >
        {selectedAlerta && (
          <div className="space-y-4 p-5">
            {/* Alert Info */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-900">Alerta crítica</p>
                  <p className="text-xs text-red-800 mt-1">
                    {(selectedAlerta.payload as any)?.tipo_alerta || 'Usuario no respondió a solicitud'}
                  </p>
                </div>
              </div>
            </div>

            {/* Alert Payload */}
            {selectedAlerta.payload && (
              <div className="space-y-2">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Detalles</p>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Usuario:</span>{' '}
                    <span className="text-gray-900">{(selectedAlerta.payload as any)?.usuario_nombre}</span>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Teléfono:</span>{' '}
                    <span className="text-gray-900">{(selectedAlerta.payload as any)?.usuario_telefono}</span>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Días sin respuesta:</span>{' '}
                    <span className="text-red-600 font-bold">{(selectedAlerta.payload as any)?.dias_sin_respuesta || 'N/A'}</span>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Creada:</span>{' '}
                    <span className="text-gray-900">{formatDateTime(selectedAlerta.creado_en)}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Original Solicitud */}
            {loadingOriginal && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-5 w-5 text-orange-500" />
              </div>
            )}

            {originalSolicitud && !loadingOriginal && (
              <div className="space-y-2">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Solicitud Original que desencadenó esta alerta</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <p className="font-medium text-blue-900">{formatTipo(originalSolicitud.tipo)}</p>
                  <p className="text-sm text-blue-800">{(originalSolicitud.payload as any)?.mensaje || 'Ver contenido de la solicitud'}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setShowAlertModal(false);
                  setSelectedAlerta(null);
                  setOriginalSolicitud(null);
                }}
              >
                Cerrar
              </Button>
              {originalSolicitud && (
                <Button
                  size="sm"
                  onClick={() => {
                    const mensaje = (originalSolicitud.payload as any)?.mensaje || `Notificación: ${originalSolicitud.tipo}`;
                    navigator.clipboard.writeText(mensaje);
                    showToast('Mensaje original copiado', 'success');
                  }}
                  title="Copia el mensaje original para reenviar"
                >
                  <ClipboardDocumentIcon className="h-4 w-4" /> Copiar Original
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Validar Factura */}
      <ValidarFacturaModal
        open={showValidarFacturaModal}
        factura={selectedFactura}
        onClose={() => {
          setShowValidarFacturaModal(false);
          setSelectedFactura(null);
        }}
        onSuccess={async () => {
          await loadData();
        }}
        showToast={showToast}
      />

      {/* Modal: Rechazar Factura */}
      <RechazarFacturaModal
        open={showRechazarFacturaModal}
        factura={selectedFactura}
        onClose={() => {
          setShowRechazarFacturaModal(false);
          setSelectedFactura(null);
        }}
        onSuccess={async () => {
          await loadData();
        }}
        showToast={showToast}
      />

      {/* Modal: Aproximar Valor */}
      <AproximarValorModal
        open={showAproximarValorModal}
        factura={selectedFactura}
        onClose={() => {
          setShowAproximarValorModal(false);
          setSelectedFactura(null);
        }}
        onSuccess={async () => {
          await loadData();
        }}
        showToast={showToast}
      />

      {/* Modal: Aprobar/Rechazar Recarga - para Tab ACCIONES */}
      <AprobarRechazarRecargaModal
        open={showAprobarRechazarModal}
        telefono={selectedRecargaUsuarioTelefono}
        recargaId={selectedRecargaId}
        onClose={() => {
          setShowAprobarRechazarModal(false);
          setSelectedRecargaUsuarioTelefono('');
          setSelectedRecargaId(null);
        }}
        onSuccess={async () => {
          await loadData();
        }}
        showToast={showToast}
      />
    </div>
  );
}

/**
 * Componente AccionesView
 * Muestra acciones pendientes (validaciones de facturas y recargas) agrupadas por usuario
 */
interface AccionesViewProps {
  accionesData: any;
  onRefresh: () => void;
  searchUsuario: string;
  onSearchChange: (search: string) => void;
  onShowToast: (msg: string, type: ToastType) => void;
  totalPages: number;
  page: number;
  onPageChange: (page: number) => void;
  onOpenValidarFactura: (factura: Factura) => void;
  onOpenRechazarFactura: (factura: Factura) => void;
  onOpenAproximarValor: (factura: Factura) => void;
  onOpenAprobarRecarga: (usuarioTelefono: string, recargaId?: string) => void;
}

function AccionesView({
  accionesData,
  onRefresh,
  searchUsuario,
  onSearchChange,
  onShowToast,
  totalPages,
  page,
  onPageChange,
  onOpenValidarFactura,
  onOpenRechazarFactura,
  onOpenAproximarValor,
  onOpenAprobarRecarga,
}: AccionesViewProps) {
  // AccionesView no necesita estado local ahora, los parámetros se pasan directamente
  if (!accionesData || !accionesData.acciones_por_usuario) {
    return (
      <EmptyState
        icon={<BellIcon className="h-6 w-6" />}
        title="Sin acciones pendientes"
        description="No hay validaciones pendientes en este momento. ¡Buen trabajo!"
      />
    );
  }

  const { acciones_por_usuario, total_acciones, total_usuarios } = accionesData;

  return (
    <div className="space-y-6">
      {/* Resumen y controles */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-gray-900">
            {total_acciones} {total_acciones === 1 ? 'acción' : 'acciones'} pendiente{total_acciones !== 1 ? 's' : ''}
          </h3>
          <span className="text-sm text-gray-500">en {total_usuarios} {total_usuarios === 1 ? 'usuario' : 'usuarios'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar usuario..."
            value={searchUsuario}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-48"
          />
          <Button
            size="sm"
            onClick={onRefresh}
            title="Actualizar acciones (no usa auto-refresh)"
          >
            <ArrowPathIcon className="h-4 w-4" /> Actualizar
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700 space-y-2">
        <p>
          <strong>Cómo funciona:</strong> Las acciones muestran facturas y recargas pendientes de validación. 
          Haz click en "Validar" o "Revisar" para abrir el modal correspondiente. No hay auto-refresh; 
          usa el botón "Actualizar" cuando necesites refrescar los datos.
        </p>
        <p className="text-xs text-blue-600">
          Busca por usuario para filtrar, pero recuerda que la búsqueda es temporal. 
          Después de validar/aprobar, refresca manualmente para ver cambios.
        </p>
      </div>

      {/* Acciones por usuario - CON FILTRADO Y ACORDEONES POR USUARIO */}
      {(() => {
        // Filtrar por búsqueda de usuario si existe
        const filteredAcciones = searchUsuario
          ? acciones_por_usuario.filter((item: any) => {
              const nombre = `${item.usuario.nombre || ''} ${item.usuario.apellido || ''}`.toLowerCase();
              const telefono = (item.usuario.telefono || '').toLowerCase();
              const search = searchUsuario.toLowerCase();
              return nombre.includes(search) || telefono.includes(search);
            })
          : acciones_por_usuario;

        return filteredAcciones.length === 0 ? (
          <EmptyState
            icon={<CheckIcon className="h-6 w-6 text-green-600" />}
            title={searchUsuario ? "Sin resultados" : "¡Todo al día!"}
            description={searchUsuario 
              ? `No se encontraron usuarios que coincidan con "${searchUsuario}"` 
              : "No hay validaciones pendientes. Todas las facturas y recargas han sido revisadas."}
          />
        ) : (
          <div className="space-y-4">
            {filteredAcciones.map((item: any) => {
              // Agrupar acciones del usuario por tipo - USANDO ORIGEN COMO DIFERENCIADOR
              const recargasUsuario = item.acciones.filter((a: any) => a.tipo === 'recarga');
              const facturasUsuario = item.acciones.filter((a: any) => a.tipo === 'factura' && a.origen !== 'auto');
              const facturasHeredadasUsuario = item.acciones.filter((a: any) => a.tipo === 'factura' && a.origen === 'auto');

              return (
                <UserAccionesCard
                  key={item.usuario_id}
                  usuario={item.usuario}
                  recargasUsuario={recargasUsuario}
                  facturasUsuario={facturasUsuario}
                  facturasHeredadasUsuario={facturasHeredadasUsuario}
                  onOpenValidarFactura={onOpenValidarFactura}
                  onOpenRechazarFactura={onOpenRechazarFactura}
                  onOpenAproximarValor={onOpenAproximarValor}
                  onOpenAprobarRecarga={onOpenAprobarRecarga}
                  onShowToast={onShowToast}
                />
              );
            })}
          </div>
        );
      })()}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 p-4 border-t">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-600">Página {page} de {totalPages}</span>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
  color = 'gray',
}: {
  label: string;
  value: number;
  highlight?: boolean;
  color?: 'red' | 'green' | 'blue' | 'gray';
}) {
  const colorClass = {
    red: 'text-red-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
    gray: 'text-gray-900',
  }[color];

  return (
    <Card className={`!p-4 ${highlight ? 'border-2 border-orange-500' : ''}`}>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{label}</p>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      </div>
    </Card>
  );
}
