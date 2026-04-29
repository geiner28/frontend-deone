'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { aproximarFactura } from '@/lib/api';
import { formatCurrency, getErrorMsg } from '@/lib/utils';
import type { Factura } from '@/types';
import type { ToastType } from '@/components/ui/Toast';

interface AproximarValorModalProps {
  open: boolean;
  factura: Factura | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  showToast: (msg: string, type: ToastType) => void;
}

const ADJUSTMENT_OPTIONS = [
  { label: '-30%', value: -30 },
  { label: '-25%', value: -25 },
  { label: '-20%', value: -20 },
  { label: '-15%', value: -15 },
  { label: '-10%', value: -10 },
  { label: '-5%', value: -5 },
  { label: '0%', value: 0 },
  { label: '5%', value: 5 },
  { label: '10%', value: 10 },
  { label: '15%', value: 15 },
  { label: '20%', value: 20 },
  { label: '25%', value: 25 },
  { label: '30%', value: 30 },
  { label: '40%', value: 40 },
  { label: '50%', value: 50 },
];

const AproximarValorModal = ({
  open,
  factura,
  onClose,
  onSuccess,
  showToast,
}: AproximarValorModalProps) => {
  const [adjustment, setAdjustment] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setAdjustment(10);
    }
  }, [open]);

  const montoBase = factura?.monto ?? 0;
  const montoAproximado = Math.round(montoBase * (1 + adjustment / 100));

  const handleAproximar = async () => {
    if (!factura || !factura.id) {
      showToast('Error: No se pudo identificar la factura.', 'error');
      return;
    }

    setLoading(true);
    const res = await aproximarFactura(factura.id, {
      porcentaje: adjustment,
      observaciones_admin: `Aproximado con ajuste ${adjustment > 0 ? '+' : ''}${adjustment}%`,
    });
    setLoading(false);

    if (res.ok) {
      showToast(
        `Factura aproximada: ${formatCurrency(montoBase)} → ${formatCurrency(montoAproximado)}`,
        'success'
      );
      onClose();
      await onSuccess();
    } else {
      showToast(getErrorMsg(res, 'Error al aproximar factura'), 'error');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Aproximar" maxWidth="md">
      <div className="space-y-5">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#1d212b]">
            Porcentaje <span className="text-[#ef4444]">*</span>
          </label>
          <select
            value={adjustment}
            onChange={(e) => setAdjustment(Number(e.target.value))}
            className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-lg bg-white text-sm text-[#1d212b] focus:outline-none focus:ring-2 focus:ring-[#ff8d2d]/50 focus:border-[#ff8d2d]"
          >
            {ADJUSTMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Cancelar
          </Button>
          <Button loading={loading} onClick={handleAproximar} className="w-full">
            Guardar cambios
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AproximarValorModal;

