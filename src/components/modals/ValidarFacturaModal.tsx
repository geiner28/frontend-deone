'use client';

import { useState, useEffect } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
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
    tipo_referencia: '',
    etiqueta: '',
    fecha_emision: '',
    fecha_vencimiento: '',
    origen: '',
    extraccion_estado: '',
    archivo_url: '',
    observaciones_admin: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (factura && open) {
      setForm({
        monto: factura.monto.toString(),
        servicio: factura.servicio ?? '',
        periodo: factura.periodo ?? '',
        referencia_pago: factura.referencia_pago ?? '',
        tipo_referencia: factura.tipo_referencia ?? '',
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
      setFieldErrors({});
      setShowConfirmation(false);
    }
  }, [factura, open]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0) {
      errors.monto = 'El monto es requerido y debe ser mayor a 0';
    }
    if (!form.servicio.trim()) {
      errors.servicio = 'El servicio es requerido';
    }
    if (!form.fecha_emision) {
      errors.fecha_emision = 'La fecha de emisión es requerida';
    }
    if (!form.fecha_vencimiento) {
      errors.fecha_vencimiento = 'La fecha de vencimiento es requerida';
    }
    if (form.fecha_emision && form.fecha_vencimiento) {
      const emision = new Date(form.fecha_emision);
      const vencimiento = new Date(form.fecha_vencimiento);
      if (vencimiento <= emision) {
        errors.fecha_vencimiento = 'Debe ser posterior a la fecha de emisión';
      }
    }
    if (!form.referencia_pago.trim()) {
      errors.referencia_pago = 'La referencia de pago es requerida';
    }
    if (!form.tipo_referencia.trim()) {
      errors.tipo_referencia = 'El tipo de referencia es requerido';
    }
    if (!form.etiqueta.trim()) {
      errors.etiqueta = 'La etiqueta es requerida';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePreValidar = () => {
    if (!factura || !factura.id) {
      showToast('Error: No se pudo identificar la factura.', 'error');
      return;
    }
    if (!validateForm()) {
      showToast('Por favor completa todos los campos requeridos.', 'error');
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmarValidacion = async () => {
    if (!factura || !factura.id) return;

    setLoading(true);
    setErrorMessage(null);
    const res = await validarFactura(factura.id, {
      monto: Number(form.monto),
      servicio: form.servicio,
      fecha_vencimiento: form.fecha_vencimiento,
      fecha_emision: form.fecha_emision,
      referencia_pago: form.referencia_pago,
      tipo_referencia: form.tipo_referencia,
      etiqueta: form.etiqueta,
      archivo_url: form.archivo_url || undefined,
      observaciones_admin: form.observaciones_admin || undefined,
    });
    setLoading(false);

    if (res.ok) {
      const data = res.data as any;
      setSuccessData(data);
      setShowConfirmation(false);
      showToast('Factura validada correctamente', 'success');
      await onSuccess();
    } else {
      const error = getErrorMsg(res, 'Error al validar factura');
      setErrorMessage(error);
      setShowConfirmation(false);
      showToast(error, 'error');
    }
  };

  const handleClose = () => {
    setSuccessData(null);
    setErrorMessage(null);
    setShowConfirmation(false);
    setFieldErrors({});
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={successData ? "Factura Validada" : showConfirmation ? "Confirmar Validación" : "Editar Factura"}
      maxWidth="lg"
    >
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
        ) : showConfirmation ? (
          <>
            <div className="bg-[#fff7ed] border border-[#ff8d2d]/30 rounded-xl p-4 flex gap-3 items-start">
              <ExclamationTriangleIcon className="h-6 w-6 text-[#ff8d2d] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#1d212b]">
                  ¿Estás seguro de validar esta factura?
                </p>
                <p className="text-xs text-[#6d7382] mt-1">
                  Una vez validada, esta información <strong>no podrá ser modificada</strong>.
                  Por favor, revisa cuidadosamente los datos antes de continuar.
                </p>
              </div>
            </div>

            <div className="bg-[#f9f9f9] border border-[#e5e7eb] rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-[#6d7382] uppercase tracking-wide mb-2">Resumen de datos</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <div>
                  <span className="text-[#6d7382]">Servicio:</span>{' '}
                  <span className="font-medium text-[#1d212b]">{form.servicio}</span>
                </div>
                <div>
                  <span className="text-[#6d7382]">Monto:</span>{' '}
                  <span className="font-medium text-[#1d212b]">{formatCurrency(Number(form.monto))}</span>
                </div>
                <div>
                  <span className="text-[#6d7382]">Etiqueta:</span>{' '}
                  <span className="font-medium text-[#1d212b]">{form.etiqueta}</span>
                </div>
                <div>
                  <span className="text-[#6d7382]">Período:</span>{' '}
                  <span className="font-medium text-[#1d212b]">{form.periodo || '—'}</span>
                </div>
                <div>
                  <span className="text-[#6d7382]">Emisión:</span>{' '}
                  <span className="font-medium text-[#1d212b]">{form.fecha_emision}</span>
                </div>
                <div>
                  <span className="text-[#6d7382]">Vencimiento:</span>{' '}
                  <span className="font-medium text-[#1d212b]">{form.fecha_vencimiento}</span>
                </div>
                <div>
                  <span className="text-[#6d7382]">Referencia:</span>{' '}
                  <span className="font-medium text-[#1d212b]">{form.referencia_pago}</span>
                </div>
                <div>
                  <span className="text-[#6d7382]">Tipo ref:</span>{' '}
                  <span className="font-medium text-[#1d212b]">{form.tipo_referencia}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowConfirmation(false)} className="w-full">
                Volver a revisar
              </Button>
              <Button loading={loading} onClick={handleConfirmarValidacion} className="w-full">
                <CheckCircleIcon className="h-4 w-4" /> Confirmar Validación
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
              required
              value={form.servicio}
              onChange={(e) => setForm((f) => ({ ...f, servicio: e.target.value }))}
              error={fieldErrors.servicio}
            />

            <Input
              label="Monto (COP)"
              type="number"
              required
              value={form.monto}
              onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
              error={fieldErrors.monto}
            />

            <Input
              label="Período"
              value={form.periodo}
              disabled
            />

            <Input
              label="Referencia de pago"
              required
              value={form.referencia_pago}
              onChange={(e) => setForm((f) => ({ ...f, referencia_pago: e.target.value }))}
              placeholder="TX-PSE-123456"
              error={fieldErrors.referencia_pago}
            />

            <Input
              label="Tipo de referencia"
              required
              value={form.tipo_referencia}
              onChange={(e) => setForm((f) => ({ ...f, tipo_referencia: e.target.value }))}
              placeholder="Ej: PSE, Bancolombia, Nequi..."
              error={fieldErrors.tipo_referencia}
            />

            <Input
              label="Etiqueta"
              required
              value={form.etiqueta}
              onChange={(e) => setForm((f) => ({ ...f, etiqueta: e.target.value }))}
              placeholder="Ej: Factura Marzo"
              error={fieldErrors.etiqueta}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Fecha emisión"
                type="date"
                required
                value={form.fecha_emision}
                onChange={(e) => setForm((f) => ({ ...f, fecha_emision: e.target.value }))}
                error={fieldErrors.fecha_emision}
              />
              <Input
                label="Fecha vencimiento"
                type="date"
                required
                value={form.fecha_vencimiento}
                onChange={(e) => setForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))}
                error={fieldErrors.fecha_vencimiento}
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
              onChange={(e) => setForm((f) => ({ ...f, archivo_url: e.target.value }))}
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
              <Button onClick={handlePreValidar} className="w-full">
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
