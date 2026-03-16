'use client';

import { useState, useEffect, useRef } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast, { ToastType } from '@/components/ui/Toast';
import { obtenerRecargasPendientes, aprobarRecarga, rechazarRecarga } from '@/lib/api';
import { formatCurrency, getErrorMsg, formatDate, formatPeriodo } from '@/lib/utils';
import type { RecargaPendiente, ObtenerRecargasPendientesData } from '@/types';

interface AprobarRechazarRecargaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  showToast: (msg: string, type: ToastType) => void;
}

type Step = 'buscar' | 'detalles' | 'confirmar_aprobacion' | 'confirmar_rechazo';
type Accion = 'aprobar' | 'rechazar' | null;

export default function AprobarRechazarRecargaModal({
  open,
  onClose,
  onSuccess,
  showToast,
}: AprobarRechazarRecargaModalProps) {
  // Estado principal
  const [telefonoInput, setTelefonoInput] = useState('');
  const [step, setStep] = useState<Step>('buscar');
  const [accion, setAccion] = useState<Accion>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Datos obtenidos
  const [usuario, setUsuario] = useState<ObtenerRecargasPendientesData['usuario'] | null>(null);
  const [recargas, setRecargas] = useState<RecargaPendiente[]>([]);
  const [selectedRecargaId, setSelectedRecargaId] = useState('');
  const [selectedRecarga, setSelectedRecarga] = useState<RecargaPendiente | null>(null);

  // Formulario de confirmación
  const [observacionesAprobar, setObservacionesAprobar] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');

  // Reset cuando se cierra el modal
  useEffect(() => {
    if (!open) {
      resetModal();
    }
  }, [open]);

  // Auto-búsqueda mientras digita
  useEffect(() => {
    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Si el teléfono está vacío, limpiar todo
    if (!telefonoInput.trim()) {
      setUsuario(null);
      setRecargas([]);
      setSelectedRecargaId('');
      setSelectedRecarga(null);
      setSearchError(null);
      setSearching(false);
      return;
    }

    // Necesita al menos 7 dígitos para buscar (formato colombiano mínimo)
    const digitosOnly = telefonoInput.replace(/\D/g, '');
    if (digitosOnly.length < 7) {
      setUsuario(null);
      setRecargas([]);
      setSelectedRecargaId('');
      setSelectedRecarga(null);
      setSearchError(null);
      return;
    }

    // Esperar 300ms antes de buscar (debounce)
    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await obtenerRecargasPendientes(telefonoInput.trim());
        
        if (res.ok && res.data) {
          const { usuario: usuarioData, recargas_pendientes, no_pending } = res.data;
          setUsuario(usuarioData);
          setRecargas(recargas_pendientes || []);
          setSearchError(null);

          // Diferenciar entre "usuario sin recargas" y "usuario no encontrado"
          if (no_pending || !recargas_pendientes || recargas_pendientes.length === 0) {
            setSearchError('Usuario encontrado, pero no tiene recargas pendientes por validar');
          }
        } else {
          setUsuario(null);
          setRecargas([]);
          setSearchError('Usuario no encontrado en el sistema');
        }
      } catch (error) {
        setUsuario(null);
        setRecargas([]);
        setSearchError('Error al buscar usuario. Intenta de nuevo.');
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [telefonoInput]);

  const resetModal = () => {
    setTelefonoInput('');
    setStep('buscar');
    setAccion(null);
    setUsuario(null);
    setRecargas([]);
    setSelectedRecargaId('');
    setSelectedRecarga(null);
    setObservacionesAprobar('');
    setMotivoRechazo('');
    setLoading(false);
    setSearching(false);
    setSearchError(null);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  //═══════════════════════════════════════════════════════════════════════════════
  // Paso 2: Seleccionar una recarga
  //═══════════════════════════════════════════════════════════════════════════════
  const handleSeleccionarRecarga = () => {
    if (!selectedRecargaId) {
      showToast('Por favor selecciona una recarga', 'error');
      return;
    }

    const recarga = recargas.find((r) => r.id === selectedRecargaId);
    if (!recarga) {
      showToast('Recarga no encontrada', 'error');
      return;
    }

    setSelectedRecarga(recarga);
    setStep('detalles');
  };

  //═══════════════════════════════════════════════════════════════════════════════
  // Paso 3: Seleccionar acción (Aprobar o Rechazar)
  //═══════════════════════════════════════════════════════════════════════════════
  const handleSeleccionarAccion = (nuevaAccion: Accion) => {
    setAccion(nuevaAccion);
    if (nuevaAccion === 'aprobar') {
      setStep('confirmar_aprobacion');
      setObservacionesAprobar('');
    } else if (nuevaAccion === 'rechazar') {
      setStep('confirmar_rechazo');
      setMotivoRechazo('');
    }
  };

  //═══════════════════════════════════════════════════════════════════════════════
  // Paso 4A: Confirmar aprobación
  //═══════════════════════════════════════════════════════════════════════════════
  const handleConfirmarAprobacion = async () => {
    if (!selectedRecarga) {
      showToast('Error: No se pudo identificar la recarga', 'error');
      return;
    }

    if (!observacionesAprobar.trim()) {
      showToast('Las observaciones del admin son obligatorias', 'error');
      return;
    }

    setLoading(true);
    const res = await aprobarRecarga(selectedRecarga.id, {
      observaciones_admin: observacionesAprobar,
    });
    setLoading(false);

    if (res.ok) {
      showToast('Recarga aprobada correctamente', 'success');
      onClose();
      await onSuccess();
    } else {
      showToast(getErrorMsg(res, 'Error al aprobar recarga'), 'error');
    }
  };

  //═══════════════════════════════════════════════════════════════════════════════
  // Paso 4B: Confirmar rechazo
  //═══════════════════════════════════════════════════════════════════════════════
  const handleConfirmarRechazo = async () => {
    if (!selectedRecarga) {
      showToast('Error: No se pudo identificar la recarga', 'error');
      return;
    }

    if (!motivoRechazo.trim()) {
      showToast('El motivo del rechazo es obligatorio', 'error');
      return;
    }

    setLoading(true);
    const res = await rechazarRecarga(selectedRecarga.id, {
      motivo_rechazo: motivoRechazo,
    });
    setLoading(false);

    if (res.ok) {
      showToast('Recarga rechazada correctamente', 'success');
      onClose();
      await onSuccess();
    } else {
      showToast(getErrorMsg(res, 'Error al rechazar recarga'), 'error');
    }
  };

  //═══════════════════════════════════════════════════════════════════════════════
  // Renderizar contenido según el paso
  //═══════════════════════════════════════════════════════════════════════════════

  const renderBuscar = () => (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
        <p className="text-sm text-indigo-800">
          Ingresa el número de teléfono del cliente.
        </p>
      </div>

      <div className="relative">
        <Input
          label="Número de teléfono"
          type="tel"
          value={telefonoInput}
          onChange={(e) => setTelefonoInput(e.target.value)}
          placeholder="3001234567"
          disabled={false}
        />
        {searching && (
          <div className="absolute right-3 top-10 text-indigo-600">
            <div className="animate-spin">
              <MagnifyingGlassIcon className="h-5 w-5" />
            </div>
          </div>
        )}
      </div>

      {/* Mostrar resultado cuando encuentra usuario */}
      {usuario && recargas.length > 0 && (
        <div className="space-y-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-sm text-emerald-800">
              <strong>{usuario.nombre} {usuario.apellido}</strong> (📱 {usuario.telefono})
            </p>
            <p className="text-xs text-emerald-700 mt-1">Plan: {usuario.plan}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar recarga de {recargas.length} encontrada(s) *
            </label>
            <select
              value={selectedRecargaId}
              onChange={(e) => setSelectedRecargaId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">-- Selecciona una recarga --</option>
              {recargas.map((r) => (
                <option key={r.id} value={r.id}>
                  {formatCurrency(r.monto)} • {formatPeriodo(r.periodo)} • ID: {r.id.slice(0, 8)}...
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSeleccionarRecarga} disabled={!selectedRecargaId}>
              Ver detalles
            </Button>
          </div>
        </div>
      )}

      {/* Mostrar error cuando no hay recargas */}
      {usuario && recargas.length === 0 && !searching && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <ExclamationCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">No hay recargas pendientes</p>
            <p className="text-xs text-amber-700 mt-0.5">
              El cliente <strong>{usuario.nombre} {usuario.apellido}</strong> no tiene recargas en validación.
            </p>
          </div>
        </div>
      )}

      {/* Mostrar error cuando no encuentra usuario */}
      {searchError && !usuario && !searching && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <ExclamationCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Usuario no encontrado</p>
            <p className="text-xs text-red-700 mt-0.5">
              Verifica que el número de teléfono sea correcto.
            </p>
          </div>
        </div>
      )}

      {/* Hint de dígitos necesarios */}
      {!usuario && telefonoInput.length > 0 && telefonoInput.replace(/\D/g, '').length < 7 && (
        <div className="text-xs text-gray-500 text-center py-2">
          Escribe al menos 7 dígitos para buscar
        </div>
      )}

      {/* Botón cancelar flotante */}
      {!usuario && (
        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );

  const renderDetalles = () => (
    <div className="space-y-4">
      {/* Card de detalles */}
      <div className="border-l-4 border-l-gray-400 bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Monto</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(selectedRecarga?.monto || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Período</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{formatPeriodo(selectedRecarga?.periodo || '')}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Referencia de transacción</p>
            <p className="text-sm font-mono text-gray-900 mt-1 break-all">
              {selectedRecarga?.referencia_tx || '—'}
            </p>
          </div>
          {selectedRecarga?.comprobante_url && (
            <div className="col-span-2">
              <a
                href={selectedRecarga.comprobante_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <ArrowDownTrayIcon className="h-4 w-4" /> Descargar comprobante
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button
          variant="secondary"
          onClick={() => {
            handleSeleccionarAccion('rechazar');
          }}
        >
          <XCircleIcon className="h-4 w-4" /> Rechazar
        </Button>
        <Button
          onClick={() => {
            handleSeleccionarAccion('aprobar');
          }}
        >
          <CheckCircleIcon className="h-4 w-4" /> Aprobar
        </Button>
      </div>

      <button
        onClick={() => {
          setStep('buscar');
          setSelectedRecargaId('');
          setSelectedRecarga(null);
        }}
        className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
      >
        Volver
      </button>
    </div>
  );

  const renderConfirmarAprobacion = () => (
    <div className="space-y-4">
      {/* Card de confirmación */}
      <div className="border-l-4 border-l-emerald-500 bg-emerald-50 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircleIcon className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">Confirmar aprobación</p>
            <p className="text-xs text-emerald-700 mt-1">Monto: {formatCurrency(selectedRecarga?.monto || 0)}</p>
          </div>
        </div>
      </div>

      {/* Input observaciones */}
      <Input
        label="Observaciones del admin *"
        value={observacionesAprobar}
        onChange={(e) => setObservacionesAprobar(e.target.value)}
        placeholder="Comprobante verificado, monto correcto..."
        maxLength={500}
      />
      <p className="text-xs text-gray-500">
        {observacionesAprobar.length}/500 caracteres
      </p>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          variant="secondary"
          onClick={() => setStep('detalles')}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          loading={loading}
          onClick={handleConfirmarAprobacion}
          disabled={!observacionesAprobar.trim()}
        >
          <CheckCircleIcon className="h-4 w-4" /> Confirmar aprobación
        </Button>
      </div>
    </div>
  );

  const renderConfirmarRechazo = () => (
    <div className="space-y-4">
      {/* Card de confirmación */}
      <div className="border-l-4 border-l-red-500 bg-red-50 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-900">Confirmar rechazo</p>
            <p className="text-xs text-red-700 mt-1">Monto: {formatCurrency(selectedRecarga?.monto || 0)}</p>
          </div>
        </div>
      </div>

      {/* Input motivo */}
      <Input
        label="Motivo del rechazo *"
        value={motivoRechazo}
        onChange={(e) => setMotivoRechazo(e.target.value)}
        placeholder="Comprobante borroso, monto incorrecto, referencia no coincide..."
        maxLength={500}
      />
      <p className="text-xs text-gray-500">
        {motivoRechazo.length}/500 caracteres
      </p>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          variant="secondary"
          onClick={() => setStep('detalles')}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          loading={loading}
          onClick={handleConfirmarRechazo}
          disabled={!motivoRechazo.trim()}
          variant="secondary"
        >
          <XCircleIcon className="h-4 w-4" /> Confirmar rechazo
        </Button>
      </div>
    </div>
  );

  //═══════════════════════════════════════════════════════════════════════════════
  // Render principal
  //═══════════════════════════════════════════════════════════════════════════════

  const getTitulo = () => {
    switch (step) {
      case 'buscar':
        return 'Análisis y Aprobación de Recargas';
      case 'detalles':
        return 'Detalles de la recarga';
      case 'confirmar_aprobacion':
        return 'Aprobar recarga';
      case 'confirmar_rechazo':
        return 'Rechazar recarga';
      default:
        return 'Análisis y Aprobación de Recargas';
    }
  };

  const getContenido = () => {
    switch (step) {
      case 'buscar':
        return renderBuscar();
      case 'detalles':
        return renderDetalles();
      case 'confirmar_aprobacion':
        return renderConfirmarAprobacion();
      case 'confirmar_rechazo':
        return renderConfirmarRechazo();
      default:
        return null;
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={getTitulo()} maxWidth="md">
      {getContenido()}
    </Modal>
  );
}
