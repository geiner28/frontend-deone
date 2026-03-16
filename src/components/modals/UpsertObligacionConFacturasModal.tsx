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
  capturaFactura 
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
  monto: string;
  referencia_pago: string;
  etiqueta: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  archivo_url: string;
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
    descripcion: '',
    periodo: '',
  });

  // ─── Sección 3: Facturas ──────────────────────────────────────────────────────
  const [section3Expandido, setSection3Expandido] = useState(false);
  const [facturasAgregadas, setFacturasAgregadas] = useState<Factura[]>([]);
  const [facturaFormVisible, setFacturaFormVisible] = useState(true);
  const [facturaForm, setFacturaForm] = useState({
    servicio: '',
    monto: '',
    referencia_pago: '',
    etiqueta: '',
    fecha_emision: '',
    fecha_vencimiento: '',
    archivo_url: '',
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

  // ─── Funciones de Sección 3 ───────────────────────────────────────────────────
  const handleAgregarFactura = () => {
    // Validaciones
    if (!facturaForm.servicio.trim()) {
      showToast('Ingresa el nombre del servicio', 'error');
      return;
    }
    if (!facturaForm.monto || Number(facturaForm.monto) <= 0) {
      showToast('Ingresa un monto válido (> 0)', 'error');
      return;
    }
    if (!facturaForm.referencia_pago.trim()) {
      showToast('Ingresa la referencia de pago', 'error');
      return;
    }
    if (!facturaForm.etiqueta.trim()) {
      showToast('Ingresa una etiqueta', 'error');
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

    // Agregar a lista temporal (sin guardar aún en la BD)
    const newFactura: Factura = {
      id: `temp-${Date.now()}`,
      ...facturaForm,
    };

    setFacturasAgregadas([...facturasAgregadas, newFactura]);
    showToast('Factura agregada al listado', 'success');

    // Limpiar formulario y ocultar inputs
    setFacturaForm({
      servicio: '',
      monto: '',
      referencia_pago: '',
      etiqueta: '',
      fecha_emision: '',
      fecha_vencimiento: '',
      archivo_url: '',
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

    if (!obligacionForm.descripcion.trim()) {
      showToast('Ingresa una descripción para la obligación', 'error');
      return;
    }

    if (!obligacionForm.periodo) {
      showToast('Selecciona el período de la obligación', 'error');
      return;
    }

    if (facturasAgregadas.length === 0) {
      showToast('Debes agregar al menos una factura', 'error');
      return;
    }

    setLoading(true);

    try {
      // PASO 1: Crear obligación
      const resObligacion = await createObligacion({
        telefono: telefono.trim(),
        descripcion: obligacionForm.descripcion.trim(),
        periodo: obligacionForm.periodo,
      });

      if (!resObligacion.ok || !resObligacion.data) {
        throw new Error(getErrorMsg(resObligacion, 'Error al crear obligación'));
      }

      const obligacionCreada = resObligacion.data;

      // PASO 2: Crear todas las facturas en orden
      for (const factura of facturasAgregadas) {
        const resFactura = await capturaFactura({
          telefono: telefono.trim(),
          obligacion_id: obligacionCreada.id,
          servicio: factura.servicio,
          monto: Number(factura.monto),
          referencia_pago: factura.referencia_pago || undefined,
          etiqueta: factura.etiqueta || undefined,
          fecha_emision: factura.fecha_emision || undefined,
          fecha_vencimiento: factura.fecha_vencimiento || undefined,
          archivo_url: factura.archivo_url || undefined,
          origen: 'manual',
          extraccion_estado: 'ok',
        });

        if (!resFactura.ok) {
          throw new Error(`Error al guardar factura ${factura.servicio}: ${getErrorMsg(resFactura)}`);
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
    setObligacionForm({ descripcion: '', periodo: '' });

    setSection3Expandido(false);
    setFacturasAgregadas([]);
    setFacturaFormVisible(true);
    setFacturaForm({
      servicio: '',
      monto: '',
      referencia_pago: '',
      etiqueta: '',
      fecha_emision: '',
      fecha_vencimiento: '',
      archivo_url: '',
    });

    onClose();
  };

  const isSection1Valid = section1Estado === 'exito' && usuarioEncontrado;
  const isSection2Valid = obligacionForm.descripcion.trim() && obligacionForm.periodo;
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
                <Input
                  label="Descripción"
                  required
                  placeholder="Ej: Pagos Febrero 2026"
                  value={obligacionForm.descripcion}
                  onChange={(e) =>
                    setObligacionForm((f) => ({ ...f, descripcion: e.target.value }))
                  }
                />

                <Input
                  label="Período (Mes/Año)"
                  required
                  type="month"
                  value={obligacionForm.periodo}
                  onChange={(e) =>
                    setObligacionForm((f) => ({ ...f, periodo: e.target.value }))
                  }
                  
                />

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
                      {facturasAgregadas.length > 0 ? 'Nueva factura' : 'Primera factura'}
                    </p>

                    <div className="space-y-3">
                      <Input
                        label="Servicio"
                        required
                        placeholder="Ej: EPM Energía"
                        value={facturaForm.servicio}
                        onChange={(e) =>
                          setFacturaForm((f) => ({ ...f, servicio: e.target.value }))
                        }
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Monto (COP)"
                          required
                          type="number"
                          placeholder="150000"
                          value={facturaForm.monto}
                          onChange={(e) =>
                            setFacturaForm((f) => ({ ...f, monto: e.target.value }))
                          }
                        />
                        <Input
                          label="Referencia de Pago"
                          required
                          placeholder="TX-PSE-123456"
                          value={facturaForm.referencia_pago}
                          onChange={(e) =>
                            setFacturaForm((f) => ({ ...f, referencia_pago: e.target.value }))
                          }
                        />
                      </div>

                      <Input
                        label="Etiqueta"
                        required
                        placeholder="Ej: Factura Marzo"
                        value={facturaForm.etiqueta}
                        onChange={(e) =>
                          setFacturaForm((f) => ({ ...f, etiqueta: e.target.value }))
                        }
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Fecha Emisión"
                          required
                          type="date"
                          value={facturaForm.fecha_emision}
                          onChange={(e) =>
                            setFacturaForm((f) => ({ ...f, fecha_emision: e.target.value }))
                          }
                        />
                        <Input
                          label="Fecha Vencimiento"
                          required
                          type="date"
                          value={facturaForm.fecha_vencimiento}
                          onChange={(e) =>
                            setFacturaForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))
                          }
                        />
                      </div>

                      <Input
                        label="URL Archivo"
                        type="url"
                        placeholder="https://example.com/factura.pdf"
                        value={facturaForm.archivo_url}
                        onChange={(e) =>
                          setFacturaForm((f) => ({ ...f, archivo_url: e.target.value }))
                        }
                        hint="Opcional"
                      />

                      <Button
                        onClick={handleAgregarFactura}
                        variant="secondary"
                        className="w-full"
                      >
                        {facturasAgregadas.length > 0 ? 'Agregar factura' : 'Agregar factura'}
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
