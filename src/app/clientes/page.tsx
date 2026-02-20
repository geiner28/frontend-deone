'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge, { variantFromEstado } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast, { ToastType } from '@/components/ui/Toast';
import EmptyState from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import {
  getAdminClientes,
  getAdminClientePerfil,
  updatePlan,
  getObligaciones,
  getFacturasByObligacion,
  validarFactura,
  rechazarFactura,
  aprobarRecarga,
  rechazarRecarga,
  crearPago,
  confirmarPago,
} from '@/lib/api';
import type {
  Usuario,
  AdminClientePerfilData,
  Plan,
  Obligacion,
  Factura,
} from '@/types';
import { formatCurrency, formatDate, formatDateTime, getErrorMsg } from '@/lib/utils';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ArrowPathIcon,
  BanknotesIcon,
  BellAlertIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  PlusIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

// ─── Helpers ──────────────────────────────────────────────────────────────────
type Tab = 'obligaciones' | 'recargas' | 'pagos' | 'notificaciones';

const planColors: Record<string, string> = {
  control: 'bg-blue-100 text-blue-700',
  tranquilidad: 'bg-purple-100 text-purple-700',
  respaldo: 'bg-amber-100 text-amber-700',
};

const estadoRecargaVariant = (e: string) => {
  if (e === 'aprobada') return 'success' as const;
  if (e === 'rechazada') return 'error' as const;
  return 'warning' as const;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function ClientesPage() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  // ─── List state ───────────────────────────────────────────────────────
  const [clientes, setClientes] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [listLoading, setListLoading] = useState(true);

  // ─── Detail state ─────────────────────────────────────────────────────
  const [selectedTelefono, setSelectedTelefono] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<AdminClientePerfilData | null>(null);
  const [perfilLoading, setPerfilLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('obligaciones');

  // ─── Fetch list ───────────────────────────────────────────────────────
  const fetchClientes = useCallback(async () => {
    setListLoading(true);
    const res = await getAdminClientes({ page, limit: 20, search: search || undefined, plan: filterPlan || undefined });
    setListLoading(false);
    if (res.ok && res.data) {
      setClientes(res.data.clientes);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } else {
      showToast(getErrorMsg(res, 'Error al cargar clientes'), 'error');
    }
  }, [page, search, filterPlan]);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  // ─── Fetch detail ─────────────────────────────────────────────────────
  const openClientProfile = async (telefono: string) => {
    setSelectedTelefono(telefono);
    setPerfilLoading(true);
    setActiveTab('obligaciones');
    const res = await getAdminClientePerfil(telefono);
    setPerfilLoading(false);
    if (res.ok && res.data) {
      setPerfil(res.data);
    } else {
      showToast(getErrorMsg(res, 'Error al cargar perfil del cliente'), 'error');
      setSelectedTelefono(null);
    }
  };

  const reloadProfile = async () => {
    if (!selectedTelefono) return;
    const res = await getAdminClientePerfil(selectedTelefono);
    if (res.ok && res.data) setPerfil(res.data);
  };

  const goBack = () => {
    setSelectedTelefono(null);
    setPerfil(null);
    fetchClientes();
  };

  // ─── Search on enter ──────────────────────────────────────────────────
  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { setPage(1); fetchClientes(); }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ═════════════════════════════════════════════════════════════════════════════
  if (selectedTelefono) {
    if (perfilLoading) return <FullPageSpinner />;
    if (!perfil) return null;

    return (
      <ClientDetailView
        perfil={perfil}
        onBack={goBack}
        onReload={reloadProfile}
        showToast={showToast}
        toast={toast}
        setToast={setToast}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} clientes registrados</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Buscar por nombre, teléfono o cédula…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKey}
            className="max-w-sm"
          />
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={filterPlan}
            onChange={(e) => { setFilterPlan(e.target.value); setPage(1); }}
          >
            <option value="">Todos los planes</option>
            <option value="control">Control</option>
            <option value="tranquilidad">Tranquilidad</option>
            <option value="respaldo">Respaldo</option>
          </select>
          <Button onClick={() => { setPage(1); fetchClientes(); }}>
            <MagnifyingGlassIcon className="h-4 w-4" /> Buscar
          </Button>
        </div>
      </Card>

      {/* List */}
      {listLoading ? (
        <FullPageSpinner />
      ) : clientes.length === 0 ? (
        <EmptyState
          icon={<UserGroupIcon className="h-6 w-6" />}
          title="Sin clientes"
          description="No se encontraron clientes con los filtros actuales."
        />
      ) : (
        <>
          <div className="grid gap-3 stagger-children">
            {clientes.map((c) => (
              <Card
                key={c.id}
                className="!p-0 overflow-hidden cursor-pointer hover:shadow-md transition-all group"
              >
                <div
                  className="flex items-center gap-4 px-5 py-4"
                  onClick={() => openClientProfile(c.telefono)}
                >
                  {/* Avatar */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-lg">
                    {(c.nombre?.[0] ?? '?').toUpperCase()}
                    {(c.apellido?.[0] ?? '').toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {c.nombre} {c.apellido}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      📱 {c.telefono} · ✉️ {c.correo || '—'}
                    </p>
                  </div>

                  {/* Plan badge */}
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${planColors[c.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                    {c.plan}
                  </span>

                  {/* Status */}
                  <Badge label={c.activo ? 'Activo' : 'Inactivo'} variant={c.activo ? 'success' : 'error'} />

                  {/* Arrow */}
                  <ChevronRightIcon className="h-5 w-5 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeftIcon className="h-4 w-4" /> Anterior
              </Button>
              <span className="text-sm text-gray-600">
                Página {page} de {totalPages}
              </span>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Siguiente <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT DETAIL VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function ClientDetailView({
  perfil,
  onBack,
  onReload,
  showToast,
  toast,
  setToast,
  activeTab,
  setActiveTab,
}: {
  perfil: AdminClientePerfilData;
  onBack: () => void;
  onReload: () => Promise<void>;
  showToast: (msg: string, t: ToastType) => void;
  toast: { message: string; type: ToastType } | null;
  setToast: (t: null) => void;
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
}) {
  const u = perfil.usuario;
  const r = perfil.resumen;
  const [planLoading, setPlanLoading] = useState(false);
  const [openPlan, setOpenPlan] = useState(false);
  const [newPlan, setNewPlan] = useState<Plan>(u.plan);

  const handleChangePlan = async () => {
    if (newPlan === u.plan) { setOpenPlan(false); return; }
    setPlanLoading(true);
    const res = await updatePlan({ telefono: u.telefono, plan: newPlan });
    setPlanLoading(false);
    if (res.ok) {
      showToast(`Plan actualizado a ${newPlan}`, 'success');
      setOpenPlan(false);
      await onReload();
    } else {
      showToast(getErrorMsg(res, 'Error al cambiar plan'), 'error');
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'obligaciones', label: 'Obligaciones', icon: <DocumentTextIcon className="h-4 w-4" />, count: perfil.obligaciones.length },
    { key: 'recargas', label: 'Recargas', icon: <ArrowPathIcon className="h-4 w-4" />, count: perfil.recargas.length },
    { key: 'pagos', label: 'Pagos', icon: <BanknotesIcon className="h-4 w-4" />, count: perfil.pagos.length },
    { key: 'notificaciones', label: 'Notificaciones', icon: <BellAlertIcon className="h-4 w-4" />, count: perfil.notificaciones_recientes.length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors">
        <ArrowLeftIcon className="h-4 w-4" /> Volver a clientes
      </button>

      {/* Profile card */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xl shadow-xl">
            {(u.nombre?.[0] ?? '?').toUpperCase()}{(u.apellido?.[0] ?? '').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{u.nombre} {u.apellido}</h2>
            <p className="text-sm text-gray-500">📱 {u.telefono} · ✉️ {u.correo || '—'}</p>
            {u.direccion && <p className="text-xs text-gray-400 mt-0.5">📍 {u.direccion}</p>}
            <p className="text-xs text-gray-400 mt-0.5">Registrado: {formatDate(u.creado_en)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-4 py-1.5 text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity ${planColors[u.plan] ?? 'bg-gray-100 text-gray-600'}`}
              onClick={() => { setNewPlan(u.plan); setOpenPlan(true); }}
              title="Clic para cambiar plan"
            >
              🎯 {u.plan}
            </span>
            <Badge label={u.activo ? 'Activo' : 'Inactivo'} variant={u.activo ? 'success' : 'error'} />
          </div>
        </div>
      </Card>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 stagger-children">
        <KpiCard label="Obligaciones" value={r.total_obligaciones} sub={`${r.obligaciones_activas} activas`} color="text-indigo-600" />
        <KpiCard label="Completadas" value={r.obligaciones_completadas} color="text-emerald-600" />
        <KpiCard label="Recargas" value={formatCurrency(r.total_recargas_aprobadas)} color="text-blue-600" />
        <KpiCard label="Pagos" value={formatCurrency(r.total_pagos_realizados)} color="text-purple-600" />
        <KpiCard label="Saldo" value={formatCurrency(r.saldo_disponible)} color="text-amber-600" highlight={r.saldo_disponible > 0} />
        <KpiCard label="Notificaciones" value={perfil.notificaciones_recientes.length} color="text-pink-600" />
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl border border-gray-100 p-1 shadow-sm overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === t.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                activeTab === t.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'obligaciones' && (
        <ObligacionesTab perfil={perfil} showToast={showToast} onReload={onReload} />
      )}
      {activeTab === 'recargas' && (
        <RecargasTab perfil={perfil} showToast={showToast} onReload={onReload} />
      )}
      {activeTab === 'pagos' && (
        <PagosTab perfil={perfil} showToast={showToast} onReload={onReload} />
      )}
      {activeTab === 'notificaciones' && (
        <NotificacionesTab perfil={perfil} />
      )}

      {/* Plan modal */}
      <Modal open={openPlan} onClose={() => setOpenPlan(false)} title="Cambiar Plan">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Plan actual de <strong>{u.nombre} {u.apellido}</strong>: <strong className="capitalize">{u.plan}</strong>
          </p>
          <div className="grid grid-cols-3 gap-3">
            {(['control', 'tranquilidad', 'respaldo'] as Plan[]).map((p) => (
              <button
                key={p}
                onClick={() => setNewPlan(p)}
                className={`rounded-xl border-2 p-4 text-center transition-all ${
                  newPlan === p ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-bold capitalize text-gray-900">{p}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpenPlan(false)}>Cancelar</Button>
            <Button loading={planLoading} onClick={handleChangePlan}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Obligaciones
// ═══════════════════════════════════════════════════════════════════════════════
function ObligacionesTab({
  perfil,
  showToast,
  onReload,
}: {
  perfil: AdminClientePerfilData;
  showToast: (msg: string, t: ToastType) => void;
  onReload: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [facturasMap, setFacturasMap] = useState<Record<string, Factura[]>>({});
  const [loadingFacturas, setLoadingFacturas] = useState<string | null>(null);

  // Modals
  const [validarOpen, setValidarOpen] = useState(false);
  const [rechazarOpen, setRechazarOpen] = useState(false);
  const [pagarOpen, setPagarOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [validarForm, setValidarForm] = useState({ monto: '', fecha_vencimiento: '', fecha_emision: '', observaciones_admin: '' });
  const [rechazarMotivo, setRechazarMotivo] = useState('');
  const [confirmarForm, setConfirmarForm] = useState({ proveedor_pago: '', referencia_pago: '', comprobante_pago_url: '' });

  // Modal: Editar y Pagar (actualiza monto/fecha + crea pago + confirma en un solo paso)
  const [editarPagarOpen, setEditarPagarOpen] = useState(false);
  const [editarPagarForm, setEditarPagarForm] = useState({ monto: '', fecha_vencimiento: '', proveedor_pago: '', referencia_pago: '', comprobante_pago_url: '' });

  // Saldo global del usuario (del resumen del perfil)
  const saldoGlobal = perfil.resumen.saldo_disponible;

  // Determinar si una obligación es la primera (creada manualmente) o posterior (auto-generada).
  // La primera es la más antigua por fecha de creación. Las posteriores son auto-generadas.
  const sortedObligaciones = [...perfil.obligaciones].sort(
    (a, b) => new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime()
  );
  const firstObligacionId = sortedObligaciones.length > 0 ? sortedObligaciones[0].id : null;
  const isFirstObligacion = (obId: string) => obId === firstObligacionId;

  const toggleObligacion = async (obId: string) => {
    if (expanded === obId) { setExpanded(null); return; }
    setExpanded(obId);
    if (!facturasMap[obId]) {
      setLoadingFacturas(obId);
      const res = await getFacturasByObligacion(obId);
      setLoadingFacturas(null);
      if (res.ok && res.data) setFacturasMap((m) => ({ ...m, [obId]: res.data! }));
    }
  };

  const handleValidar = async () => {
    if (!selectedFactura) return;
    setActionLoading(true);
    const res = await validarFactura(selectedFactura.id, {
      monto: Number(validarForm.monto),
      fecha_vencimiento: validarForm.fecha_vencimiento || undefined,
      fecha_emision: validarForm.fecha_emision || undefined,
      observaciones_admin: validarForm.observaciones_admin || undefined,
    });
    setActionLoading(false);
    if (res.ok) {
      showToast('Factura validada correctamente', 'success');
      setValidarOpen(false);
      // refresh facturas for this obligacion
      if (selectedFactura.obligacion_id) {
        const fRes = await getFacturasByObligacion(selectedFactura.obligacion_id);
        if (fRes.ok && fRes.data) setFacturasMap((m) => ({ ...m, [selectedFactura.obligacion_id!]: fRes.data! }));
      }
      await onReload();
    } else {
      showToast(getErrorMsg(res, 'Error al validar factura'), 'error');
    }
  };

  const handleRechazar = async () => {
    if (!selectedFactura || !rechazarMotivo.trim()) return;
    setActionLoading(true);
    const res = await rechazarFactura(selectedFactura.id, { motivo_rechazo: rechazarMotivo });
    setActionLoading(false);
    if (res.ok) {
      showToast('Factura rechazada', 'success');
      setRechazarOpen(false);
      setRechazarMotivo('');
      if (selectedFactura.obligacion_id) {
        const fRes = await getFacturasByObligacion(selectedFactura.obligacion_id);
        if (fRes.ok && fRes.data) setFacturasMap((m) => ({ ...m, [selectedFactura.obligacion_id!]: fRes.data! }));
      }
      await onReload();
    } else {
      showToast(getErrorMsg(res, 'Error al rechazar factura'), 'error');
    }
  };

  const handlePagar = async () => {
    if (!selectedFactura) return;
    setActionLoading(true);
    // 1. Crear pago
    const crearRes = await crearPago({ telefono: perfil.usuario.telefono, factura_id: selectedFactura.id });
    if (!crearRes.ok || !crearRes.data) {
      setActionLoading(false);
      const errMsg = getErrorMsg(crearRes, 'Error al crear pago');
      // Mensaje más amigable si es saldo insuficiente
      if (errMsg.toLowerCase().includes('fondos insuficientes') || errMsg.toLowerCase().includes('insufficient')) {
        showToast(`Saldo insuficiente para este periodo. ${errMsg}. Reporta una recarga para el periodo de esta obligación.`, 'error');
      } else {
        showToast(errMsg, 'error');
      }
      return;
    }
    // 2. Confirmar pago
    const confRes = await confirmarPago(crearRes.data.pago_id, {
      proveedor_pago: confirmarForm.proveedor_pago || undefined,
      referencia_pago: confirmarForm.referencia_pago || undefined,
      comprobante_pago_url: confirmarForm.comprobante_pago_url || undefined,
    });
    setActionLoading(false);
    if (confRes.ok) {
      showToast('Pago confirmado exitosamente', 'success');
      setPagarOpen(false);
      setConfirmarForm({ proveedor_pago: '', referencia_pago: '', comprobante_pago_url: '' });
      if (selectedFactura.obligacion_id) {
        const fRes = await getFacturasByObligacion(selectedFactura.obligacion_id);
        if (fRes.ok && fRes.data) setFacturasMap((m) => ({ ...m, [selectedFactura.obligacion_id!]: fRes.data! }));
      }
      await onReload();
    } else {
      showToast(getErrorMsg(confRes, 'Error al confirmar pago'), 'error');
    }
  };

  // Editar (validar con nuevo monto) + Crear pago + Confirmar pago en un solo paso
  const handleEditarYPagar = async () => {
    if (!selectedFactura) return;
    setActionLoading(true);

    // 1. Validar factura (cambia estado a 'validada' y actualiza monto/fecha)
    const valRes = await validarFactura(selectedFactura.id, {
      monto: Number(editarPagarForm.monto),
      fecha_vencimiento: editarPagarForm.fecha_vencimiento || undefined,
    });
    if (!valRes.ok) {
      setActionLoading(false);
      showToast(getErrorMsg(valRes, 'Error al validar factura'), 'error');
      return;
    }

    // 2. Crear pago
    const crearRes = await crearPago({ telefono: perfil.usuario.telefono, factura_id: selectedFactura.id });
    if (!crearRes.ok || !crearRes.data) {
      setActionLoading(false);
      const errMsg = getErrorMsg(crearRes, 'Error al crear pago');
      if (errMsg.toLowerCase().includes('fondos insuficientes') || errMsg.toLowerCase().includes('insufficient')) {
        showToast(`Factura validada, pero saldo insuficiente para pagar. ${errMsg}. Reporta una recarga para el periodo de esta obligación.`, 'error');
      } else {
        showToast(`Factura validada, pero falló el pago: ${errMsg}`, 'error');
      }
      // Refrescar facturas porque ya se validó
      if (selectedFactura.obligacion_id) {
        const fRes = await getFacturasByObligacion(selectedFactura.obligacion_id);
        if (fRes.ok && fRes.data) setFacturasMap((m) => ({ ...m, [selectedFactura.obligacion_id!]: fRes.data! }));
      }
      await onReload();
      return;
    }

    // 3. Confirmar pago
    const confRes = await confirmarPago(crearRes.data.pago_id, {
      proveedor_pago: editarPagarForm.proveedor_pago || undefined,
      referencia_pago: editarPagarForm.referencia_pago || undefined,
      comprobante_pago_url: editarPagarForm.comprobante_pago_url || undefined,
    });
    setActionLoading(false);
    if (confRes.ok) {
      showToast('Factura actualizada y pago confirmado exitosamente', 'success');
      setEditarPagarOpen(false);
      setEditarPagarForm({ monto: '', fecha_vencimiento: '', proveedor_pago: '', referencia_pago: '', comprobante_pago_url: '' });
      if (selectedFactura.obligacion_id) {
        const fRes = await getFacturasByObligacion(selectedFactura.obligacion_id);
        if (fRes.ok && fRes.data) setFacturasMap((m) => ({ ...m, [selectedFactura.obligacion_id!]: fRes.data! }));
      }
      await onReload();
    } else {
      showToast(getErrorMsg(confRes, 'Error al confirmar pago'), 'error');
      if (selectedFactura.obligacion_id) {
        const fRes = await getFacturasByObligacion(selectedFactura.obligacion_id);
        if (fRes.ok && fRes.data) setFacturasMap((m) => ({ ...m, [selectedFactura.obligacion_id!]: fRes.data! }));
      }
      await onReload();
    }
  };

  if (perfil.obligaciones.length === 0) {
    return (
      <EmptyState
        icon={<DocumentTextIcon className="h-6 w-6" />}
        title="Sin obligaciones"
        description="Este cliente no tiene obligaciones registradas."
      />
    );
  }

  return (
    <>
      <div className="space-y-3 stagger-children">
        {perfil.obligaciones.map((ob) => {
          const pct = ob.monto_total > 0 ? Math.round((ob.monto_pagado / ob.monto_total) * 100) : 0;
          const isExp = expanded === ob.id;
          const facturas = facturasMap[ob.id];

          return (
            <Card key={ob.id} className="!p-0 overflow-hidden">
              {/* Header */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{ob.descripcion || 'Obligación'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Periodo: {formatDate(ob.periodo)} · {ob.total_facturas} facturas
                    </p>
                  </div>
                  <Badge label={ob.estado} variant={variantFromEstado(ob.estado)} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <MiniStat label="Monto total" value={formatCurrency(ob.monto_total)} />
                  <MiniStat label="Pagado" value={formatCurrency(ob.monto_pagado)} />
                  <MiniStat label="Facturas pagadas" value={`${ob.facturas_pagadas} / ${ob.total_facturas}`} />
                  <MiniStat label="Progreso" value={`${ob.progreso ?? pct}%`} />
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>

              {/* Toggle facturas */}
              <button
                onClick={() => toggleObligacion(ob.id)}
                className="w-full flex items-center justify-center gap-1 py-2.5 text-xs font-medium text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 transition-colors border-t border-gray-100"
              >
                {isExp ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
                {isExp ? 'Ocultar' : 'Ver'} facturas
              </button>

              {/* Facturas detail */}
              {isExp && (
                <div className="border-t border-gray-100 animate-slide-in-down">
                  {loadingFacturas === ob.id ? (
                    <div className="p-4 text-center text-sm text-gray-500">Cargando facturas...</div>
                  ) : facturas && facturas.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                      {facturas.map((f) => (
                        <div key={f.id} className="flex items-center justify-between px-5 py-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{f.servicio}</p>
                            <p className="text-xs text-gray-500">
                              {f.fecha_vencimiento ? `Vence: ${formatDate(f.fecha_vencimiento)}` : 'Sin vencimiento'}
                              {f.periodo ? ` · Periodo: ${f.periodo}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-900 text-sm">{formatCurrency(f.monto)}</span>
                            <Badge label={f.estado} variant={variantFromEstado(f.estado)} dot={false} />

                            {/* Actions por estado */}
                            {f.estado === 'extraida' && isFirstObligacion(ob.id) && (
                              /* Primera obligación: flujo de validación inicial */
                              <div className="flex gap-1">
                                <Button size="sm" onClick={() => {
                                  setSelectedFactura(f);
                                  setValidarForm({ monto: f.monto.toString(), fecha_vencimiento: f.fecha_vencimiento ?? '', fecha_emision: f.fecha_emision ?? '', observaciones_admin: '' });
                                  setValidarOpen(true);
                                }}>
                                  <CheckCircleIcon className="h-3.5 w-3.5" /> Validar
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => {
                                  setSelectedFactura(f);
                                  setRechazarMotivo('');
                                  setRechazarOpen(true);
                                }}>
                                  <XCircleIcon className="h-3.5 w-3.5" /> Rechazar
                                </Button>
                              </div>
                            )}
                            {f.estado === 'extraida' && !isFirstObligacion(ob.id) && (
                              /* Obligaciones posteriores: editar y pagar en un solo paso */
                              <Button size="sm" onClick={() => {
                                setSelectedFactura(f);
                                setEditarPagarForm({
                                  monto: f.monto.toString(),
                                  fecha_vencimiento: f.fecha_vencimiento ?? '',
                                  proveedor_pago: '',
                                  referencia_pago: '',
                                  comprobante_pago_url: '',
                                });
                                setEditarPagarOpen(true);
                              }}>
                                <BanknotesIcon className="h-3.5 w-3.5" /> Editar y Pagar
                              </Button>
                            )}
                            {f.estado === 'validada' && (
                              <Button size="sm" onClick={() => {
                                setSelectedFactura(f);
                                setConfirmarForm({ proveedor_pago: '', referencia_pago: '', comprobante_pago_url: '' });
                                setPagarOpen(true);
                              }}>
                                <BanknotesIcon className="h-3.5 w-3.5" /> Pagar
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Use inline facturas from profile if API call returned nothing
                    ob.facturas && ob.facturas.length > 0 ? (
                      <div className="divide-y divide-gray-50">
                        {ob.facturas.map((f) => (
                          <div key={f.id} className="flex items-center justify-between px-5 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{f.servicio}</p>
                              {f.fecha_vencimiento && <p className="text-xs text-gray-500">Vence: {formatDate(f.fecha_vencimiento)}</p>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-gray-900 text-sm">{formatCurrency(f.monto)}</span>
                              <Badge label={f.estado} variant={variantFromEstado(f.estado)} dot={false} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">Sin facturas en esta obligación</div>
                    )
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Modal: Validar */}
      <Modal open={validarOpen} onClose={() => setValidarOpen(false)} title="Validar Factura">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-sm text-blue-800"><strong>{selectedFactura?.servicio}</strong> — {selectedFactura ? formatCurrency(selectedFactura.monto) : ''}</p>
          </div>
          <Input label="Monto (COP)" type="number" required value={validarForm.monto} onChange={(e) => setValidarForm((f) => ({ ...f, monto: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha emisión" type="date" value={validarForm.fecha_emision} onChange={(e) => setValidarForm((f) => ({ ...f, fecha_emision: e.target.value }))} />
            <Input label="Fecha vencimiento" type="date" value={validarForm.fecha_vencimiento} onChange={(e) => setValidarForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))} />
          </div>
          <Input label="Observaciones (opcional)" value={validarForm.observaciones_admin} onChange={(e) => setValidarForm((f) => ({ ...f, observaciones_admin: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setValidarOpen(false)}>Cancelar</Button>
            <Button loading={actionLoading} onClick={handleValidar}>
              <CheckCircleIcon className="h-4 w-4" /> Validar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Rechazar */}
      <Modal open={rechazarOpen} onClose={() => setRechazarOpen(false)} title="Rechazar Factura">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-800"><strong>{selectedFactura?.servicio}</strong> — {selectedFactura ? formatCurrency(selectedFactura.monto) : ''}</p>
          </div>
          <Input label="Motivo del rechazo" required value={rechazarMotivo} onChange={(e) => setRechazarMotivo(e.target.value)} placeholder="Ej: Comprobante ilegible..." />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setRechazarOpen(false)}>Cancelar</Button>
            <Button loading={actionLoading} onClick={handleRechazar}>
              <XCircleIcon className="h-4 w-4" /> Rechazar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Pagar */}
      <Modal open={pagarOpen} onClose={() => setPagarOpen(false)} title="Pagar Factura">
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <p className="text-sm text-emerald-800"><strong>{selectedFactura?.servicio}</strong> — {selectedFactura ? formatCurrency(selectedFactura.monto) : ''}</p>
            <p className="text-xs text-emerald-600 mt-1">Se creará un pago y se confirmará automáticamente</p>
          </div>

          {/* Saldo global del usuario */}
          <div className={`border rounded-xl p-3 ${
            selectedFactura && saldoGlobal >= selectedFactura.monto
              ? 'bg-blue-50 border-blue-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600">💰 Saldo global del usuario</p>
              <p className={`text-sm font-bold ${saldoGlobal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(saldoGlobal)}</p>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500">Total recargas</p>
              <p className="text-xs font-semibold text-indigo-600">{formatCurrency(perfil.resumen.total_recargas_aprobadas)}</p>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-xs text-gray-500">Total pagos</p>
              <p className="text-xs font-semibold text-amber-600">{formatCurrency(perfil.resumen.total_pagos_realizados)}</p>
            </div>
            {selectedFactura && saldoGlobal < selectedFactura.monto && (
              <div className="mt-2 bg-amber-100 rounded-lg p-2">
                <p className="text-xs text-amber-700 font-medium">⚠️ El saldo global parece insuficiente. Si el backend rechaza el pago, reporta una recarga para el periodo de esta obligación.</p>
              </div>
            )}
          </div>

          <Input label="Proveedor de pago" value={confirmarForm.proveedor_pago} onChange={(e) => setConfirmarForm((f) => ({ ...f, proveedor_pago: e.target.value }))} placeholder="PSE, Nequi, Daviplata, etc." />
          <Input label="Referencia de pago" value={confirmarForm.referencia_pago} onChange={(e) => setConfirmarForm((f) => ({ ...f, referencia_pago: e.target.value }))} placeholder="TX-PSE-123456" />
          <Input label="URL Comprobante (opcional)" type="url" value={confirmarForm.comprobante_pago_url} onChange={(e) => setConfirmarForm((f) => ({ ...f, comprobante_pago_url: e.target.value }))} placeholder="https://..." />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setPagarOpen(false)}>Cancelar</Button>
            <Button loading={actionLoading} onClick={handlePagar}>
              <BanknotesIcon className="h-4 w-4" /> Crear y Confirmar Pago
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Editar y Pagar (para facturas extraidas — actualiza monto, valida y paga en un solo paso) */}
      <Modal open={editarPagarOpen} onClose={() => setEditarPagarOpen(false)} title="Editar y Pagar Factura">
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
            <p className="text-sm text-indigo-800"><strong>{selectedFactura?.servicio}</strong> — Monto actual: {selectedFactura ? formatCurrency(selectedFactura.monto) : ''}</p>
            <p className="text-xs text-indigo-600 mt-1">Edita el monto y fecha si cambió. Se validará y pagará automáticamente.</p>
          </div>

          {/* Saldo global */}
          <div className={`border rounded-xl p-3 ${
            editarPagarForm.monto && saldoGlobal >= Number(editarPagarForm.monto)
              ? 'bg-blue-50 border-blue-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600">💰 Saldo global</p>
              <p className={`text-sm font-bold ${saldoGlobal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(saldoGlobal)}</p>
            </div>
            {editarPagarForm.monto && saldoGlobal < Number(editarPagarForm.monto) && (
              <p className="text-xs text-amber-700 mt-1">⚠️ El saldo global parece insuficiente para este monto.</p>
            )}
          </div>

          <Input label="Monto (COP)" type="number" required value={editarPagarForm.monto} onChange={(e) => setEditarPagarForm((f) => ({ ...f, monto: e.target.value }))} />
          <Input label="Fecha vencimiento" type="date" value={editarPagarForm.fecha_vencimiento} onChange={(e) => setEditarPagarForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))} />

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Datos del pago (opcionales)</p>
            <div className="space-y-3">
              <Input label="Proveedor de pago" value={editarPagarForm.proveedor_pago} onChange={(e) => setEditarPagarForm((f) => ({ ...f, proveedor_pago: e.target.value }))} placeholder="PSE, Nequi, Daviplata, etc." />
              <Input label="Referencia de pago" value={editarPagarForm.referencia_pago} onChange={(e) => setEditarPagarForm((f) => ({ ...f, referencia_pago: e.target.value }))} placeholder="TX-PSE-123456" />
              <Input label="URL Comprobante (opcional)" type="url" value={editarPagarForm.comprobante_pago_url} onChange={(e) => setEditarPagarForm((f) => ({ ...f, comprobante_pago_url: e.target.value }))} placeholder="https://..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditarPagarOpen(false)}>Cancelar</Button>
            <Button loading={actionLoading} onClick={handleEditarYPagar} disabled={!editarPagarForm.monto || Number(editarPagarForm.monto) <= 0}>
              <BanknotesIcon className="h-4 w-4" /> Validar y Pagar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Recargas
// ═══════════════════════════════════════════════════════════════════════════════
function RecargasTab({
  perfil,
  showToast,
  onReload,
}: {
  perfil: AdminClientePerfilData;
  showToast: (msg: string, t: ToastType) => void;
  onReload: () => Promise<void>;
}) {
  const [actionLoading, setActionLoading] = useState(false);
  const [aprobarOpen, setAprobarOpen] = useState(false);
  const [rechazarOpen, setRechazarOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [selectedMonto, setSelectedMonto] = useState(0);
  const [observaciones, setObservaciones] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const handleAprobar = async () => {
    setActionLoading(true);
    const res = await aprobarRecarga(selectedId, observaciones ? { observaciones_admin: observaciones } : undefined);
    setActionLoading(false);
    if (res.ok) {
      showToast('Recarga aprobada', 'success');
      setAprobarOpen(false);
      setObservaciones('');
      await onReload();
    } else {
      showToast(getErrorMsg(res, 'Error al aprobar recarga'), 'error');
    }
  };

  const handleRechazar = async () => {
    if (!motivoRechazo.trim()) return;
    setActionLoading(true);
    const res = await rechazarRecarga(selectedId, { motivo_rechazo: motivoRechazo });
    setActionLoading(false);
    if (res.ok) {
      showToast('Recarga rechazada', 'success');
      setRechazarOpen(false);
      setMotivoRechazo('');
      await onReload();
    } else {
      showToast(getErrorMsg(res, 'Error al rechazar recarga'), 'error');
    }
  };

  if (perfil.recargas.length === 0) {
    return (
      <EmptyState
        icon={<ArrowPathIcon className="h-6 w-6" />}
        title="Sin recargas"
        description="Este cliente no tiene recargas registradas."
      />
    );
  }

  return (
    <>
      <div className="space-y-3 stagger-children">
        {perfil.recargas.map((r) => (
          <Card key={r.id} className="!p-0 overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                r.estado === 'aprobada' ? 'bg-emerald-100' : r.estado === 'rechazada' ? 'bg-red-100' : 'bg-amber-100'
              }`}>
                {r.estado === 'aprobada' ? '✅' : r.estado === 'rechazada' ? '❌' : '🔍'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{formatCurrency(r.monto)}</p>
                <p className="text-xs text-gray-500">Periodo: {r.periodo}</p>
                {r.comprobante_url && (
                  <a href={r.comprobante_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-0.5">
                    <ArrowTopRightOnSquareIcon className="h-3 w-3" /> Ver comprobante
                  </a>
                )}
                {r.motivo_rechazo && <p className="text-xs text-red-600 mt-1">❌ {r.motivo_rechazo}</p>}
                {r.observaciones_admin && <p className="text-xs text-emerald-600 mt-1">📝 {r.observaciones_admin}</p>}
              </div>
              <Badge label={r.estado} variant={estadoRecargaVariant(r.estado)} />

              {/* Actions for pending recargas */}
              {(r.estado === 'en_validacion' || r.estado === 'pendiente') && (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => { setSelectedId(r.id); setSelectedMonto(r.monto); setObservaciones(''); setAprobarOpen(true); }}>
                    <CheckCircleIcon className="h-3.5 w-3.5" /> Aprobar
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => { setSelectedId(r.id); setSelectedMonto(r.monto); setMotivoRechazo(''); setRechazarOpen(true); }}>
                    <XCircleIcon className="h-3.5 w-3.5" /> Rechazar
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Modal: Aprobar Recarga */}
      <Modal open={aprobarOpen} onClose={() => setAprobarOpen(false)} title="Aprobar Recarga">
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <p className="text-sm text-emerald-800"><strong>Monto:</strong> {formatCurrency(selectedMonto)}</p>
          </div>
          <Input label="Observaciones (opcional)" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Comprobante verificado…" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setAprobarOpen(false)}>Cancelar</Button>
            <Button loading={actionLoading} onClick={handleAprobar}>
              <CheckCircleIcon className="h-4 w-4" /> Aprobar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Rechazar Recarga */}
      <Modal open={rechazarOpen} onClose={() => setRechazarOpen(false)} title="Rechazar Recarga">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-800"><strong>Monto:</strong> {formatCurrency(selectedMonto)}</p>
          </div>
          <Input label="Motivo del rechazo" required value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} placeholder="Comprobante borroso, monto incorrecto…" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setRechazarOpen(false)}>Cancelar</Button>
            <Button loading={actionLoading} onClick={handleRechazar}>
              <XCircleIcon className="h-4 w-4" /> Rechazar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Pagos
// ═══════════════════════════════════════════════════════════════════════════════
function PagosTab({
  perfil,
  showToast,
  onReload,
}: {
  perfil: AdminClientePerfilData;
  showToast: (msg: string, t: ToastType) => void;
  onReload: () => Promise<void>;
}) {
  if (perfil.pagos.length === 0) {
    return (
      <EmptyState
        icon={<BanknotesIcon className="h-6 w-6" />}
        title="Sin pagos"
        description="Este cliente no tiene pagos registrados."
      />
    );
  }

  return (
    <div className="space-y-3 stagger-children">
      {perfil.pagos.map((p) => (
        <Card key={p.id} className="!p-0 overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
              p.estado === 'pagado' ? 'bg-emerald-100' : p.estado === 'fallido' ? 'bg-red-100' : 'bg-blue-100'
            }`}>
              {p.estado === 'pagado' ? '💰' : p.estado === 'fallido' ? '❌' : '⏳'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-gray-900">{formatCurrency(p.monto_aplicado)}</p>
                {p.facturas && (
                  <span className="text-xs text-gray-500">— {p.facturas.servicio}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                {p.ejecutado_en && <span className="text-xs text-gray-500">📅 {formatDateTime(p.ejecutado_en)}</span>}
                {p.proveedor_pago && <span className="text-xs text-gray-500">🏦 {p.proveedor_pago}</span>}
                {p.referencia_pago && <span className="text-xs text-gray-400 font-mono">{p.referencia_pago}</span>}
              </div>
              {p.comprobante_pago_url && (
                <a href={p.comprobante_pago_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-0.5">
                  <ArrowTopRightOnSquareIcon className="h-3 w-3" /> Ver comprobante
                </a>
              )}
            </div>
            <Badge label={p.estado} variant={variantFromEstado(p.estado)} />
          </div>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Notificaciones
// ═══════════════════════════════════════════════════════════════════════════════
function NotificacionesTab({ perfil }: { perfil: AdminClientePerfilData }) {
  if (perfil.notificaciones_recientes.length === 0) {
    return (
      <EmptyState
        icon={<BellAlertIcon className="h-6 w-6" />}
        title="Sin notificaciones"
        description="Este cliente no tiene notificaciones recientes."
      />
    );
  }

  return (
    <div className="space-y-3 stagger-children">
      {perfil.notificaciones_recientes.map((n) => (
        <Card key={n.id} className="!p-0 overflow-hidden">
          <div className="flex gap-4 px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-lg">
              🔔
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-bold text-gray-900 capitalize">{n.tipo.replace(/_/g, ' ')}</p>
                <Badge label={n.estado} variant={variantFromEstado(n.estado)} />
              </div>
              <p className="text-xs text-gray-500">Canal: {n.canal} · {formatDateTime(n.creado_en)}</p>
              {n.payload && Object.keys(n.payload).length > 0 && (
                <div className="mt-2 rounded-lg bg-gray-50 p-2">
                  {Object.entries(n.payload).map(([k, v]) => (
                    <p key={k} className="text-xs text-gray-600">
                      <span className="font-medium">{k}:</span> {typeof v === 'string' ? v : JSON.stringify(v)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shared mini components
// ═══════════════════════════════════════════════════════════════════════════════
function KpiCard({ label, value, sub, color, highlight }: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? '!border-amber-200 !bg-amber-50/50' : ''}>
      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold ${color} mt-0.5 truncate`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}
