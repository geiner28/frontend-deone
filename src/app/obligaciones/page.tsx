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
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

export default function ObligacionesPage() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);

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
      showToast(res.error?.message ?? 'Error al buscar obligaciones', 'error');
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    const res = await createObligacion(form);
    setLoading(false);
    if (res.ok) {
      showToast('Obligación creada correctamente', 'success');
      setOpenCreate(false);
      setForm({ telefono: '', descripcion: '', periodo: '' });
      if (searchTel === form.telefono) await handleSearch();
    } else {
      showToast(res.error?.message ?? 'Error al crear obligación', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex gap-3">
        <Button onClick={() => setOpenCreate(true)}>
          <PlusIcon className="h-4 w-4" /> Nueva Obligación
        </Button>
      </div>

      <Card>
        <CardHeader title="Obligaciones por teléfono" />
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
          />
        )}

        {obligaciones.length > 0 && !searchLoading && (
          <div className="space-y-3">
            {obligaciones.map((o) => (
              <ObligacionCard key={o.id} obligacion={o} />
            ))}
          </div>
        )}
      </Card>

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
  const pct = o.monto_total > 0 ? Math.round((o.monto_pagado / o.monto_total) * 100) : 0;

  return (
    <div className="rounded-xl border border-gray-100 p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{o.descripcion || o.servicio}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {o.periodicidad} · Periodo: {formatDate(o.periodo)}
          </p>
        </div>
        <Badge label={o.estado} variant={variantFromEstado(o.estado)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <MiniStat label="Total facturas" value={o.total_facturas} />
        <MiniStat label="Facturas pagadas" value={o.facturas_pagadas} />
        <MiniStat label="Monto total" value={formatCurrency(o.monto_total)} />
        <MiniStat label="Monto pagado" value={formatCurrency(o.monto_pagado)} />
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progreso</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-100">
          <div
            className="h-1.5 rounded-full bg-indigo-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {o.facturas && o.facturas.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">Facturas</p>
          <div className="space-y-1.5">
            {o.facturas.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-700">{f.servicio}</span>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">{formatCurrency(f.monto)}</span>
                  <Badge label={f.estado} variant={variantFromEstado(f.estado)} dot={false} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
