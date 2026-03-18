'use client';

import { useState, useEffect } from 'react';
import { XCircleIcon } from '@heroicons/react/24/outline';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import NotificationDisplay from '@/components/NotificationDisplay';
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
  const [successData, setSuccessData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMotivo('');
      setSuccessData(null);
      setErrorMessage(null);
    }
  }, [open]);

  const handleRechazar = async () => {
    if (!factura || !factura.id || !motivo.trim()) {
      showToast('Debes especificar un motivo de rechazo.', 'error');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    const res = await rechazarFactura(factura.id, { motivo_rechazo: motivo });
    setLoading(false);

    if (res.ok) {
      const data = res.data as any;
      setSuccessData(data);
      showToast('Factura rechazada', 'success');
      await onSuccess();
    } else {
      const error = getErrorMsg(res, 'Error al rechazar factura');
      setErrorMessage(error);
      showToast(error, 'error');
    }
  };

  const handleClose = () => {
    setSuccessData(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={successData ? "Factura Rechazada" : "Rechazar Factura"}>
      <div className="space-y-4">
        {successData ? (
          <>
            <NotificationDisplay
              notification={successData.notificacion}
              status="success"
              onClose={handleClose}
              title="Factura rechazada exitosamente"
            />
          </>
        ) : errorMessage ? (
          <>
            <NotificationDisplay
              notification={null}
              status="error"
              errorMessage={errorMessage}
              onClose={handleClose}
            />
            <div className="grid grid-cols-2 gap-3 pt-4">
              <Button variant="secondary" onClick={handleClose} className="w-full">
                Cerrar
              </Button>
              <Button onClick={() => { setErrorMessage(null); }} className="w-full">
                Reintentar
              </Button>
            </div>
          </>
        ) : (
          <>
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
              <Button variant="secondary" onClick={handleClose} className="w-full">
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
          </>
        )}
      </div>
    </Modal>
  );
};

export default RechazarFacturaModal;
