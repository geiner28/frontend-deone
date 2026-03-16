'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge, { variantFromEstado } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast, { ToastType } from '@/components/ui/Toast';
import { reportarRecarga } from '@/lib/api';
import AprobarRechazarRecargaModal from '@/components/modals/AprobarRechazarRecargaModal';
import type { RecargaData } from '@/types';
import { formatCurrency, getErrorMsg } from '@/lib/utils';
import { useNotifications, notifFromAction } from '@/contexts/NotificationContext';
import {
  PlusIcon,
  CheckBadgeIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

const initialForm = {
  telefono: '',
  periodo: '',
  monto: '',
  comprobante_url: '',
  referencia_tx: '',
};

const flowSteps = [
  { n: 1, label: 'Reportar', desc: 'Usuario envía comprobante y monto', color: 'from-blue-500 to-cyan-500', emoji: '📤' },
  { n: 2, label: 'En validación', desc: 'Recarga queda pendiente de revisión', color: 'from-amber-500 to-orange-500', emoji: '🔍' },
  { n: 3, label: 'Aprobar', desc: 'Admin verifica y aprueba', color: 'from-emerald-500 to-green-500', emoji: '✅' },
  { n: 4, label: 'Disponible', desc: 'Saldo listo para pagar facturas', color: 'from-violet-500 to-purple-500', emoji: '💰' },
];

export default function RecargasPage() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotifications();

  const [openReportar, setOpenReportar] = useState(false);
  const [openAprobarRechazar, setOpenAprobarRechazar] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [lastRecarga, setLastRecarga] = useState<RecargaData | null>(null);

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
      addNotification(notifFromAction('recarga_pendiente', {
        monto: formatCurrency(Number(form.monto)),
        telefono: form.telefono,
        recarga_id: res.data.recarga_id,
      }));
      setOpenReportar(false);
      setForm(initialForm);
    } else {
      showToast(getErrorMsg(res, 'Error al reportar recarga'), 'error');
    }
  };

  const handleAprobarRechazarSuccess = async () => {
    setOpenAprobarRechazar(false);
    // Opcionalmente, aquí podrías recargar datos
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => setOpenReportar(true)}>
          <PlusIcon className="h-4 w-4" /> Reportar Recarga
        </Button>
        <Button variant="secondary" onClick={() => setOpenAprobarRechazar(true)}>
          <CheckBadgeIcon className="h-4 w-4" /> Aprobar/Rechazar Recarga
        </Button>
      </div>

      {/* Flow */}
      <Card>
        <CardHeader title="🔄 Flujo de recargas" subtitle="Del reporte a la disponibilidad de saldo" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {flowSteps.map(({ n, label, desc, color, emoji }, i) => (
            <div key={n} className="relative">
              <div className="rounded-2xl bg-white border border-[#e5e7eb] p-4 h-full hover:shadow-md transition-shadow">
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white text-sm font-bold mb-3 shadow-lg`}>
                  {emoji}
                </div>
                <p className="text-sm font-bold text-[#1d212b]">{label}</p>
                <p className="text-[11px] text-[#6d7382] mt-1 leading-relaxed">{desc}</p>
              </div>
              {i < flowSteps.length - 1 && (
                <ArrowRightIcon className="hidden sm:block absolute top-1/2 -right-2.5 h-4 w-4 text-gray-300 z-10 -translate-y-1/2" />
              )}
            </div>
          ))}
        </div>
      </Card>

      {lastRecarga && (
        <Card className="animate-fade-in-up relative overflow-hidden">
          <div className={`absolute top-0 left-0 h-1 w-full ${lastRecarga.estado === 'aprobada' ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`} />
          <CardHeader
            title="Última recarga"
            action={<Badge label={lastRecarga.estado} variant={variantFromEstado(lastRecarga.estado)} />}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[#6d7382]">ID Recarga</p>
              <p className="text-sm font-mono break-all text-[#1d212b] mt-0.5">{lastRecarga.recarga_id}</p>
            </div>
            <div>
              <p className="text-xs text-[#6d7382]">Estado</p>
              <div className="mt-0.5">
                <Badge label={lastRecarga.estado} variant={variantFromEstado(lastRecarga.estado)} />
              </div>
            </div>
          </div>
          {lastRecarga.estado === 'en_validacion' && (
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-amber-700">
                🔍 Esta recarga está pendiente de aprobación.
              </p>
              <Button size="sm" onClick={() => setOpenAprobarRechazar(true)}>
                Resolver ahora
              </Button>
            </div>
          )}
          {lastRecarga.estado === 'aprobada' && (
            <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">
              ✅ Recarga aprobada. El saldo está disponible para el usuario.
            </div>
          )}
        </Card>
      )}

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

      {/* Modal: Aprobar/Rechazar Recarga */}
      <AprobarRechazarRecargaModal
        open={openAprobarRechazar}
        onClose={() => setOpenAprobarRechazar(false)}
        onSuccess={handleAprobarRechazarSuccess}
        showToast={showToast}
      />
    </div>
  );
}
