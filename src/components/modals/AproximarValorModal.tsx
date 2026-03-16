'use client';

import { useState, useEffect } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { aproximarFactura } from '@/lib/api';
import { formatCurrency, getErrorMsg } from '@/lib/utils';
import type { Factura } from '@/types';
import Toast, { ToastType } from '@/components/ui/Toast';

interface AproximarValorModalProps {
  open: boolean;
  factura: Factura | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  showToast: (msg: string, type: ToastType) => void;
}

const ADJUSTMENT_OPTIONS = [
  { label: '-30% (Reducción importante)', value: -30 },
  { label: '-25%', value: -25 },
  { label: '-20%', value: -20 },
  { label: '-15%', value: -15 },
  { label: '-10%', value: -10 },
  { label: '-5%', value: -5 },
  { label: '0% (Sin ajuste)', value: 0 },
  { label: '+5%', value: 5 },
  { label: '+10%', value: 10 },
  { label: '+15%', value: 15 },
  { label: '+20%', value: 20 },
  { label: '+25%', value: 25 },
  { label: '+30%', value: 30 },
  { label: '+40%', value: 40 },
  { label: '+50% (Aumento importante)', value: 50 },
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
      monto: montoAproximado,
      observaciones_admin: `Aproximado con ajuste ${adjustment > 0 ? '+' : ''}${adjustment}%`,
    });
    setLoading(false);

    if (res.ok) {
      showToast(
        `Factura aproximada: ${formatCurrency(montoBase)} × (1 ${adjustment > 0 ? '+' : ''}${adjustment}%) = ${formatCurrency(montoAproximado)}`,
        'success'
      );
      onClose();
      await onSuccess();
    } else {
      showToast(getErrorMsg(res, 'Error al aproximar factura'), 'error');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Aproximar Valor" maxWidth="md">
      <div className="space-y-4">
        <div className="bg-[var(--table-header)]/5 border border-[var(--table-header)]/20 rounded-xl p-3">
          <p className="text-sm font-bold text-[var(--table-header)]">
            <strong>{factura?.servicio}</strong> — Factura del mes anterior
          </p>
          <p className="text-xs text-[var(--table-header)] mt-1">
            Ajusta el monto heredado según cambios tarifarios o de consumo. Esto no valida la factura aún.
          </p>
        </div>

        {/* Información del monto base */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-700 font-medium">Monto base (mes anterior):</span>
            <span className="text-lg font-bold text-blue-900">{formatCurrency(montoBase)}</span>
          </div>
        </div>

        {/* Selector de ajuste */}
        <div>
          <label className="block text-sm font-medium text-[var(--table-header)] mb-2">
            Porcentaje
          </label>
          <select
            value={adjustment}
            onChange={(e) => setAdjustment(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff8d2d] text-sm"
          >
            {ADJUSTMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        

        {/* Monto final */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-green-700 font-medium">Monto aproximado:</span>
            <span className="text-2xl font-bold text-green-900">{formatCurrency(montoAproximado)}</span>
          </div>
          
        </div>

        {/* Botones */}
        <div className="grid grid-cols-2 gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Cancelar
          </Button>
          <Button loading={loading} onClick={handleAproximar} className="w-full">
            <ArrowPathIcon className="h-4 w-4" /> Guardar Aproximación
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AproximarValorModal;
