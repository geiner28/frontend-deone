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
import { createObligacion, getObligaciones } from '@/lib/api';
import type { Obligacion } from '@/types';
import { formatCurrency, formatDate, getErrorMsg } from '@/lib/utils';
import { useNotifications, notifFromAction } from '@/contexts/NotificationContext';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

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
          <MiniKpi label="Obligaciones" value={obligaciones.length.toString()} color="text-indigo-600" />
          <MiniKpi label="Total facturas" value={totalFacturas.toString()} color="text-blue-600" />
          <MiniKpi label="Monto total" value={formatCurrency(totalMonto)} color="text-amber-600" />
          <MiniKpi label="Monto pagado" value={formatCurrency(totalPagado)} color="text-emerald-600" />
        </div>
      )}

      {/* Cards */}
      {obligaciones.length > 0 && !searchLoading && (
        <div className="space-y-3 stagger-children">
          {obligaciones.map((o) => (
            <ObligacionCard key={o.id} obligacion={o} />
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
    </div>
  );
}

function ObligacionCard({ obligacion: o }: { obligacion: Obligacion }) {
  const [expanded, setExpanded] = useState(false);
  const pct = o.monto_total > 0 ? Math.round((o.monto_pagado / o.monto_total) * 100) : 0;
  const isComplete = o.estado === 'completada' || pct === 100;

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-bold text-gray-900">{o.descripcion || o.servicio}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {o.periodicidad} · Periodo: {formatDate(o.periodo)}
            </p>
          </div>
          <Badge label={o.estado} variant={variantFromEstado(o.estado)} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <MiniStat label="Total facturas" value={o.total_facturas} />
          <MiniStat label="Facturas pagadas" value={o.facturas_pagadas} />
          <MiniStat label="Monto total" value={formatCurrency(o.monto_total)} />
          <MiniStat label="Monto pagado" value={formatCurrency(o.monto_pagado)} />
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Progreso de pago</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100">
            <div
              className={`h-2 rounded-full transition-all duration-700 ${isComplete ? 'bg-emerald-500' : 'bg-indigo-500'}`}
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
            className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 transition-colors border-t border-gray-100"
          >
            {expanded ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
            {expanded ? 'Ocultar' : 'Ver'} {o.facturas.length} factura{o.facturas.length !== 1 ? 's' : ''}
          </button>
          {expanded && (
            <div className="border-t border-gray-100 divide-y divide-gray-50 animate-slide-in-down">
              {o.facturas.map((f) => (
                <div key={f.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{f.servicio}</p>
                    {f.fecha_vencimiento && <p className="text-[11px] text-gray-500">Vence: {formatDate(f.fecha_vencimiento)}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{formatCurrency(f.monto)}</span>
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
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

function MiniKpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card>
      <p className="text-[11px] text-gray-500 font-medium">{label}</p>
      <p className={`text-xl font-bold ${color} mt-0.5`}>{value}</p>
    </Card>
  );
}
