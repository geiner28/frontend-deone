'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge, { variantFromEstado } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast, { ToastType } from '@/components/ui/Toast';
import { reportarRecarga, aprobarRecarga } from '@/lib/api';
import type { RecargaData } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { PlusIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

const initialForm = {
  telefono: '',
  periodo: '',
  monto: '',
  comprobante_url: '',
  referencia_tx: '',
};

export default function RecargasPage() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);

  const [openReportar, setOpenReportar] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [lastRecarga, setLastRecarga] = useState<RecargaData | null>(null);

  const [openAprobar, setOpenAprobar] = useState(false);
  const [recargaId, setRecargaId] = useState('');

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleReportar = async () => {
    setLoading(true);
    const res = await reportarRecarga({ ...form, monto: Number(form.monto) });
    setLoading(false);
    if (res.ok && res.data) {
      setLastRecarga(res.data);
      showToast('Recarga reportada correctamente', 'success');
      setOpenReportar(false);
      setForm(initialForm);
    } else {
      showToast(res.error?.message ?? 'Error al reportar recarga', 'error');
    }
  };

  const handleAprobar = async () => {
    if (!recargaId.trim()) return;
    setLoading(true);
    const res = await aprobarRecarga(recargaId.trim());
    setLoading(false);
    if (res.ok) {
      showToast('Recarga aprobada correctamente', 'success');
      setOpenAprobar(false);
      setRecargaId('');
      if (lastRecarga?.recarga_id === recargaId) {
        setLastRecarga((r) => r ? { ...r, estado: 'aprobada' } : r);
      }
    } else {
      showToast(res.error?.message ?? 'Error al aprobar recarga', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => setOpenReportar(true)}>
          <PlusIcon className="h-4 w-4" /> Reportar Recarga
        </Button>
        <Button variant="secondary" onClick={() => setOpenAprobar(true)}>
          <CheckBadgeIcon className="h-4 w-4" /> Aprobar Recarga
        </Button>
      </div>

      {lastRecarga && (
        <Card>
          <CardHeader
            title="Última recarga registrada"
            action={<Badge label={lastRecarga.estado} variant={variantFromEstado(lastRecarga.estado)} />}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">ID Recarga</p>
              <p className="text-sm font-mono break-all text-gray-900">{lastRecarga.recarga_id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Estado</p>
              <Badge label={lastRecarga.estado} variant={variantFromEstado(lastRecarga.estado)} />
            </div>
          </div>
          {lastRecarga.estado === 'en_validacion' && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
              Esta recarga está en validación. Puedes aprobarla usando el botón <strong>Aprobar Recarga</strong> con su ID.
            </div>
          )}
        </Card>
      )}

      <Card>
        <CardHeader title="Flujo de recargas" />
        <div className="flex flex-col sm:flex-row gap-4">
          {[
            { step: '1', label: 'Reportar', desc: 'El usuario envía comprobante y monto.' },
            { step: '2', label: 'En validación', desc: 'La recarga queda pendiente de revisión.' },
            { step: '3', label: 'Aprobar', desc: 'Admin aprueba con el ID de recarga.' },
            { step: '4', label: 'Disponible', desc: 'El saldo queda disponible para facturas.' },
          ].map(({ step, label, desc }) => (
            <div key={step} className="flex-1 rounded-xl bg-gray-50 p-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold mb-2">
                {step}
              </div>
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal: Reportar */}
      <Modal open={openReportar} onClose={() => setOpenReportar(false)} title="Reportar Recarga">
        <div className="space-y-4">
          <Input label="Teléfono" required placeholder="3001234567" value={form.telefono} onChange={set('telefono')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Periodo" required type="date" value={form.periodo} onChange={set('periodo')} />
            <Input label="Monto (COP)" required type="number" value={form.monto} onChange={set('monto')} placeholder="500000" />
          </div>
          <Input label="Referencia TX" required value={form.referencia_tx} onChange={set('referencia_tx')} placeholder="TX123456789" />
          <Input label="URL Comprobante (opcional)" type="url" value={form.comprobante_url} onChange={set('comprobante_url')} placeholder="https://example.com/comprobante.jpg" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpenReportar(false)}>Cancelar</Button>
            <Button loading={loading} onClick={handleReportar}>Reportar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Aprobar */}
      <Modal open={openAprobar} onClose={() => setOpenAprobar(false)} title="Aprobar Recarga">
        <div className="space-y-4">
          <Input
            label="ID de Recarga"
            required
            placeholder="uuid de la recarga"
            value={recargaId}
            onChange={(e) => setRecargaId(e.target.value)}
            hint="Puedes encontrar el ID en el resultado de 'Reportar Recarga'."
          />
          {lastRecarga && (
            <button
              type="button"
              className="text-xs text-indigo-600 hover:underline"
              onClick={() => setRecargaId(lastRecarga.recarga_id)}
            >
              Usar último ID: {lastRecarga.recarga_id.slice(0, 20)}…
            </button>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpenAprobar(false)}>Cancelar</Button>
            <Button loading={loading} onClick={handleAprobar}>
              <CheckBadgeIcon className="h-4 w-4" /> Aprobar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function formatCurrencyLocal(n: number) {
  return formatCurrency(n);
}
void formatCurrencyLocal;
