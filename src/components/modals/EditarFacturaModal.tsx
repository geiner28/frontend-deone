'use client';

import { useEffect, useState } from 'react';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { actualizarFactura } from '@/lib/api';
import { getErrorMsg } from '@/lib/utils';
import type { Factura, FacturaEstado, FacturaValidacionEstado } from '@/types';
import { ToastType } from '@/components/ui/Toast';

interface EditarFacturaModalProps {
  open: boolean;
  factura: Factura | null;
  cantidadRecargas?: number | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
  showToast: (msg: string, type: ToastType) => void;
}

const ESTADOS: FacturaEstado[] = ['pendiente', 'pagada', 'sin_factura', 'aproximada'];
const VALIDACIONES: FacturaValidacionEstado[] = ['sin_revisar', 'revisada'];

export default function EditarFacturaModal({
  open,
  factura,
  cantidadRecargas,
  onClose,
  onSuccess,
  showToast,
}: EditarFacturaModalProps) {
  const puedeUsarGrupo2 = Number(cantidadRecargas) === 2;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    servicio: '',
    monto: '',
    etiqueta: '',
    fecha_emision: '',
    fecha_vencimiento: '',
    fecha_recordatorio: '',
    referencia_pago: '',
    tipo_referencia: '',
    pagina_pago: '',
    grupo: 1 as 1 | 2,
    estado: 'pendiente' as FacturaEstado,
    validacion_estado: 'sin_revisar' as FacturaValidacionEstado,
    observaciones_admin: '',
    motivo_rechazo: '',
  });

  useEffect(() => {
    if (!open || !factura) return;
    const grupoInicial = factura.grupo === 2 && puedeUsarGrupo2 ? 2 : 1;
    setForm({
      servicio: factura.servicio || '',
      monto: factura.monto != null ? String(factura.monto) : '',
      etiqueta: factura.etiqueta || '',
      fecha_emision: factura.fecha_emision || '',
      fecha_vencimiento: factura.fecha_vencimiento || '',
      fecha_recordatorio: factura.fecha_recordatorio || '',
      referencia_pago: factura.referencia_pago || '',
      tipo_referencia: factura.tipo_referencia || '',
      pagina_pago: factura.pagina_pago || '',
      grupo: grupoInicial,
      estado: ((['pendiente', 'pagada', 'sin_factura', 'aproximada'].includes(String(factura.estado))
        ? factura.estado
        : 'pendiente') as FacturaEstado),
      validacion_estado: ((['sin_revisar', 'revisada'].includes(String(factura.validacion_estado))
        ? factura.validacion_estado
        : 'sin_revisar') as FacturaValidacionEstado),
      observaciones_admin: factura.observaciones_admin || '',
      motivo_rechazo: factura.motivo_rechazo || '',
    });
  }, [open, factura]);

  const handleSubmit = async () => {
    if (!factura?.id) return;
    setLoading(true);
    const res = await actualizarFactura(factura.id, {
      servicio: form.servicio || undefined,
      monto: form.monto !== '' ? Number(form.monto) : undefined,
      etiqueta: form.etiqueta || undefined,
      fecha_emision: form.fecha_emision || undefined,
      fecha_vencimiento: form.fecha_vencimiento || undefined,
      fecha_recordatorio: form.fecha_recordatorio || undefined,
      referencia_pago: form.referencia_pago || undefined,
      tipo_referencia: form.tipo_referencia.trim() ? form.tipo_referencia.trim() : undefined,
      pagina_pago: form.pagina_pago || undefined,
      grupo: puedeUsarGrupo2 ? form.grupo : 1,
      estado: form.estado,
      validacion_estado: form.validacion_estado,
      observaciones_admin: form.observaciones_admin || undefined,
      motivo_rechazo: form.motivo_rechazo || undefined,
    });
    setLoading(false);

    if (res.ok) {
      showToast('Factura actualizada correctamente', 'success');
      await onSuccess();
      onClose();
    } else {
      showToast(getErrorMsg(res, 'Error al actualizar factura'), 'error');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Editar Factura" maxWidth="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Servicio"
            value={form.servicio}
            onChange={(e) => setForm((f) => ({ ...f, servicio: e.target.value }))}
          />
          <Input
            label="Monto (COP)"
            type="number"
            value={form.monto}
            onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Etiqueta"
            value={form.etiqueta}
            onChange={(e) => setForm((f) => ({ ...f, etiqueta: e.target.value }))}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#1d212b]">Grupo de pago</label>
            <select
              value={form.grupo}
              onChange={(e) => setForm((f) => ({ ...f, grupo: (Number(e.target.value) as 1 | 2) }))}
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500"
              disabled={!puedeUsarGrupo2}
            >
              <option value={1}>Grupo 1 (1 al 15)</option>
              {puedeUsarGrupo2 && <option value={2}>Grupo 2 (16 al fin de mes)</option>}
            </select>
            {!puedeUsarGrupo2 && (
              <p className="text-xs text-gray-500">Con una sola fecha de recarga solo aplica Grupo 1.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Emisión"
            type="date"
            value={form.fecha_emision}
            onChange={(e) => setForm((f) => ({ ...f, fecha_emision: e.target.value }))}
          />
          <Input
            label="Vencimiento"
            type="date"
            value={form.fecha_vencimiento}
            onChange={(e) => setForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))}
          />
          <Input
            label="Recordatorio"
            type="date"
            value={form.fecha_recordatorio}
            onChange={(e) => setForm((f) => ({ ...f, fecha_recordatorio: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Referencia de pago"
            value={form.referencia_pago}
            onChange={(e) => setForm((f) => ({ ...f, referencia_pago: e.target.value }))}
          />
          <Input
            label="Tipo de referencia (opcional)"
            value={form.tipo_referencia}
            onChange={(e) => setForm((f) => ({ ...f, tipo_referencia: e.target.value }))}
          />
        </div>

        <Input
          label="Portal de pago (URL)"
          type="url"
          value={form.pagina_pago}
          onChange={(e) => setForm((f) => ({ ...f, pagina_pago: e.target.value }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#1d212b]">Estado</label>
            <select
              value={form.estado}
              onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as FacturaEstado }))}
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm bg-white"
            >
              {ESTADOS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#1d212b]">Validación (admin)</label>
            <select
              value={form.validacion_estado}
              onChange={(e) =>
                setForm((f) => ({ ...f, validacion_estado: e.target.value as FacturaValidacionEstado }))
              }
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm bg-white"
            >
              {VALIDACIONES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Observaciones del admin"
          value={form.observaciones_admin}
          onChange={(e) => setForm((f) => ({ ...f, observaciones_admin: e.target.value }))}
        />
        <Input
          label="Motivo de rechazo"
          value={form.motivo_rechazo}
          onChange={(e) => setForm((f) => ({ ...f, motivo_rechazo: e.target.value }))}
        />

        <div className="grid grid-cols-2 gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} className="w-full" disabled={loading}>
            Cancelar
          </Button>
          <Button loading={loading} onClick={handleSubmit} className="w-full">
            <PencilSquareIcon className="h-4 w-4" /> Guardar cambios
          </Button>
        </div>
      </div>
    </Modal>
  );
}
