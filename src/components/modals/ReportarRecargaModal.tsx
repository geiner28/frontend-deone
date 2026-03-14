'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Toast, { ToastType } from '@/components/ui/Toast';
import { reportarRecarga } from '@/lib/api';
import type { RecargaData } from '@/types';
import { formatCurrency, getErrorMsg } from '@/lib/utils';

interface ReportarRecargaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (data: RecargaData) => void;
  onError?: (error: string) => void;
}

const initialForm = {
  telefono: '',
  periodo: '',
  monto: '',
  comprobante_url: '',
  referencia_tx: '',
};

export default function ReportarRecargaModal({
  open,
  onClose,
  onSuccess,
  onError,
}: ReportarRecargaModalProps) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleReportar = async () => {
    setLoading(true);
    const res = await reportarRecarga({ ...form, monto: Number(form.monto) });
    setLoading(false);

    if (res.ok && res.data) {
      showToast('Recarga reportada correctamente', 'success');
      if (onSuccess) {
        onSuccess(res.data);
      }
      handleClose();
    } else {
      const errorMsg = getErrorMsg(res, 'Error al reportar recarga');
      showToast(errorMsg, 'error');
      if (onError) {
        onError(errorMsg);
      }
    }
  };

  const handleClose = () => {
    setForm(initialForm);
    setToast(null);
    onClose();
  };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <Modal
        open={open}
        onClose={handleClose}
        title="Registrar Recarga"
      >
        <div className="space-y-4">
          <Input
            label="Teléfono"
            required
            placeholder="3001234567"
            value={form.telefono}
            onChange={set('telefono')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Periodo"
              required
              type="date"
              value={form.periodo}
              onChange={set('periodo')}
              hint="Mes al que corresponde la recarga"
            />
            <Input
              label="Monto (COP)"
              required
              type="number"
              value={form.monto}
              onChange={set('monto')}
              placeholder="500000"
            />
          </div>

          <Input
            label="Referencia TX"
            required
            value={form.referencia_tx}
            onChange={set('referencia_tx')}
            placeholder="TX123456789"
            hint="Referencia de la transacción bancaria"
          />

          <Input
            label="URL Comprobante"
            type="url"
            value={form.comprobante_url}
            onChange={set('comprobante_url')}
            placeholder="https://example.com/comprobante.jpg"
            hint="Link al comprobante de la transferencia"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            <Button loading={loading} onClick={handleReportar}>
              Reportar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
