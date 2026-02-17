'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge, { variantFromEstado } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast, { ToastType } from '@/components/ui/Toast';
import { capturaFactura } from '@/lib/api';
import type { CapturaFacturaData } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { PlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const initialForm = {
  telefono: '',
  obligacion_id: '',
  servicio: '',
  monto: '',
  fecha_vencimiento: '',
  fecha_emision: '',
  periodo: '',
  origen: 'manual',
  archivo_url: '',
  extraccion_estado: 'ok',
  extraccion_confianza: '0.95',
};

export default function FacturasPage() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<CapturaFacturaData | null>(null);

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    setLoading(true);
    const res = await capturaFactura({
      ...form,
      monto: Number(form.monto),
      extraccion_confianza: Number(form.extraccion_confianza),
    });
    setLoading(false);
    if (res.ok && res.data) {
      setResult(res.data);
      setOpen(false);
      setForm(initialForm);
      showToast('Factura capturada correctamente', 'success');
    } else {
      showToast(res.error?.message ?? 'Error al capturar factura', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex gap-3">
        <Button onClick={() => setOpen(true)}>
          <PlusIcon className="h-4 w-4" /> Capturar Factura
        </Button>
      </div>

      {result && (
        <Card>
          <CardHeader title="Última factura capturada" action={<Badge label={result.estado} variant={variantFromEstado(result.estado)} />} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoItem label="Servicio" value={result.servicio} />
            <InfoItem label="Monto" value={formatCurrency(result.monto)} />
            <InfoItem label="Req. revisión" value={result.requiere_revision ? 'Sí' : 'No'} />
            <InfoItem label="ID Factura" value={<span className="font-mono text-xs break-all">{result.factura_id}</span>} />
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="¿Cómo funciona?" subtitle="Proceso de captura de facturas en obligaciones" />
        <ol className="space-y-3">
          {[
            'Busca el usuario por teléfono en el módulo Usuarios.',
            'Crea o busca una obligación existente para ese usuario.',
            'Copia el ID de la obligación y úsalo en el formulario de captura.',
            'Completa los datos de la factura y guarda.',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Capturar Factura" maxWidth="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Teléfono" required value={form.telefono} onChange={set('telefono')} placeholder="3001234567" />
            <Input label="ID Obligación" required value={form.obligacion_id} onChange={set('obligacion_id')} placeholder="uuid" />
          </div>
          <Input label="Servicio" required value={form.servicio} onChange={set('servicio')} placeholder="EPM Energía" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto (COP)" required type="number" value={form.monto} onChange={set('monto')} placeholder="150000" />
            <Input label="Periodo" required value={form.periodo} onChange={set('periodo')} placeholder="2026-02" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha emisión" required type="date" value={form.fecha_emision} onChange={set('fecha_emision')} />
            <Input label="Fecha vencimiento" required type="date" value={form.fecha_vencimiento} onChange={set('fecha_vencimiento')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Origen</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.origen} onChange={set('origen')}>
                <option value="manual">Manual</option>
                <option value="bot_whatsapp">Bot WhatsApp</option>
                <option value="api">API</option>
              </select>
            </div>
            <Input label="Confianza extracción" type="number" step="0.01" min="0" max="1" value={form.extraccion_confianza} onChange={set('extraccion_confianza')} />
          </div>
          <Input label="URL Archivo (opcional)" type="url" value={form.archivo_url} onChange={set('archivo_url')} placeholder="https://example.com/factura.pdf" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button loading={loading} onClick={handleSubmit}>
              <CheckCircleIcon className="h-4 w-4" /> Capturar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <div className="text-sm font-medium text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}
