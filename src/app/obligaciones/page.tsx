'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge, { variantFromEstado } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast, { ToastType } from '@/components/ui/Toast';
import EmptyState from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { createObligacion, getObligaciones, deleteObligacion, updateObligacion } from '@/lib/api';
import type { Obligacion } from '@/types';
import { formatCurrency, formatDate, getErrorMsg } from '@/lib/utils';
import { useNotifications, notifFromAction } from '@/contexts/NotificationContext';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { ESTADOS_OBLIGACION } from '@/components/ui/Badge';

export default function ObligacionesPage() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotifications();

  const [searchTel, setSearchTel] = useState('');
  const [obligaciones, setObligaciones] = useState<Obligacion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({ telefono: '', descripcion: '', periodo: '' });

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  const handleSearch = async () => {
    if (!searchTel.trim()) return;
    setSearchLoading(true);
    setSearched(false);
    const res = await getObligaciones(searchTel.trim());
    setSearchLoading(false);
    setSearched(true);
    if (res.ok && res.data) setObligaciones(res.data);
    else {
      setObligaciones([]);
      showToast(getErrorMsg(res, 'Error al buscar obligaciones'), 'error');
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    const res = await createObligacion(form);
    setLoading(false);
    if (res.ok) {
      showToast('Obligación creada correctamente', 'success');
      setOpenCreate(false);
      addNotification(notifFromAction('factura_nueva', { servicio: form.descripcion, monto: 'nueva obligación' }));
      setForm({ telefono: '', descripcion: '', periodo: '' });
      if (searchTel === form.telefono) await handleSearch();
    } else {
      showToast(getErrorMsg(res, 'Error al crear obligación'), 'error');
    }
  };

  const totalMonto = obligaciones.reduce((s, o) => s + o.monto_total, 0);
  const totalPagado = obligaciones.reduce((s, o) => s + o.monto_pagado, 0);
  const totalFacturas = obligaciones.reduce((s, o) => s + o.total_facturas, 0);

  // Eliminar obligación
  const [deleteTarget, setDeleteTarget] = useState<Obligacion | null>(null);
  const [deleteForce, setDeleteForce] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteObligacion(deleteTarget.id, { force: deleteForce });
    setDeleting(false);
    if (res.ok) {
      showToast('Obligación eliminada', 'success');
      setObligaciones((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteForce(false);
    } else {
      showToast(getErrorMsg(res, 'No se pudo eliminar la obligación'), 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex gap-3">
        <Button onClick={() => setOpenCreate(true)}>
          <PlusIcon className="h-4 w-4" /> Nueva Obligación
        </Button>
      </div>

      <Card>
        <CardHeader title="Obligaciones por teléfono" subtitle="Busca y gestiona las obligaciones mensuales de un usuario" />
        <div className="flex gap-3 mb-6">
          <Input
            placeholder="Teléfono del usuario"
            value={searchTel}
            onChange={(e) => setSearchTel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="max-w-xs"
          />
          <Button onClick={handleSearch} loading={searchLoading}>
            <MagnifyingGlassIcon className="h-4 w-4" /> Buscar
          </Button>
        </div>

        {searchLoading && <FullPageSpinner />}

        {searched && !searchLoading && obligaciones.length === 0 && (
          <EmptyState
            icon={<DocumentTextIcon className="h-6 w-6" />}
            title="Sin obligaciones"
            description="Este usuario no tiene obligaciones registradas."
            action={<Button size="sm" onClick={() => { setForm((f) => ({ ...f, telefono: searchTel })); setOpenCreate(true); }}>Crear obligación</Button>}
          />
        )}
      </Card>

      {/* Summary strip */}
      {obligaciones.length > 0 && !searchLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
          <MiniKpi label="Obligaciones" value={obligaciones.length.toString()} color="text-[#ff8d2d]" />
          <MiniKpi label="Total facturas" value={totalFacturas.toString()} color="text-blue-600" />
          <MiniKpi label="Monto total" value={formatCurrency(totalMonto)} color="text-amber-600" />
          <MiniKpi label="Monto pagado" value={formatCurrency(totalPagado)} color="text-emerald-600" />
        </div>
      )}

      {/* Cards */}
      {obligaciones.length > 0 && !searchLoading && (
        <div className="space-y-3 stagger-children">
          {obligaciones.map((o) => (
            <ObligacionCard key={o.id} obligacion={o} onDelete={() => setDeleteTarget(o)} />
          ))}
        </div>
      )}

      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="Nueva Obligación">
        <div className="space-y-4">
          <Input label="Teléfono" required placeholder="3001234567" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} />
          <Input label="Descripción" required placeholder="Pagos de Febrero 2026" value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} />
          <Input label="Periodo" required type="date" value={form.periodo} onChange={(e) => setForm((f) => ({ ...f, periodo: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpenCreate(false)}>Cancelar</Button>
            <Button loading={loading} onClick={handleCreate}>Crear</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => { if (!deleting) { setDeleteTarget(null); setDeleteForce(false); } }}
        title="Eliminar obligación"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            ¿Seguro que deseas eliminar la obligación
            {deleteTarget ? <> <strong>{deleteTarget.descripcion || deleteTarget.servicio}</strong></> : ''}?
          </p>
          {deleteTarget && deleteTarget.total_facturas > 0 && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              Esta obligación tiene <strong>{deleteTarget.total_facturas}</strong> factura{deleteTarget.total_facturas !== 1 ? 's' : ''} asociadas.
              Si alguna está pagada o validada, el backend bloqueará la eliminación a menos que actives “forzar cascada”.
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={deleteForce}
              onChange={(e) => setDeleteForce(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            Forzar cascada (elimina también las facturas asociadas)
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" disabled={deleting} onClick={() => { setDeleteTarget(null); setDeleteForce(false); }}>
              Cancelar
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>
              <TrashIcon className="h-4 w-4" /> Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ObligacionCard({ obligacion: initialObligacion, onDelete }: { obligacion: Obligacion; onDelete?: () => void }) {
  const [o, setO] = useState(initialObligacion);
  const [expanded, setExpanded] = useState(false);
  const [changingEstado, setChangingEstado] = useState(false);
  const pct = o.monto_total > 0 ? Math.round((o.monto_pagado / o.monto_total) * 100) : 0;
  const isComplete = o.estado === 'completada' || pct === 100;

  const handleEstadoChange = async (nuevoEstado: string) => {
    if (nuevoEstado === o.estado) return;
    setChangingEstado(true);
    const res = await updateObligacion(o.id, { estado: nuevoEstado as 'activa' | 'en_progreso' | 'completada' | 'cancelada' });
    setChangingEstado(false);
    if (res.ok && res.data) {
      setO(res.data);
    }
  };

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-bold text-[#1d212b]">{o.descripcion || o.servicio}</p>
            <p className="text-xs text-[#6d7382] mt-0.5">
              {o.periodicidad} · Periodo: {formatDate(o.periodo)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={o.estado}
              disabled={changingEstado}
              onChange={(e) => handleEstadoChange(e.target.value)}
              title="Cambiar estado de la obligación"
              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#ff8d2d] disabled:opacity-50 cursor-pointer"
            >
              {ESTADOS_OBLIGACION.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <Badge label={o.estado} variant={variantFromEstado(o.estado)} />
            {onDelete && (
              <button
                onClick={onDelete}
                title="Eliminar obligación"
                className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <MiniStat label="Total facturas" value={o.total_facturas} />
          <MiniStat label="Facturas pagadas" value={o.facturas_pagadas} />
          <MiniStat label="Monto total" value={formatCurrency(o.monto_total)} />
          <MiniStat label="Monto pagado" value={formatCurrency(o.monto_pagado)} />
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-[#6d7382] mb-1.5">
            <span>Progreso de pago</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#e5e7eb]">
            <div
              className={`h-2 rounded-full transition-all duration-700 ${isComplete ? 'bg-[#10b981]' : 'bg-[#ff8d2d]'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Facturas toggle */}
      {o.facturas && o.facturas.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-[#ff8d2d] bg-[#ff8d2d]/10 hover:bg-[#ff8d2d]/20 transition-colors border-t border-[#e5e7eb]"
          >
            {expanded ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
            {expanded ? 'Ocultar' : 'Ver'} {o.facturas.length} factura{o.facturas.length !== 1 ? 's' : ''}
          </button>
          {expanded && (
            <div className="border-t border-[#e5e7eb] divide-y divide-[#f0f0f0] animate-slide-in-down">
              {o.facturas.map((f) => (
                <div key={f.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium text-[#1d212b]">{f.servicio}</p>
                    {f.fecha_vencimiento && <p className="text-[11px] text-[#6d7382]">Vence: {formatDate(f.fecha_vencimiento)}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#1d212b]">{formatCurrency(f.monto)}</span>
                    <Badge label={f.estado} variant={variantFromEstado(f.estado)} dot={false} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[11px] text-[#6d7382]">{label}</p>
      <p className="text-sm font-bold text-[#1d212b]">{value}</p>
    </div>
  );
}

function MiniKpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card>
      <p className="text-[11px] text-[#6d7382] font-medium">{label}</p>
      <p className={`text-xl font-bold ${color} mt-0.5`}>{value}</p>
    </Card>
  );
}
