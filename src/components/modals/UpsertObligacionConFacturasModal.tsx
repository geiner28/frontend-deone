'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Toast, { ToastType } from '@/components/ui/Toast';
import Badge from '@/components/ui/Badge';
import { 
  createObligacion, 
  getUsuarioByTelefono, 
  capturaFactura,
  getEtiquetasDistinct,
} from '@/lib/api';
import type { 
  Obligacion, 
  CapturaFacturaData, 
  Usuario 
} from '@/types';
import { formatCurrency, getErrorMsg } from '@/lib/utils';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface Factura {
  id: string; // temporal para UI
  servicio: string;
  monto: number;
  etiqueta?: string;
  referencia_pago?: string;
  tipo_referencia?: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  estado?: string;
}

interface UpsertObligacionConFacturasModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (obligacion: Obligacion) => void;
  mode?: 'create' | 'from-profile';
  initialTelefono?: string;
}

export default function UpsertObligacionConFacturasModal({
  open,
  onClose,
  onSuccess,
  mode = 'create',
  initialTelefono,
}: UpsertObligacionConFacturasModalProps) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);

  // ─── Sección 1: Usuario ───────────────────────────────────────────────────────
  const [section1Estado, setSection1Estado] = useState<'inicial' | 'validando' | 'exito' | 'error'>('inicial');
  const [section1Expandido, setSection1Expandido] = useState(true);
  const [telefono, setTelefono] = useState('');
  const [usuarioEncontrado, setUsuarioEncontrado] = useState<Usuario | null>(null);
  const [mensajeErrorUsuario, setMensajeErrorUsuario] = useState('');

  // ─── Sección 2: Obligación ────────────────────────────────────────────────────
  const [section2Expandido, setSection2Expandido] = useState(false);
  const [obligacionForm, setObligacionForm] = useState({
    etiqueta: '',
    receptor: '',
    tipo_referencia: '',
    numero_referencia: '',
    pagina_pago: '', // "Portal de pago" en UI
    grupo: '' as '' | '1' | '2',
  });

  // Catálogo de etiquetas existentes (autocompletar)
  const [etiquetasCatalog, setEtiquetasCatalog] = useState<string[]>([]);

  // ─── Sección 3: Factura (única) ──────────────────────────────────────────────
  const [section3Expandido, setSection3Expandido] = useState(false);
  const [facturasAgregadas, setFacturasAgregadas] = useState<Factura[]>([]);
  const [facturaFormVisible, setFacturaFormVisible] = useState(true);
  const [facturaForm, setFacturaForm] = useState({
    monto: '',
    fecha_emision: '',
    fecha_vencimiento: '',
  });

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  // ─── Validación Automática de Usuario (Debounce) ──────────────────────────────
  useEffect(() => {
    const validarUsuarioAutomatico = async () => {
      if (!telefono.trim()) {
        setUsuarioEncontrado(null);
        setSection1Estado('inicial');
        setMensajeErrorUsuario('');
        return;
      }

      if (telefono.trim().length < 7) {
        setSection1Estado('error');
        setMensajeErrorUsuario('Teléfono debe tener al menos 7 caracteres');
        return;
      }

      setSection1Estado('validando');
      const res = await getUsuarioByTelefono(telefono.trim());

      if (res.ok && res.data) {
        setUsuarioEncontrado(res.data);
        setSection1Estado('exito');
        setMensajeErrorUsuario('');
        // Desplegar sección 2 automáticamente
        setSection2Expandido(true);
      } else {
        setUsuarioEncontrado(null);
        setSection1Estado('error');
        setMensajeErrorUsuario('Usuario no registrado');
      }
    };

    const timeout = setTimeout(validarUsuarioAutomatico, 400);
    return () => clearTimeout(timeout);
  }, [telefono]);

  // Si el usuario deja de ser válido, bloquear secciones 2 y 3 (pero mantener datos)
  useEffect(() => {
    if (section1Estado !== 'exito') {
      setSection2Expandido(false);
      setSection3Expandido(false);
    }
  }, [section1Estado]);

  // ─── Auto-precarga de Teléfono en modo 'from-profile' ────────────────────────
  useEffect(() => {
    if (open && mode === 'from-profile' && initialTelefono && !telefono) {
      setTelefono(initialTelefono);
    }
  }, [open, mode, initialTelefono]);

  // ─── Catálogo de etiquetas (autocompletar) ──────────────────────────────────
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const res = await getEtiquetasDistinct();
      if (!cancelled && res.ok && res.data) {
        setEtiquetasCatalog(res.data.etiquetas || []);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  // ─── Funciones de Sección 3 ───────────────────────────────────────────────────
  const handleAgregarFactura = () => {
    if (!facturaForm.monto || Number(facturaForm.monto) <= 0) {
      showToast('Ingresa un monto válido (> 0)', 'error');
      return;
    }
    if (!facturaForm.fecha_emision) {
      showToast('Selecciona la fecha de emisión', 'error');
      return;
    }
    if (!facturaForm.fecha_vencimiento) {
      showToast('Selecciona la fecha de vencimiento', 'error');
      return;
    }

    // Servicio/etiqueta/referencias se heredan de la obligación
    const newFactura: Factura = {
      id: `temp-${Date.now()}`,
      servicio: obligacionForm.receptor || obligacionForm.etiqueta || 'Factura',
      monto: Number(facturaForm.monto),
      etiqueta: obligacionForm.etiqueta || undefined,
      referencia_pago: obligacionForm.numero_referencia || undefined,
      tipo_referencia: obligacionForm.tipo_referencia || undefined,
      fecha_emision: facturaForm.fecha_emision,
      fecha_vencimiento: facturaForm.fecha_vencimiento,
      estado: 'pendiente',
    };

    setFacturasAgregadas([...facturasAgregadas, newFactura]);
    showToast('Factura agregada al listado', 'success');

    setFacturaForm({
      monto: '',
      fecha_emision: '',
      fecha_vencimiento: '',
    });
    setFacturaFormVisible(false);
  };

  const handleAgregarOtraFactura = () => {
    // Mostrar formulario nuevamente
    setFacturaFormVisible(true);
  };

  const handleEliminarFactura = (factura: Factura) => {
    setFacturasAgregadas(facturasAgregadas.filter((f) => f.id !== factura.id));
    showToast('Factura eliminada del listado', 'success');
  };

  // ─── Guardar TODO (Obligación + Facturas) en Orden ──────────────────────────────
  const handleGuardarTodo = async () => {
    if (!usuarioEncontrado) {
      showToast('Valida el usuario primero', 'error');
      return;
    }

    if (!obligacionForm.etiqueta.trim()) {
      showToast('Ingresa la etiqueta', 'error');
      return;
    }
    if (!obligacionForm.receptor.trim()) {
      showToast('Ingresa el receptor', 'error');
      return;
    }
    if (!obligacionForm.tipo_referencia.trim() || !obligacionForm.numero_referencia.trim()) {
      showToast('Completa el tipo y número de referencia', 'error');
      return;
    }
    if (facturasAgregadas.length === 0) {
      showToast('Debes agregar al menos una factura', 'error');
      return;
    }

    setLoading(true);

    try {
      // Derivar periodo (YYYY-MM-01) y descripción automáticamente desde la primera factura
      const primeraFactura = facturasAgregadas[0];
      const fechaRef = primeraFactura.fecha_emision || new Date().toISOString().split('T')[0];
      const [y, m] = fechaRef.split('-');
      const periodoDerivado = `${y}-${m}-01`;
      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      const descripcionDerivada = `${obligacionForm.receptor.trim()} — ${meses[Number(m)-1]} ${y}`;

      // PASO 1: Crear obligación
      const resObligacion = await createObligacion({
        telefono: telefono.trim(),
        descripcion: descripcionDerivada,
        periodo: periodoDerivado,
        servicio: obligacionForm.receptor.trim() || undefined,
        tipo_referencia: obligacionForm.tipo_referencia.trim() || undefined,
        numero_referencia: obligacionForm.numero_referencia.trim() || undefined,
        pagina_pago: obligacionForm.pagina_pago.trim() || undefined,
        // 🆕 Backend pendiente (BACKEND_REQUIREMENTS.md §7)
        receptor: obligacionForm.receptor.trim() || undefined,
        grupo: obligacionForm.grupo ? (Number(obligacionForm.grupo) as 1 | 2) : undefined,
      });

      if (!resObligacion.ok || !resObligacion.data) {
        throw new Error(getErrorMsg(resObligacion, 'Error al crear obligación'));
      }

      const obligacionCreada = resObligacion.data;

      // PASO 2: Crear todas las facturas en orden (servicio/etiqueta/referencias se heredan de la obligación)
      for (const factura of facturasAgregadas) {
        const resFactura = await capturaFactura({
          telefono: telefono.trim(),
          obligacion_id: obligacionCreada.id,
          servicio: obligacionForm.receptor.trim(),
          monto: Number(factura.monto),
          referencia_pago: obligacionForm.numero_referencia.trim() || undefined,
          tipo_referencia: obligacionForm.tipo_referencia.trim() || undefined,
          etiqueta: obligacionForm.etiqueta.trim() || undefined,
          fecha_emision: factura.fecha_emision || undefined,
          fecha_vencimiento: factura.fecha_vencimiento || undefined,
          origen: 'manual',
          extraccion_estado: 'ok',
        });

        if (!resFactura.ok) {
          throw new Error(`Error al guardar factura: ${getErrorMsg(resFactura)}`);
        }
      }

      setLoading(false);
      showToast('Obligación y facturas guardadas correctamente', 'success');
      onSuccess?.(obligacionCreada);
      // Esperar 1.5s para que el usuario vea el toast antes de cerrar
      setTimeout(() => {
        handleCerrar();
      }, 1500);
    } catch (err) {
      setLoading(false);
      showToast(err instanceof Error ? err.message : 'Error al guardar', 'error');
    }
  };

  // ─── Cerrar Modal y Resetear ───────────────────────────────────────────────────
  const handleCerrar = () => {
    setSection1Estado('inicial');
    setSection1Expandido(true);
    setTelefono('');
    setUsuarioEncontrado(null);
    setMensajeErrorUsuario('');

    setSection2Expandido(false);
    setObligacionForm({ etiqueta: '', receptor: '', tipo_referencia: '', numero_referencia: '', pagina_pago: '', grupo: '' });

    setSection3Expandido(false);
    setFacturasAgregadas([]);
    setFacturaFormVisible(true);
    setFacturaForm({
      monto: '',
      fecha_emision: '',
      fecha_vencimiento: '',
    });

    onClose();
  };

  const isSection1Valid = section1Estado === 'exito' && usuarioEncontrado;
  const isSection2Valid = !!(
    obligacionForm.etiqueta.trim() &&
    obligacionForm.receptor.trim() &&
    obligacionForm.tipo_referencia.trim() &&
    obligacionForm.numero_referencia.trim()
  );
  const isSection3Valid = facturasAgregadas.length > 0;

  return (
    <>
      {toast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999]">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      <Modal
        open={open}
        onClose={handleCerrar}
        title="Agregar Obligación"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* SECCIÓN 1: USUARIO */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div className={`border rounded-lg transition-all ${
            section1Estado === 'error' ? 'border-red-300 bg-red-50' : 'border-[#e5e7eb]'
          }`}>
            <button
              onClick={() => setSection1Expandido(!section1Expandido)}
              className="w-full flex items-center justify-between px-4 py-3 font-medium text-[#1d212b] hover:bg-[#f9f9f9] transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-white text-sm font-bold ${
                  isSection1Valid ? 'bg-emerald-500' : section1Estado === 'error' ? 'bg-red-500' : 'bg-gray-300'
                }`}>
                  {isSection1Valid ? '✓' : '1'}
                </div>
                <span>Usuario</span>
              </div>
              {section1Expandido ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </button>

            {section1Expandido && (
              <div className="px-4 py-4 border-t border-[#e5e7eb] space-y-3">
                

                <Input
                  label="Teléfono"
                  required
                  placeholder="3001234567"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  disabled={mode === 'from-profile'}
                />

                {mensajeErrorUsuario && section1Estado === 'error' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{mensajeErrorUsuario}</p>
                  </div>
                )}

                {isSection1Valid && usuarioEncontrado && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-sm font-medium text-emerald-700">
                      ✓ {usuarioEncontrado.nombre} {usuarioEncontrado.apellido}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      Plan: <span className="font-medium">{usuarioEncontrado.plan}</span>
                    </p>
                  </div>
                )}

                {section1Estado === 'validando' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">Validando usuario...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* SECCIÓN 2: OBLIGACIÓN */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div className={`border rounded-lg transition-all ${
            !isSection1Valid
              ? 'border-gray-200 bg-gray-50 opacity-60'
              : 'border-[#e5e7eb]'
          }`}>
            <button
              onClick={() => {
                if (isSection1Valid) setSection2Expandido(!section2Expandido);
              }}
              disabled={!isSection1Valid}
              className={`w-full flex items-center justify-between px-4 py-3 font-medium transition-colors ${
                !isSection1Valid
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-[#1d212b] hover:bg-[#f9f9f9]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-white text-sm font-bold ${
                  isSection2Valid ? 'bg-emerald-500' : !isSection1Valid ? 'bg-gray-300' : 'bg-gray-300'
                }`}>
                  {isSection2Valid ? '✓' : !isSection1Valid ? '🔒' : '2'}
                </div>
                <span>Datos de la Obligación</span>
              </div>
              {section2Expandido ? (
                <ChevronUpIcon className={`h-4 w-4 ${!isSection1Valid ? 'text-gray-400' : ''}`} />
              ) : (
                <ChevronDownIcon className={`h-4 w-4 ${!isSection1Valid ? 'text-gray-400' : ''}`} />
              )}
            </button>

            {section2Expandido && isSection1Valid && (
              <div className="px-4 py-4 border-t border-[#e5e7eb] space-y-3">
                {/* Etiqueta + Receptor */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#1d212b]">
                      Etiqueta <span className="text-[#ef4444] ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      list="etiquetas-catalog-obligacion"
                      placeholder="Seleccione"
                      value={obligacionForm.etiqueta}
                      onChange={(e) => setObligacionForm((f) => ({ ...f, etiqueta: e.target.value }))}
                      className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#ff8d2d]/50 focus:border-[#ff8d2d]"
                    />
                    <datalist id="etiquetas-catalog-obligacion">
                      {etiquetasCatalog.map((et) => <option key={et} value={et} />)}
                    </datalist>
                  </div>
                  <Input
                    label="Receptor"
                    required
                    placeholder="Placeholder"
                    value={obligacionForm.receptor}
                    onChange={(e) => setObligacionForm((f) => ({ ...f, receptor: e.target.value }))}
                  />
                </div>

                {/* Tipo de referencia + Número de referencia */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#1d212b]">
                      Tipo de referencia <span className="text-[#ef4444] ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      list="tipos-referencia-sugeridos"
                      placeholder="Seleccione"
                      value={obligacionForm.tipo_referencia}
                      onChange={(e) => setObligacionForm((f) => ({ ...f, tipo_referencia: e.target.value }))}
                      className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#ff8d2d]/50 focus:border-[#ff8d2d]"
                    />
                    <datalist id="tipos-referencia-sugeridos">
                      <option value="factura" />
                      <option value="contrato" />
                      <option value="pedido" />
                      <option value="convenio" />
                    </datalist>
                  </div>
                  <Input
                    label="Número de referencia"
                    required
                    placeholder="Placeholder"
                    value={obligacionForm.numero_referencia}
                    onChange={(e) => setObligacionForm((f) => ({ ...f, numero_referencia: e.target.value }))}
                  />
                </div>

                {/* Portal de pago + Grupo */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Portal de pago"
                    placeholder="Seleccione"
                    value={obligacionForm.pagina_pago}
                    onChange={(e) => setObligacionForm((f) => ({ ...f, pagina_pago: e.target.value }))}
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#1d212b]">Grupo</label>
                    <select
                      value={obligacionForm.grupo}
                      onChange={(e) => setObligacionForm((f) => ({ ...f, grupo: e.target.value as '' | '1' | '2' }))}
                      className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#ff8d2d]/50 focus:border-[#ff8d2d]"
                    >
                      <option value="">Seleccione</option>
                      <option value="1">Grupo 1</option>
                      <option value="2">Grupo 2</option>
                    </select>
                  </div>
                </div>

                {isSection2Valid && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-sm font-medium text-emerald-700">
                      ✓ Obligación lista para guardar
                    </p>
                  </div>
                )}
              </div>
            )}

            {!isSection1Valid && (
              <div className="px-4 py-4 text-center">
                <p className="text-sm text-gray-500">
                  Valida el usuario primero para completar la obligación
                </p>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* SECCIÓN 3: FACTURAS */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div className={`border rounded-lg transition-all ${
            !isSection1Valid || !isSection2Valid
              ? 'border-gray-200 bg-gray-50 opacity-60'
              : 'border-[#e5e7eb]'
          }`}>
            <button
              onClick={() => {
                if (isSection1Valid && isSection2Valid) setSection3Expandido(!section3Expandido);
              }}
              disabled={!isSection1Valid || !isSection2Valid}
              className={`w-full flex items-center justify-between px-4 py-3 font-medium transition-colors ${
                !isSection1Valid || !isSection2Valid
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-[#1d212b] hover:bg-[#f9f9f9]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-white text-sm font-bold ${
                  isSection3Valid ? 'bg-emerald-500' : !isSection1Valid || !isSection2Valid ? 'bg-gray-300' : 'bg-gray-300'
                }`}>
                  {isSection3Valid ? '✓' : !isSection1Valid || !isSection2Valid ? '🔒' : '3'}
                </div>
                <span>Datos de las Facturas</span>
                {facturasAgregadas.length > 0 && (
                  <Badge label={facturasAgregadas.length.toString()} variant="info" />
                )}
              </div>
              {section3Expandido ? (
                <ChevronUpIcon className={`h-4 w-4 ${!isSection1Valid || !isSection2Valid ? 'text-gray-400' : ''}`} />
              ) : (
                <ChevronDownIcon className={`h-4 w-4 ${!isSection1Valid || !isSection2Valid ? 'text-gray-400' : ''}`} />
              )}
            </button>

            {section3Expandido && isSection1Valid && isSection2Valid && (
              <div className="px-4 py-4 border-t border-[#e5e7eb] space-y-4">
                {/* Preview de facturas agregadas */}
                {facturasAgregadas.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#1d212b]">
                      Facturas agregadas ({facturasAgregadas.length})
                    </p>
                    <div className="space-y-2 bg-[#f9f9f9] p-3 rounded-lg border border-[#e5e7eb] max-h-48 overflow-y-auto">
                      {facturasAgregadas.map((factura) => (
                        <div
                          key={factura.id}
                          className="flex items-center justify-between p-2 bg-white border border-[#e5e7eb] rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1d212b]">
                              {factura.servicio}
                            </p>
                            <p className="text-xs text-[#6d7382] mt-0.5">
                              {factura.etiqueta} • {formatCurrency(Number(factura.monto))}
                            </p>
                          </div>
                          <button
                            onClick={() => handleEliminarFactura(factura)}
                            className="ml-2 p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                            title="Eliminar factura"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formulario para agregar factura (visible/oculto según state) */}
                {facturaFormVisible && (
                  <div className="pt-2 border-t border-[#e5e7eb]">
                    <p className="text-sm font-medium text-[#1d212b] mb-3">
                      {facturasAgregadas.length > 0 ? 'Nueva factura' : 'Datos de la factura'}
                    </p>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Fecha de emisión"
                          required
                          type="date"
                          value={facturaForm.fecha_emision}
                          onChange={(e) =>
                            setFacturaForm((f) => ({ ...f, fecha_emision: e.target.value }))
                          }
                        />
                        <Input
                          label="Fecha de vencimiento"
                          required
                          type="date"
                          value={facturaForm.fecha_vencimiento}
                          onChange={(e) =>
                            setFacturaForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))
                          }
                        />
                      </div>

                      <Input
                        label="Monto"
                        required
                        type="number"
                        placeholder="$ 0.00"
                        value={facturaForm.monto}
                        onChange={(e) =>
                          setFacturaForm((f) => ({ ...f, monto: e.target.value }))
                        }
                      />

                      <Button
                        onClick={handleAgregarFactura}
                        variant="secondary"
                        className="w-full"
                      >
                        {facturasAgregadas.length > 0 ? 'Agregar otra factura' : 'Agregar factura'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Botón para agregar otra factura (visible cuando hay facturas agregadas y formulario oculto) */}
                {!facturaFormVisible && facturasAgregadas.length > 0 && (
                  <Button
                    onClick={handleAgregarOtraFactura}
                    variant="secondary"
                    className="w-full"
                  >
                    + Agregar otra factura
                  </Button>
                )}
              </div>
            )}

            {(!isSection1Valid || !isSection2Valid) && (
              <div className="px-4 py-4 text-center">
                <p className="text-sm text-gray-500">
                  Completa usuario y obligación primero para agregar facturas
                </p>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* Botones de Acción */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#e5e7eb]">
            <Button variant="secondary" onClick={handleCerrar}>
              Cancelar
            </Button>
            <Button
              onClick={handleGuardarTodo}
              loading={loading}
              disabled={!isSection3Valid}
            >
              <CheckCircleIcon className="h-4 w-4" /> Guardar todo
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
