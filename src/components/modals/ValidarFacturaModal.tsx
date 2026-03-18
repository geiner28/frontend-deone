'use client';

import { useState, useEffect } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import NotificationDisplay from '@/components/NotificationDisplay';
import { validarFactura } from '@/lib/api';
import { formatCurrency, getErrorMsg } from '@/lib/utils';
import type { Factura } from '@/types';
import Toast, { ToastType } from '@/components/ui/Toast';

interface ValidarFacturaModalProps {
  open: boolean;
  factura: Factura | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  showToast: (msg: string, type: ToastType) => void;
}

const ValidarFacturaModal = ({
  open,
  factura,
  onClose,
  onSuccess,
  showToast,
}: ValidarFacturaModalProps) => {
  const [form, setForm] = useState({
    monto: '',
    servicio: '',
    periodo: '',
    referencia_pago: '',
    etiqueta: '',
    fecha_emision: '',
    fecha_vencimiento: '',
    origen: '',
    extraccion_estado: '',
    archivo_url: '',
    observaciones_admin: '',
  });
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (factura && open) {
      setForm({
        monto: factura.monto.toString(),
        servicio: factura.servicio ?? '',
        periodo: factura.periodo ?? '',
        referencia_pago: factura.referencia_pago ?? '',
        etiqueta: factura.etiqueta ?? '',
        fecha_emision: factura.fecha_emision ?? '',
        fecha_vencimiento: factura.fecha_vencimiento ?? '',
        origen: factura.origen ?? '',
        extraccion_estado: factura.extraccion_estado ?? '',
        archivo_url: factura.archivo_url ?? '',
        observaciones_admin: '',
      });
      setSuccessData(null);
      setErrorMessage(null);
    }
  }, [factura, open]);

  const handleValidar = async () => {
    if (!factura || !factura.id) {
      showToast('Error: No se pudo identificar la factura.', 'error');
      return;
    }

    // Validar monto
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0) {
      showToast('El monto es requerido y debe ser un número mayor a 0.', 'error');
      return;
    }

    // Validar fechas
    if (form.fecha_emision && form.fecha_vencimiento) {
      const emision = new Date(form.fecha_emision);
      const vencimiento = new Date(form.fecha_vencimiento);
      if (vencimiento <= emision) {
        showToast('La fecha de vencimiento debe ser posterior a la emisión.', 'error');
        return;
      }
    }

    setLoading(true);
    setErrorMessage(null);
    const res = await validarFactura(factura.id, {
      monto: Number(form.monto),
      fecha_vencimiento: form.fecha_vencimiento || undefined,
      fecha_emision: form.fecha_emision || undefined,
      referencia_pago: form.referencia_pago || undefined,
      etiqueta: form.etiqueta || undefined,
      observaciones_admin: form.observaciones_admin || undefined,
    });
    setLoading(false);

    if (res.ok) {
      const data = res.data as any;
      setSuccessData(data);
      showToast('Factura validada correctamente', 'success');
      await onSuccess();
    } else {
      const error = getErrorMsg(res, 'Error al validar factura');
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
    <Modal open={open} onClose={handleClose} title={successData ? "Factura Validada" : "Editar Factura"} maxWidth="lg">
      <div className="space-y-4">
        {successData ? (
          <>
            <NotificationDisplay
              notification={successData.notificacion}
              status="success"
              onClose={handleClose}
              title="Factura validada exitosamente"
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
            <div className="bg-[var(--table-header)]/5 border border-[var(--table-header)]/20 rounded-xl p-3">
              <p className="text-sm font-bold text-[var(--table-header)]">
                <strong>{factura?.servicio}</strong> — {factura ? formatCurrency(factura.monto) : ''}
              </p>
              <p className="text-xs text-[var(--table-header)] mt-1">
                Verifica y corrige los datos extraídos. Al guardar, la factura quedará validada.
              </p>
            </div>

            <Input
              label="Servicio"
              value={form.servicio}
              disabled
            />

            <Input
              label="Monto (COP)"
              type="number"
              required
              value={form.monto}
              onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
            />

            <Input
              label="Período"
              value={form.periodo}
              disabled
            />

            <Input
              label="Referencia de pago (opcional)"
              value={form.referencia_pago}
              onChange={(e) => setForm((f) => ({ ...f, referencia_pago: e.target.value }))}
              placeholder="TX-PSE-123456"
            />

            <Input
              label="Etiqueta (opcional)"
              value={form.etiqueta}
              onChange={(e) => setForm((f) => ({ ...f, etiqueta: e.target.value }))}
              placeholder="Ej: Factura Marzo"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Fecha emisión"
                type="date"
                value={form.fecha_emision}
                onChange={(e) => setForm((f) => ({ ...f, fecha_emision: e.target.value }))}
              />
              <Input
                label="Fecha vencimiento"
                type="date"
                value={form.fecha_vencimiento}
                onChange={(e) => setForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Origen" value={form.origen} disabled />
              <Input label="Estado extracción" value={form.extraccion_estado} disabled />
            </div>

            <Input
              label="URL Archivo (opcional)"
              type="url"
              value={form.archivo_url}
              disabled
            />

            <Input
              label="Observaciones del admin (opcional)"
              value={form.observaciones_admin}
              onChange={(e) => setForm((f) => ({ ...f, observaciones_admin: e.target.value }))}
              placeholder="Datos verificados correctamente…"
            />

            <div className="grid grid-cols-2 gap-3 pt-4">
              <Button variant="secondary" onClick={handleClose} className="w-full">
                Cancelar
              </Button>
              <Button loading={loading} onClick={handleValidar} className="w-full">
                <CheckCircleIcon className="h-4 w-4" /> Guardar y Validar
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ValidarFacturaModal;
