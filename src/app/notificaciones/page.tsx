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
import { useNotifications } from '@/contexts/NotificationContext';
import {
  getAdminNotificaciones,
  getAdminNotificacionesEstadisticas,
  marcarNotificacionEnviada,
  marcarNotificacionesEnviadasBatch,
  generarNotificacionesMock,
} from '@/lib/api';
import type { NotificacionAPI } from '@/types';
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
  ArrowRightIcon,
  TrashIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

type Tab = 'admin' | 'usuario';

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

const TIPO_ICONS: Record<string, string> = {
  'solicitud_recarga_inicio_mes': '📱',
  'solicitud_recarga': '💳',
  'recarga_aprobada': '✅',
  'recarga_rechazada': '❌',
  'recarga_confirmada': '🎉',
  'factura_validada': '📄',
  'factura_rechazada': '⚠️',
  'pago_confirmado': '💰',
  'obligacion_completada': '🏁',
  'recordatorio_recarga': '🔔',
  'alerta_admin': '🚨',
};

export default function NotificacionesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('admin');
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

  // Datos admin
  const [notificaciones, setNotificaciones] = useState<NotificacionConUsuario[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  // Modales
  const [selectedNotif, setSelectedNotif] = useState<NotificacionConUsuario | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copyNotifId, setCopyNotifId] = useState<string | null>(null);

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

  // Cargar datos admin
  useEffect(() => {
    if (activeTab === 'admin') loadData();
  }, [filterTipo, filterEstado, dateFilter, searchUsuario, page, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { desde, hasta } = getDateRange(dateFilter);
      console.log('📊 LOADING NOTIFICACIONES:', { filterTipo, filterEstado, desde, hasta, page, limit });

      const resNotifs = await getAdminNotificaciones({
        tipo: filterTipo || undefined,
        estado: filterEstado || undefined,
        desde,
        hasta,
        page,
        limit,
      });

      console.log('📨 API RESPUESTA:', resNotifs);

      if (resNotifs.ok && resNotifs.data) {
        console.log('✅ Notificaciones recibidas:', resNotifs.data.notificaciones?.length || 0, resNotifs.data);
        setNotificaciones(resNotifs.data.notificaciones || []);
        setTotalPages(resNotifs.data.total_pages || 1);
      } else {
        console.log('❌ Error en API:', resNotifs);
        showToast(getErrorMsg(resNotifs, 'Error cargando notificaciones'), 'error');
        setNotificaciones([]);
      }

      // Estadísticas del período seleccionado
      const resStats = await getAdminNotificacionesEstadisticas({
        desde,
        hasta,
      });

      console.log('📈 Estadísticas:', resStats);

      if (resStats.ok && resStats.data) {
        setEstadisticas(resStats.data.estadisticas);
      }
    } catch (err) {
      console.error('❌ Error catch:', err);
      showToast('Error al cargar datos: ' + (err as any).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (notif: NotificacionConUsuario) => {
    const payload = notif.payload as any;
    const mensaje = (payload?.mensaje || payload?.mensaje_cobro || `Notificación: ${notif.tipo}`).toString();
    navigator.clipboard.writeText(mensaje);
    showToast('✓ Mensaje copiado al portapapeles', 'success');
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
        showToast(`✅ ${res.data?.mensaje}`, 'success');
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

  // FILTRO CLIENT-SIDE: Búsqueda de usuario
  const notificacionesFiltradas = searchUsuario
    ? notificaciones.filter(n => {
        const nombre = `${n.usuarios?.nombre || ''} ${n.usuarios?.apellido || ''}`.toLowerCase();
        const telefono = (n.usuarios?.telefono || '').toLowerCase();
        const search = searchUsuario.toLowerCase();
        return nombre.includes(search) || telefono.includes(search);
      })
    : notificaciones;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Tabs con indicadores visuales */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex bg-white rounded-xl border border-[#e5e7eb] p-1 shadow-sm">
          <TabButton
            active={activeTab === 'admin'}
            onClick={() => { setActiveTab('admin'); setPage(1); setSearchUsuario(''); setFilterTipo(''); setFilterEstado(''); }}
            icon={<ShieldCheckIcon className="h-4 w-4" />}
            label="Administrador"
            count={estadisticas?.no_enviadas || 0}
            description="Gestión profesional desde BD"
          />
          <TabButton
            active={activeTab === 'usuario'}
            onClick={() => setActiveTab('usuario')}
            icon={<UserIcon className="h-4 w-4" />}
            label="Usuario (Simuladas)"
            count={userUnread}
            description="Notificaciones de prueba"
          />
        </div>

        {/* Indicador de modo y acciones rápidas */}
        <div className="flex items-center gap-3 flex-wrap">
          {activeTab === 'admin' && (
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
              <label className="text-xs font-semibold text-gray-700">Período:</label>
              <select
                value={dateFilter.type}
                onChange={(e) => {
                  setDateFilter({ type: e.target.value as DateFilterType });
                  setPage(1);
                }}
                className="px-2 py-1 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#ff8d2d]/50 hover:border-[#ff8d2d] transition"
                title="Filtrar notificaciones por rango de fechas"
              >
                <option value="hoy">📅 Hoy</option>
                <option value="semana">📆 Última semana</option>
                <option value="mes">📋 Último mes</option>
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

          {activeTab === 'admin' && selectedIds.size > 0 && (
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

          {activeTab === 'usuario' && userUnread > 0 && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => markAllRead('usuario')} title="Marca todas como leídas">
                <CheckIcon className="h-3.5 w-3.5" /> Leer todas
              </Button>
              <Button size="sm" variant="ghost" onClick={() => clearAll('usuario')} title="Elimina todas las notificaciones simuladas">
                <TrashIcon className="h-3.5 w-3.5" /> Limpiar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Info banner */}
      {activeTab === 'usuario' && (
        <div className="rounded-xl bg-purple-50 border border-purple-100 px-4 py-3 text-sm text-purple-700">
          💡 Estas son las <strong>notificaciones que recibiría el usuario</strong> tras cada acción del admin.
        </div>
      )}

      {/* Estadísticas Admin con más info */}
      {activeTab === 'admin' && estadisticas && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-[#1d212b]">Resumen del Mes</h3>
            <button title="Las estadísticas se calculan por el período del mes actual" className="text-gray-400 hover:text-[#ff8d2d]">
              <QuestionMarkCircleIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Total"
              value={estadisticas.total}
              highlight={estadisticas.total > 0}
              icon="📊"
            />
            <StatCard
              label="No Enviadas"
              value={estadisticas.no_enviadas}
              highlight={estadisticas.no_enviadas > 0}
              color="red"
              icon="📤"
            />
            <StatCard
              label="Enviadas"
              value={estadisticas.enviadas}
              color="green"
              icon="✅"
            />
            <StatCard
              label="Leídas"
              value={estadisticas.leidas}
              color="blue"
              icon="👁️"
            />
          </div>
        </div>
      )}

      {/* Panel de Filtros mejorado */}
      {activeTab === 'admin' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <FunnelIcon className="h-4 w-4 text-[#6d7382]" />
            <h3 className="text-sm font-semibold text-[#1d212b]">Filtros Avanzados</h3>
            <span className="text-xs text-gray-500">
              ({notificaciones.length} resultados)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 bg-white p-4 rounded-xl border border-[#e5e7eb]">
            {/* Filtro: Tipo */}
            <div className="flex flex-col gap-1">
              <label htmlFor="filterTipo" className="text-xs font-semibold text-gray-700">
                Tipo de Notificación
              </label>
              <select
                id="filterTipo"
                value={filterTipo}
                onChange={(e) => { setFilterTipo(e.target.value); setPage(1); }}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#ff8d2d]/50 hover:border-[#ff8d2d] transition"
                aria-label="Filtrar por tipo de notificación"
              >
                <option value="">Todos los tipos</option>
                <option value="solicitud_recarga_inicio_mes">📱 Inicio mes</option>
                <option value="solicitud_recarga">💳 Solicitud recarga</option>
                <option value="recarga_aprobada">✅ Recarga aprobada</option>
                <option value="recarga_rechazada">❌ Recarga rechazada</option>
                <option value="factura_validada">📄 Factura validada</option>
                <option value="pago_confirmado">💰 Pago confirmado</option>
                <option value="alerta_admin">🚨 Alerta admin</option>
              </select>
            </div>

            {/* Filtro: Estado */}
            <div className="flex flex-col gap-1">
              <label htmlFor="filterEstado" className="text-xs font-semibold text-gray-700">
                Estado
              </label>
              <select
                id="filterEstado"
                value={filterEstado}
                onChange={(e) => { setFilterEstado(e.target.value); setPage(1); }}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#ff8d2d]/50 hover:border-[#ff8d2d] transition"
                aria-label="Filtrar por estado"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">📤 Pendiente (no enviada)</option>
                <option value="enviada">✉️ Enviada</option>
                <option value="leida">👁️ Leída</option>
              </select>
            </div>

            {/* Búsqueda */}
            <div className="flex flex-col gap-1 lg:col-span-2">
              <label htmlFor="searchUsuario" className="text-xs font-semibold text-gray-700">
                Buscar Usuario
              </label>
              <Input
                id="searchUsuario"
                placeholder="Nombre, teléfono..."
                value={searchUsuario}
                onChange={(e) => { setSearchUsuario(e.target.value); setPage(1); }}
                className="w-full"
              />
            </div>
          </div>

          {/* Botón limpiar filtros solo si hay activos */}
          {(filterTipo || filterEstado || searchUsuario) && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">
                {(filterTipo ? 1 : 0) + (filterEstado ? 1 : 0) + (searchUsuario ? 1 : 0)} filtro(s) activo(s)
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFilterTipo('');
                  setFilterEstado('');
                  setSearchUsuario('');
                  setPage(1);
                }}
                title="Restablecer todos los filtros"
              >
                <XMarkIcon className="h-4 w-4" /> Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Contenido principal */}
      {activeTab === 'usuario' ? (
        userNotifications.length === 0 ? (
          <div className="space-y-4">
            <EmptyState
              icon={<BellIcon className="h-6 w-6" />}
              title="Sin notificaciones simuladas"
              description="Las notificaciones del usuario aparecerán aquí al realizar operaciones en el sistema."
            />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Cómo generar simuladas:</strong> Realiza operaciones como crear clientes, registrar recargas, validar facturas, etc., y aparecerán aquí automáticamente en el tab "Usuario".
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 stagger-children">
            {userNotifications.map((n) => (
              <Card
                key={n.id}
                className={`!p-0 overflow-hidden transition-all cursor-pointer hover:shadow-md ${
                  n.read ? 'opacity-70' : ''
                }`}
              >
                <div
                  className="flex gap-4 px-5 py-4"
                  onClick={() => {
                    if (!n.read) markRead(n.id);
                    if (n.actionUrl) window.location.href = n.actionUrl;
                  }}
                >
                  <div className="text-2xl leading-none mt-0.5 shrink-0">
                    {n.title.split(' ')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-[#1d212b]">
                        {n.title.split(' ').slice(1).join(' ')}
                      </p>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-[#ff8d2d]" />}
                    </div>
                    <p className="text-xs text-gray-600">{n.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-gray-400">{formatDateTime(n.timestamp)}</span>
                      <Badge label={n.type.replace(/_/g, ' ')} variant="neutral" dot={false} />
                    </div>
                  </div>
                  {n.actionLabel && <ArrowRightIcon className="h-4 w-4 text-[#ff8d2d]" />}
                </div>
              </Card>
            ))}
          </div>
        )
      ) : loading ? (
        <FullPageSpinner />
      ) : notificacionesFiltradas.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            icon={<BellIcon className="h-6 w-6" />}
            title={searchUsuario ? "No hay resultados" : "Sin notificaciones para mostrar"}
            description={searchUsuario ? `No se encontraron resultados para "${searchUsuario}"` : "No hay notificaciones que coincidan con los filtros seleccionados."}
          />
          {estadisticas && estadisticas.total > 0 && !searchUsuario && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900 mb-3">
                <strong>ℹ️ Tienes {estadisticas.total} notificaciones en la BD</strong>, pero no aparecen en la tabla. Esto sugiere:
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
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#1d212b] text-white sticky top-0 z-10">
              <tr>
                <th className="p-4 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === notificacionesFiltradas.length && notificacionesFiltradas.length > 0}
                    onChange={() => {
                      if (selectedIds.size === notificacionesFiltradas.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(notificacionesFiltradas.map(n => n.id)));
                      }
                    }}
                    aria-label="Seleccionar todas las notificaciones"
                    title="Seleccionar todas las notificaciones de esta página"
                  />
                </th>
                <th className="p-4 text-left font-medium">Usuario</th>
                <th className="p-4 text-left font-medium">Tipo</th>
                <th className="p-4 text-left font-medium">Estado</th>
                <th className="p-4 text-left font-medium">Creada</th>
                <th className="p-4 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {notificacionesFiltradas.map((notif) => (
                <tr key={notif.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="p-4"><input type="checkbox" checked={selectedIds.has(notif.id)} onChange={() => toggleSelect(notif.id)} /></td>
                  <td className="p-4">
                    <p className="text-sm font-medium">{notif.usuarios?.nombre} {notif.usuarios?.apellido}</p>
                    <p className="text-xs text-gray-500">{notif.usuarios?.telefono}</p>
                  </td>
                  <td className="p-4">
                    <Badge label={`${TIPO_ICONS[notif.tipo] || '📋'} ${notif.tipo}`} variant="neutral" dot={false} />
                  </td>
                  <td className="p-4">
                    <Badge
                      label={notif.estado}
                      variant={notif.estado === 'pendiente' ? 'error' : notif.estado === 'enviada' ? 'warning' : 'success'}
                      dot={false}
                    />
                  </td>
                  <td className="p-4 text-sm text-gray-600">{formatDateTime(notif.creado_en)}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setSelectedNotif(notif); setShowDetailsModal(true); }}
                        className="p-2 text-gray-400 hover:text-[#ff8d2d] rounded hover:bg-gray-100 transition-all"
                        aria-label={`Ver detalles de ${notif.tipo} para ${notif.usuarios?.nombre}`}
                        title="Ver contenido completo de la notificación"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {notif.estado === 'pendiente' && (
                        <>
                          <button
                            onClick={() => handleCopyMessage(notif)}
                            className={`p-2 rounded transition-all ${copyNotifId === notif.id ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-[#ff8d2d] hover:bg-gray-100'}`}
                            aria-label={`Copiar contenido de ${notif.tipo}`}
                            title="Copia el contenido para enviarlo manualmente (Ctrl+C)"
                          >
                            <ClipboardDocumentIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setSelectedNotif(notif); setShowMarkModal(true); }}
                            className="p-2 text-gray-400 hover:text-[#ff8d2d] rounded hover:bg-gray-100 transition-all"
                            aria-label={`Marcar como enviada ${notif.tipo}`}
                            title="Registra que ya enviaste esta notificación"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 p-4 border-t">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(Math.max(1, page - 1))}>
                Anterior
              </Button>
              <span className="text-sm text-gray-600">Página {page} de {totalPages}</span>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage(Math.min(totalPages, page + 1))}>
                Siguiente
              </Button>
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
              <div className="flex items-center gap-2">
                <span className="text-lg">{TIPO_ICONS[selectedNotif.tipo] || '📋'}</span>
                <p className="font-medium text-[#1d212b]">{selectedNotif.tipo.replace(/_/g, ' ')}</p>
              </div>
            </div>

            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1.5">Usuario</p>
              <p className="font-medium text-[#1d212b]">{selectedNotif.usuarios?.nombre} {selectedNotif.usuarios?.apellido}</p>
              <p className="text-xs text-gray-500 mt-0.5">{selectedNotif.usuarios?.telefono}</p>
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
              <p className="text-xs text-[#1d212b]">{formatDateTime(selectedNotif.creado_en)}</p>
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
                <strong>{selectedNotif.usuarios?.nombre} {selectedNotif.usuarios?.apellido}</strong>
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Notificación</p>
              <div className="flex items-center gap-2">
                <span className="text-lg">{TIPO_ICONS[selectedNotif.tipo]}</span>
                <div>
                  <p className="text-sm font-medium text-[#1d212b]">{selectedNotif.tipo.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(selectedNotif.creado_en)}</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-900">
                ⚠️ Este registro es <strong>auditable</strong> y quedará documentado en el sistema.
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
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  description?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-lg px-4 py-2 text-left transition-all ${
        active
          ? 'bg-[#ff8d2d] text-white shadow-sm'
          : 'text-[#6d7382] hover:text-[#1d212b] hover:bg-[#f9f9f9]'
      }`}
      title={description}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
        {count > 0 && (
          <span
            className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
              active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
            }`}
          >
            {count}
          </span>
        )}
      </div>
      {description && (
        <span className={`text-[10px] leading-tight ${active ? 'text-white/70' : 'text-[#6d7382]'}`}>
          {description}
        </span>
      )}
    </button>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
  color = 'gray',
  icon = '',
}: {
  label: string;
  value: number;
  highlight?: boolean;
  color?: 'red' | 'green' | 'blue' | 'gray';
  icon?: string;
}) {
  const colorClass = {
    red: 'text-red-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
    gray: 'text-gray-900',
  }[color];

  return (
    <Card className={`!p-4 ${highlight ? 'border-2 border-[#ff8d2d]' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-[#6d7382] uppercase mb-1">{label}</p>
          <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
        </div>
        {icon && <span className="text-2xl opacity-50">{icon}</span>}
      </div>
    </Card>
  );
}
