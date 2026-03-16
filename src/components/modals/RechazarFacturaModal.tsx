'use client';

import { useState, useEffect } from 'react';
import { XCircleIcon } from '@heroicons/react/24/outline';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { rechazarFactura } from '@/lib/api';
import { formatCurrency, getErrorMsg } from '@/lib/utils';
import type { Factura } from '@/types';
import Toast, { ToastType } from '@/components/ui/Toast';

interface RechazarFacturaModalProps {
  open: boolean;
  factura: Factura | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  showToast: (msg: string, type: ToastType) => void;
}

const RechazarFacturaModal = ({
  open,
  factura,
  onClose,
  onSuccess,
  showToast,
}: RechazarFacturaModalProps) => {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setMotivo('');
    }
  }, [open]);

  const handleRechazar = async () => {
    if (!factura || !factura.id || !motivo.trim()) {
      showToast('Debes especificar un motivo de rechazo.', 'error');
      return;
    }

    setLoading(true);
    const res = await rechazarFactura(factura.id, { motivo_rechazo: motivo });
    setLoading(false);

    if (res.ok) {
      showToast('Factura rechazada', 'success');
      onClose();
      await onSuccess();
    } else {
      showToast(getErrorMsg(res, 'Error al rechazar factura'), 'error');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Rechazar Factura">
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-sm text-red-800">
            <strong>{factura?.servicio}</strong> — {factura ? formatCurrency(factura.monto) : ''}
          </p>
          <p className="text-xs text-red-600 mt-1">
            ⚠️ Esta acción es irreversible. La factura será marcada como rechazada.
          </p>
        </div>

        <Input
          label="Motivo del rechazo"
          required
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: Comprobante ilegible, monto incorrecto, servicio no corresponde…"
        />

        <div className="grid grid-cols-2 gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Cancelar
          </Button>
          <Button
            loading={loading}
            onClick={handleRechazar}
            variant="danger"
            className="w-full"
          >
            <XCircleIcon className="h-4 w-4" /> Rechazar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RechazarFacturaModal;
