'use client';

import { useState, useEffect } from 'react';
import { BanknotesIcon } from '@heroicons/react/24/outline';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import NotificationDisplay from '@/components/NotificationDisplay';
import { crearPago, confirmarPago } from '@/lib/api';
import { formatCurrency, getErrorMsg } from '@/lib/utils';
import type { Factura, AdminClientePerfilData } from '@/types';
import Toast, { ToastType } from '@/components/ui/Toast';

interface PagarFacturaModalProps {
  open: boolean;
  factura: Factura | null;
  perfil: AdminClientePerfilData | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  showToast: (msg: string, type: ToastType) => void;
}

const PagarFacturaModal = ({
  open,
  factura,
  perfil,
  onClose,
  onSuccess,
  showToast,
}: PagarFacturaModalProps) => {
  const [form, setForm] = useState({
    proveedor_pago: '',
    referencia_pago: '',
    comprobante_pago_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        proveedor_pago: '',
        referencia_pago: '',
        comprobante_pago_url: '',
      });
      setSuccessData(null);
      setErrorMessage(null);
    }
  }, [open]);

  const handlePagar = async () => {
    if (!factura || !factura.id) {
      showToast('Error: No se pudo identificar la factura.', 'error');
      return;
    }

    if (!form.proveedor_pago.trim()) {
      showToast('El proveedor de pago es requerido.', 'error');
      return;
    }

    if (!form.referencia_pago.trim()) {
      showToast('La referencia de pago es requerida.', 'error');
      return;
    }

    setLoading(true);

    // PASO 1: Crear Pago
    const crearRes = await crearPago({
      telefono: perfil?.usuario.telefono || '',
      factura_id: factura.id,
    });

    if (!crearRes.ok || !crearRes.data) {
      setLoading(false);
      const errMsg = getErrorMsg(crearRes, 'Error al crear pago');

      if (
        errMsg.toLowerCase().includes('fondos insuficientes') ||
        errMsg.toLowerCase().includes('insufficient')
      ) {
        showToast(
          `Saldo insuficiente para este periodo. ${errMsg}. ` +
          `Reporta una recarga para el período de esta obligación.`,
          'error'
        );
      } else {
        showToast(errMsg, 'error');
      }
      return;
    }

    // PASO 2: Confirmar Pago
    const confRes = await confirmarPago(crearRes.data.pago_id, {
      proveedor_pago: form.proveedor_pago || undefined,
      referencia_pago: form.referencia_pago || undefined,
      comprobante_pago_url: form.comprobante_pago_url || undefined,
    });

    setLoading(false);

    if (confRes.ok) {
      const data = confRes.data as any;
      setSuccessData(data);
      showToast('Pago confirmado exitosamente', 'success');
      // El backend dispara automáticamente la campaña `obligacion_cumplida`
      // cuando obligacion_estado pasa a 'completada' (PUT /pagos/:id/confirmar).
      await onSuccess();
    } else {
      const error = getErrorMsg(confRes, 'Error al confirmar pago');
      setErrorMessage(error);
      showToast(error, 'error');
    }
  };

  const saldoGlobal = perfil?.resumen.saldo_disponible || 0;
  const tieneBalance = factura && saldoGlobal >= factura.monto;

  const handleClose = () => {
    setSuccessData(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={successData ? "Pago Confirmado" : "Pagar Factura"}>
      <div className="space-y-4">
        {successData ? (
          <NotificationDisplay
            notification={successData.notificacion}
            status="success"
            onClose={handleClose}
            title="Pago confirmado exitosamente"
          />
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
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-sm text-emerald-800">
            <strong>{factura?.servicio}</strong> — {factura ? formatCurrency(factura.monto) : ''}
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            Se creará un pago y se confirmará automáticamente
          </p>
        </div>

        {/* BLOQUE CRÍTICO: Información de Saldo */}
        <div
          className={`border rounded-xl p-3 ${
            tieneBalance
              ? 'bg-[var(--table-header)]/5 border-[var(--table-header)]/20'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600">
              💰 Saldo global del usuario
            </p>
            <p
              className={`text-sm font-bold ${
                saldoGlobal >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(saldoGlobal)}
            </p>
          </div>

          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500">Total recargas</p>
            <p className="text-xs font-semibold text-indigo-600">
              {formatCurrency(
                perfil?.resumen.total_recargas_aprobadas || 0
              )}
            </p>
          </div>

          <div className="flex items-center justify-between mt-0.5">
            <p className="text-xs text-gray-500">Total pagos</p>
            <p className="text-xs font-semibold text-amber-600">
              {formatCurrency(perfil?.resumen.total_pagos_realizados || 0)}
            </p>
          </div>

          {factura && saldoGlobal < factura.monto && (
            <div className="mt-2 bg-amber-100 rounded-lg p-2">
              <p className="text-xs text-amber-700 font-medium">
                ⚠️ El saldo global parece insuficiente. Intenta realizar una recarga.
                Cuendo esta sea validada, el saldo se actualizará automáticamente.
        
              </p>
            </div>
          )}
        </div>

        <Input
          label="Proveedor de pago"
          value={form.proveedor_pago}
          onChange={(e) =>
            setForm((f) => ({ ...f, proveedor_pago: e.target.value }))
          }
          placeholder="PSE, Nequi, Daviplata, Transferencia, etc."
        />

        <Input
          label="Referencia de pago"
          value={form.referencia_pago}
          onChange={(e) =>
            setForm((f) => ({ ...f, referencia_pago: e.target.value }))
          }
          placeholder="TX-PSE-123456"
        />

        <Input
          label="URL Comprobante (opcional)"
          type="url"
          value={form.comprobante_pago_url}
          onChange={(e) =>
            setForm((f) => ({ ...f, comprobante_pago_url: e.target.value }))
          }
          placeholder="https://..."
        />

        <div className="grid grid-cols-2 gap-3 pt-4">
          <Button variant="secondary" onClick={handleClose} className="w-full">
            Cancelar
          </Button>
          <Button loading={loading} onClick={handlePagar} className="w-full">
            <BanknotesIcon className="h-4 w-4" /> Crear y Confirmar Pago
          </Button>
        </div>
        </>
        )}
      </div>
    </Modal>
  );
};

export default PagarFacturaModal;
