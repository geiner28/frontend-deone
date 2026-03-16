'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Toast, { ToastType } from '@/components/ui/Toast';
import { reportarRecarga, getUsuarioByTelefono } from '@/lib/api';
import type { RecargaData, Usuario } from '@/types';
import { formatCurrency, getErrorMsg } from '@/lib/utils';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface ReportarRecargaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (data: RecargaData) => void;
  onError?: (error: string) => void;
  mode?: 'create' | 'from-profile';
  initialTelefono?: string;
}

const initialForm = {
  telefono: '',
  periodo: '',
  monto: '',
  comprobante_url: '',
  referencia_tx: '',
};

export default function ReportarRecargaModal({
  open,
  onClose,
  onSuccess,
  onError,
  mode = 'create',
  initialTelefono,
}: ReportarRecargaModalProps) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [telefonoValidado, setTelefonoValidado] = useState(false);
  const [validandoTelefono, setValidandoTelefono] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
    // Limpiar timer anterior si existe
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    // El toast se limpia automáticamente después de 4 segundos
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // ─── Auto-precarga de Teléfono en modo 'from-profile' ────────────────────────
  useEffect(() => {
    if (open && mode === 'from-profile' && initialTelefono && form.telefono !== initialTelefono) {
      const newTelefono = initialTelefono;
      setForm((f) => ({ ...f, telefono: newTelefono }));
      // Validar inmediatamente cuando se precarga
      validarTelefono(newTelefono);
    }
  }, [open, mode, initialTelefono]);

  // ─── Validar teléfono con debounce ────────────────────────────────────────
  const validarTelefono = useCallback(async (telefono: string) => {
    if (!telefono.trim()) {
      setTelefonoValidado(false);
      setUsuarioActual(null);
      return;
    }

    setValidandoTelefono(true);
    try {
      const res = await getUsuarioByTelefono(telefono);
      if (res.ok && res.data) {
        setTelefonoValidado(true);
        setUsuarioActual(res.data);
      } else {
        setTelefonoValidado(false);
        setUsuarioActual(null);
      }
    } catch (error) {
      console.error('Error validando teléfono:', error);
      setTelefonoValidado(false);
      setUsuarioActual(null);
    } finally {
      setValidandoTelefono(false);
    }
  }, []);

  // ─── Efecto para monitorear cambios en el teléfono y aplicar debounce ─────
  useEffect(() => {
    // Limpiar timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Invalidar si el teléfono cambia
    setTelefonoValidado(false);
    setUsuarioActual(null);

    // Solo validar si tiene al menos 6 dígitos
    const soloNumeros = form.telefono.replace(/\D/g, '');
    if (soloNumeros.length >= 6) {
      setValidandoTelefono(true);
      debounceTimer.current = setTimeout(() => {
        validarTelefono(form.telefono);
      }, 800);
    } else {
      setValidandoTelefono(false);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [form.telefono, validarTelefono]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleReportar = async () => {
    if (!telefonoValidado || !usuarioActual) {
      showToast('Por favor, valida el teléfono primero', 'error');
      return;
    }

    setLoading(true);
    const res = await reportarRecarga({ ...form, monto: Number(form.monto) });
    setLoading(false);

    if (res.ok && res.data) {
      showToast('✓ Recarga reportada correctamente', 'success');
      if (onSuccess) {
        onSuccess(res.data);
      }
      // Cerrar el modal inmediatamente en caso de éxito
      // El toast se mantiene visible independientemente (tiene su propio timeout de 4s)
      handleClose();
    } else {
      const errorMsg = getErrorMsg(res, 'Error al reportar recarga');
      showToast(errorMsg, 'error');
      if (onError) {
        onError(errorMsg);
      }
      // En caso de error, el modal se mantiene abierto para que corrija los datos
    }
  };

  const handleClose = () => {
    setForm(initialForm);
    // NO limpiar el toast aquí - déjalo que se desvanezca por su propio timer (4s)
    // setToast(null);
    setTelefonoValidado(false);
    setValidandoTelefono(false);
    setUsuarioActual(null);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    onClose();
  };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <Modal
        open={open}
        onClose={handleClose}
        title="Registrar Recarga"
      >
        <div className="space-y-4">
          
          <div className="relative">
            <Input
              label="Teléfono"
              required
              placeholder="3001234567"
              value={form.telefono}
              onChange={set('telefono')}
              disabled={mode === 'from-profile'}
            />
            {form.telefono && (
              <div className="absolute right-3 top-9 flex items-center gap-2">
                {form.telefono.replace(/\D/g, '').length < 6 && (
                  <div className="text-xs text-gray-400">
                    {form.telefono.replace(/\D/g, '').length}/6
                  </div>
                )}
                {form.telefono.replace(/\D/g, '').length >= 6 && validandoTelefono && (
                  <div className="flex items-center gap-1 text-xs text-blue-500">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    Validando...
                  </div>
                )}
                {form.telefono.replace(/\D/g, '').length >= 6 && !validandoTelefono && telefonoValidado && (
                  <div className="flex items-center gap-1 text-xs text-green-500">
                    <CheckCircleIcon className="h-4 w-4" />
                    Válido
                  </div>
                )}
                {form.telefono.replace(/\D/g, '').length >= 6 && !validandoTelefono && !telefonoValidado && (
                  <div className="flex items-center gap-1 text-xs text-red-500">
                    <ExclamationCircleIcon className="h-4 w-4" />
                    No existe
                  </div>
                )}
              </div>
            )}
            {telefonoValidado && usuarioActual && (
              <p className="text-xs text-gray-400 mt-1">
                {`${usuarioActual.nombre || ''}
                  ${usuarioActual.apellido || 'Usuario encontrado'}`}
              </p>
            )}
          </div>

          {telefonoValidado && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Periodo"
                  required
                  type="date"
                  value={form.periodo}
                  onChange={set('periodo')}
                  hint="Fecha de realización de la recarga"
                />
                <Input
                  label="Monto (COP)"
                  required
                  type="number"
                  value={form.monto}
                  onChange={set('monto')}
                  placeholder="500000"
                />
              </div>

              <Input
                label="Referencia TX"
                required
                value={form.referencia_tx}
                onChange={set('referencia_tx')}
                placeholder="TX123456789"
                hint="Referencia de la transacción bancaria"
              />

              <Input
                label="URL Comprobante"
                type="url"
                value={form.comprobante_url}
                onChange={set('comprobante_url')}
                placeholder="https://example.com/comprobante.jpg"
                hint="Link al comprobante de la transferencia"
              />
            </>
          )}

          {!telefonoValidado && form.telefono && (
            <div className="p-3 bg-orange-400/10 border border-orange-400/30 rounded-lg">
              <p className="text-xs text-orange-600">
                Digíta el teléfono del usuario para continuar con el registro
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              loading={loading} 
              onClick={handleReportar}
              disabled={!telefonoValidado || validandoTelefono}
            >
              Reportar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
