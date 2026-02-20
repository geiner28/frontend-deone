'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge, { variantFromEstado } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast, { ToastType } from '@/components/ui/Toast';
import { capturaFactura, getObligaciones, validarFactura, crearPago, confirmarPago } from '@/lib/api';
import type { CapturaFacturaData, Obligacion, CrearPagoData } from '@/types';
import { formatCurrency, getErrorMsg } from '@/lib/utils';
import { useNotifications, notifFromAction } from '@/contexts/NotificationContext';
import {
  PlusIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

const initialForm = {
  telefono: '',
  obligacion_id: '',
  servicio: '',
  monto: '',
  fecha_vencimiento: '',
  fecha_emision: '',
  periodo: '',
  origen: 'manual',
  archivo_url: '',
  extraccion_estado: 'ok',
  extraccion_confianza: '0.95',
};

// ─── Workflow steps ───────────────────────────────────────────────────────────
const steps = [
  { n: 1, label: 'Capturar', desc: 'Registrar factura en la obligación', color: 'bg-blue-500' },
  { n: 2, label: 'Validar', desc: 'Admin valida datos de la factura', color: 'bg-amber-500' },
  { n: 3, label: 'Pago', desc: 'Crear intención de pago', color: 'bg-purple-500' },
  { n: 4, label: 'Confirmar', desc: 'Confirmar con comprobante', color: 'bg-emerald-500' },
];

export default function FacturasPage() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<CapturaFacturaData | null>(null);
  const [obligaciones, setObligaciones] = useState<Obligacion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const { addNotification } = useNotifications();

  const [openValidar, setOpenValidar] = useState(false);
  const [openCrearPago, setOpenCrearPago] = useState(false);
  const [openConfirmarPago, setOpenConfirmarPago] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<CapturaFacturaData | null>(null);
  const [pagoActual, setPagoActual] = useState<CrearPagoData | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const [validarForm, setValidarForm] = useState({
    monto: '',
    fecha_vencimiento: '',
    fecha_emision: '',
    observaciones_admin: '',
  });

  const [confirmarForm, setConfirmarForm] = useState({
    proveedor_pago: '',
    referencia_pago: '',
    comprobante_pago_url: '',
  });

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newForm = { ...form, [key]: e.target.value };
    setForm(newForm);
    if (key === 'telefono' && e.target.value) {
      handleSearchObligaciones(e.target.value);
      setForm({ ...newForm, obligacion_id: '' });
    }
  };

  const handleSearchObligaciones = async (telefono: string) => {
    if (!telefono.trim()) return;
    setSearchLoading(true);
    const res = await getObligaciones(telefono.trim());
    setSearchLoading(false);
    if (res.ok && res.data) setObligaciones(res.data);
    else setObligaciones([]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const res = await capturaFactura({
      ...form,
      monto: Number(form.monto),
      extraccion_confianza: Number(form.extraccion_confianza),
    });
    setLoading(false);
    if (res.ok && res.data) {
      setResult(res.data);
      setOpen(false);
      setForm(initialForm);
      setCurrentStep(1);
      showToast('Factura capturada correctamente', 'success');
      addNotification(notifFromAction('factura_nueva', { servicio: res.data.servicio, monto: formatCurrency(res.data.monto), telefono: form.telefono }));
    } else {
      showToast(getErrorMsg(res, 'Error al capturar factura'), 'error');
    }
  };

  const handleValidarFactura = async () => {
    if (!facturaSeleccionada) return;
    setLoading(true);
    const res = await validarFactura(facturaSeleccionada.factura_id, {
      monto: Number(validarForm.monto),
      fecha_vencimiento: validarForm.fecha_vencimiento,
      fecha_emision: validarForm.fecha_emision,
      observaciones_admin: validarForm.observaciones_admin,
    });
    setLoading(false);
    if (res.ok && res.data) {
      setResult((prev) => prev ? { ...prev, estado: res.data!.estado } : prev);
      setCurrentStep(2);
      showToast('Factura validada correctamente', 'success');
      setOpenValidar(false);
      setValidarForm({ monto: '', fecha_vencimiento: '', fecha_emision: '', observaciones_admin: '' });
    } else {
      showToast(getErrorMsg(res, 'Error al validar factura'), 'error');
    }
  };

  const handleCrearPago = async () => {
    if (!facturaSeleccionada) return;
    const telefono = form.telefono || '';
    if (!telefono) { showToast('Debe especificar el teléfono', 'error'); return; }
    setLoading(true);
    const res = await crearPago({ telefono, factura_id: facturaSeleccionada.factura_id });
    setLoading(false);
    if (res.ok && res.data) {
      setPagoActual(res.data);
      setCurrentStep(3);
      showToast('Pago creado correctamente', 'success');
      setOpenCrearPago(false);
    } else {
      showToast(getErrorMsg(res, 'Error al crear pago'), 'error');
    }
  };

  const handleConfirmarPago = async () => {
    if (!pagoActual) return;
    setLoading(true);
    const res = await confirmarPago(pagoActual.pago_id, confirmarForm);
    setLoading(false);
    if (res.ok) {
      setCurrentStep(4);
      showToast('Pago confirmado correctamente', 'success');
      addNotification(notifFromAction('pago_confirmado', {
        servicio: facturaSeleccionada?.servicio ?? '',
        monto: pagoActual ? formatCurrency(pagoActual.monto) : '',
        telefono: form.telefono,
      }));
      setOpenConfirmarPago(false);
      setConfirmarForm({ proveedor_pago: '', referencia_pago: '', comprobante_pago_url: '' });
      setPagoActual(null);
    } else {
      showToast(getErrorMsg(res, 'Error al confirmar pago'), 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex gap-3">
        <Button onClick={() => setOpen(true)}>
          <PlusIcon className="h-4 w-4" /> Capturar Factura
        </Button>
      </div>

      {/* Workflow Stepper */}
      <Card>
        <CardHeader title="📋 Flujo de facturación" subtitle="Proceso completo de captura a pago confirmado" />
        <div className="flex items-center gap-2">
          {steps.map(({ n, label, desc, color }, i) => (
            <div key={n} className="flex items-center flex-1">
              <div className={`flex-1 rounded-xl p-3 transition-all ${n <= currentStep ? 'bg-white shadow-sm ring-1 ring-gray-100' : 'bg-gray-50 opacity-60'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${n <= currentStep ? color : 'bg-gray-300'}`}>
                    {n <= currentStep && n < currentStep ? '✓' : n}
                  </div>
                  <span className="text-xs font-bold text-gray-900">{label}</span>
                </div>
                <p className="text-[10px] text-gray-500 leading-tight">{desc}</p>
              </div>
              {i < steps.length - 1 && <ArrowRightIcon className="h-3.5 w-3.5 text-gray-300 mx-1 shrink-0" />}
            </div>
          ))}
        </div>
      </Card>

      {/* Result card */}
      {result && (
        <Card className="animate-fade-in-up relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />
          <CardHeader
            title="Última factura procesada"
            action={<Badge label={result.estado} variant={variantFromEstado(result.estado)} />}
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoItem label="Servicio" value={result.servicio} />
            <InfoItem label="Monto" value={formatCurrency(result.monto)} />
            <InfoItem label="Req. revisión" value={result.requiere_revision ? 'Sí' : 'No'} />
            <InfoItem label="ID Factura" value={<span className="font-mono text-xs break-all">{result.factura_id.slice(0, 16)}…</span>} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {result.estado === 'extraida' && (
              <Button size="sm" onClick={() => {
                setFacturaSeleccionada(result);
                setValidarForm({ monto: result.monto.toString(), fecha_vencimiento: '', fecha_emision: '', observaciones_admin: '' });
                setOpenValidar(true);
              }}>
                <CheckCircleIcon className="h-4 w-4" /> Validar Factura
              </Button>
            )}
            {result.estado === 'validada' && (
              <Button size="sm" onClick={() => { setFacturaSeleccionada(result); setOpenCrearPago(true); }}>
                <CheckCircleIcon className="h-4 w-4" /> Crear Pago
              </Button>
            )}
            {pagoActual && pagoActual.estado === 'en_proceso' && (
              <Button size="sm" onClick={() => setOpenConfirmarPago(true)}>
                <CheckCircleIcon className="h-4 w-4" /> Confirmar Pago
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Modal: Capturar */}
      <Modal open={open} onClose={() => setOpen(false)} title="Capturar Factura" maxWidth="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Teléfono" required value={form.telefono} onChange={set('telefono')} placeholder="3001234567" />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Obligación</label>
              {searchLoading ? (
                <div className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500">Cargando...</div>
              ) : obligaciones.length > 0 ? (
                <select
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.obligacion_id}
                  onChange={(e) => setForm((f) => ({ ...f, obligacion_id: e.target.value }))}
                  required
                >
                  <option value="">Selecciona una obligación</option>
                  {obligaciones.map((o) => (
                    <option key={o.id} value={o.id}>{o.servicio} - {o.descripcion} ({o.estado})</option>
                  ))}
                </select>
              ) : form.telefono ? (
                <div className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500">No hay obligaciones</div>
              ) : (
                <div className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500">Ingresa un teléfono</div>
              )}
            </div>
          </div>
          <Input label="Servicio" required value={form.servicio} onChange={set('servicio')} placeholder="EPM Energía" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monto (COP)" required type="number" value={form.monto} onChange={set('monto')} placeholder="150000" />
            <Input label="Periodo" required value={form.periodo} onChange={set('periodo')} placeholder="2026-02" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha emisión" required type="date" value={form.fecha_emision} onChange={set('fecha_emision')} />
            <Input label="Fecha vencimiento" required type="date" value={form.fecha_vencimiento} onChange={set('fecha_vencimiento')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Origen</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.origen} onChange={set('origen')}>
                <option value="manual">Manual</option>
                <option value="bot_whatsapp">Bot WhatsApp</option>
                <option value="api">API</option>
              </select>
            </div>
            <Input label="Confianza extracción" type="number" step="0.01" min="0" max="1" value={form.extraccion_confianza} onChange={set('extraccion_confianza')} />
          </div>
          <Input label="URL Archivo (opcional)" type="url" value={form.archivo_url} onChange={set('archivo_url')} placeholder="https://example.com/factura.pdf" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button loading={loading} onClick={handleSubmit}>
              <CheckCircleIcon className="h-4 w-4" /> Capturar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Validar */}
      <Modal open={openValidar} onClose={() => setOpenValidar(false)} title="Validar Factura">
        <div className="space-y-4">
          <Input label="Monto (COP)" required type="number" value={validarForm.monto} onChange={(e) => setValidarForm((f) => ({ ...f, monto: e.target.value }))} placeholder="150000" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha emisión" required type="date" value={validarForm.fecha_emision} onChange={(e) => setValidarForm((f) => ({ ...f, fecha_emision: e.target.value }))} />
            <Input label="Fecha vencimiento" required type="date" value={validarForm.fecha_vencimiento} onChange={(e) => setValidarForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))} />
          </div>
          <Input label="Observaciones (opcional)" value={validarForm.observaciones_admin} onChange={(e) => setValidarForm((f) => ({ ...f, observaciones_admin: e.target.value }))} placeholder="Notas sobre la validación..." />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpenValidar(false)}>Cancelar</Button>
            <Button loading={loading} onClick={handleValidarFactura}>
              <CheckCircleIcon className="h-4 w-4" /> Validar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Crear Pago */}
      <Modal open={openCrearPago} onClose={() => setOpenCrearPago(false)} title="Crear Pago">
        <div className="space-y-4">
          <Input label="Teléfono del cliente" required value={form.telefono} onChange={set('telefono')} placeholder="3001234567" hint="Teléfono del cliente dueño de la factura" />
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800"><strong>Factura:</strong> {facturaSeleccionada?.servicio}</p>
            <p className="text-sm text-blue-800"><strong>Monto:</strong> {facturaSeleccionada ? formatCurrency(facturaSeleccionada.monto) : ''}</p>
            <p className="text-sm text-blue-800 break-all"><strong>ID:</strong> {facturaSeleccionada?.factura_id}</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpenCrearPago(false)}>Cancelar</Button>
            <Button loading={loading} onClick={handleCrearPago}>
              <CheckCircleIcon className="h-4 w-4" /> Crear Pago
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirmar Pago */}
      <Modal open={openConfirmarPago} onClose={() => setOpenConfirmarPago(false)} title="Confirmar Pago">
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm text-emerald-800"><strong>ID Pago:</strong> {pagoActual?.pago_id}</p>
            <p className="text-sm text-emerald-800"><strong>Monto:</strong> {pagoActual ? formatCurrency(pagoActual.monto) : ''}</p>
          </div>
          <Input label="Proveedor de pago" required value={confirmarForm.proveedor_pago} onChange={(e) => setConfirmarForm((f) => ({ ...f, proveedor_pago: e.target.value }))} placeholder="PSE, Nequi, Daviplata, etc." />
          <Input label="Referencia de pago" required value={confirmarForm.referencia_pago} onChange={(e) => setConfirmarForm((f) => ({ ...f, referencia_pago: e.target.value }))} placeholder="TX-PSE-123456" />
          <Input label="URL del comprobante" required type="url" value={confirmarForm.comprobante_pago_url} onChange={(e) => setConfirmarForm((f) => ({ ...f, comprobante_pago_url: e.target.value }))} placeholder="https://example.com/comprobante.jpg" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpenConfirmarPago(false)}>Cancelar</Button>
            <Button loading={loading} onClick={handleConfirmarPago}>
              <CheckCircleIcon className="h-4 w-4" /> Confirmar Pago
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <div className="text-sm font-medium text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}
