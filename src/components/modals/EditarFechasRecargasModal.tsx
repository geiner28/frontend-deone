'use client';

import { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Toast, { ToastType } from '@/components/ui/Toast';
import { updateProgramacionRecargas } from '@/lib/api';
import type { ProgramacionRecargas } from '@/types';
import { getErrorMsg } from '@/lib/utils';

interface EditarFechasRecargasModalProps {
  open: boolean;
  onClose: () => void;
  usuario_id: string;
  currentData?: ProgramacionRecargas;
  onSuccess?: (data: ProgramacionRecargas) => void;
}

const MIN_DAY_RANGE = 7; // Mínimo de días entre recarga 1 y recarga 2
const MAX_SAFE_DAY = 28; // Máximo día seguro para todos los meses (febrero tiene 28 días)

export default function EditarFechasRecargasModal({
  open,
  onClose,
  usuario_id,
  currentData,
  onSuccess,
}: EditarFechasRecargasModalProps) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);
  const [cantidadRecargas, setCantidadRecargas] = useState<'1' | '2'>('1');
  const [dia1, setDia1] = useState<number>(1);
  const [dia2, setDia2] = useState<number>(15);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Initialize with current data when modal opens
  useEffect(() => {
    if (open && currentData) {
      setCantidadRecargas(String(currentData.cantidad_recargas) as '1' | '2');
      setDia1(currentData.dia_1);
      setDia2(currentData.dia_2 || 15);
    } else if (open && !currentData) {
      setCantidadRecargas('1');
      setDia1(1);
      setDia2(15);
    }
  }, [open, currentData]);

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  // Validaciones
  const isValid = useMemo(() => {
    // Validar día 1
    if (dia1 < 1 || dia1 > MAX_SAFE_DAY) return false;

    // Si es cantidad 2, validar día 2
    if (cantidadRecargas === '2') {
      if (dia2 < 1 || dia2 > MAX_SAFE_DAY) return false;
      // Día 2 debe ser al menos MIN_DAY_RANGE días después de día 1
      if (dia2 <= dia1 + MIN_DAY_RANGE - 1) return false;
    }

    // Verificar si hay cambios
    const hasChanges =
      cantidadRecargas !== String(currentData?.cantidad_recargas) ||
      dia1 !== currentData?.dia_1 ||
      (cantidadRecargas === '2' && dia2 !== (currentData?.dia_2 || 15));

    return hasChanges;
  }, [cantidadRecargas, dia1, dia2, currentData]);

  const handleDia1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= MAX_SAFE_DAY) {
      setDia1(value);
    }
  };

  const handleDia2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= MAX_SAFE_DAY) {
      setDia2(value);
    }
  };

  const handleOpenConfirmation = () => {
    if (!isValid) return;
    setShowConfirmation(true);
  };

  const handleConfirmUpdate = async () => {
    setLoading(true);
    const payload = {
      usuario_id,
      cantidad_recargas: parseInt(cantidadRecargas) as 1 | 2,
      dia_1: dia1,
      ...(cantidadRecargas === '2' && { dia_2: dia2 }),
    };

    const res = await updateProgramacionRecargas(payload);
    setLoading(false);

    if (res.ok && res.data) {
      showToast('Fechas de recargas actualizadas correctamente', 'success');
      setShowConfirmation(false);
      onSuccess?.(res.data);
      setTimeout(() => {
        onClose();
      }, 500);
    } else {
      showToast(getErrorMsg(res, 'Error al actualizar fechas de recargas'), 'error');
    }
  };

  const handleClose = () => {
    if (currentData) {
      setCantidadRecargas(String(currentData.cantidad_recargas) as '1' | '2');
      setDia1(currentData.dia_1);
      setDia2(currentData.dia_2 || 15);
    } else {
      setCantidadRecargas('1');
      setDia1(1);
      setDia2(15);
    }
    setShowConfirmation(false);
    onClose();
  };

  return (
    <>
      {/* Main Modal */}
      <Modal
        maxWidth="lg"
        open={open && !showConfirmation}
        onClose={handleClose}
        title="Editar Fechas de Recargas"
      >
        <div className="space-y-5 w-full">
          {/* Cantidad de Recargas - Select estilo plan */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              Cantidad de Recargas <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8d2d] focus:border-[#ff8d2d]"
              value={cantidadRecargas}
              onChange={(e) => setCantidadRecargas(e.target.value as '1' | '2')}
            >
              <option value="1">1 recarga</option>
              <option value="2">2 recargas</option>
            </select>
          </div>

          {/* Día 1 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              Fecha de Recarga 1 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={MAX_SAFE_DAY}
                value={dia1}
                onChange={handleDia1Change}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ff8d2d] focus:border-[#ff8d2d]"
                placeholder="Día (1-28)"
              />
              <span className="text-sm text-gray-500 whitespace-nowrap">día del mes</span>
            </div>
          </div>

          {/* Día 2 - Conditional */}
          {cantidadRecargas === '2' && (
            <div className="flex flex-col gap-2 animate-in fade-in">
              <label className="text-sm font-medium text-gray-700">
                Fecha de Recarga 2 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={dia1 + MIN_DAY_RANGE}
                  max={MAX_SAFE_DAY}
                  value={dia2}
                  onChange={handleDia2Change}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ff8d2d] focus:border-[#ff8d2d]"
                  placeholder={`Día (${dia1 + MIN_DAY_RANGE}-28)`}
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">día del mes</span>
              </div>
              <p className="text-xs text-gray-500">
                Debe ser al menos {MIN_DAY_RANGE} días después de la primera recarga
              </p>
            </div>
          )}

          {/* Buttons - Full width */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button 
              variant="secondary" 
              onClick={handleClose} 
              disabled={loading}
              className="w-full"
            >
              Cancelar
            </Button>
            <Button
              loading={loading}
              onClick={handleOpenConfirmation}
              disabled={!isValid}
              className="w-full"
            >
              Guardar cambios
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        title="⚠️ Confirmar Actualización"
      >
        <div className="space-y-4 w-full">
          {/* Info box con colores de paleta (naranja/gris) */}
          <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3">
            <p className="text-sm text-orange-900 font-semibold">
              ¿Estás seguro de que deseas actualizar las fechas de recargas?
            </p>
            <div className="mt-3 space-y-1.5">
              <p className="text-sm text-orange-800">
                <strong>Cantidad:</strong> {cantidadRecargas} recarga{cantidadRecargas === '2' ? 's' : ''}
              </p>
              <p className="text-sm text-orange-800">
                <strong>Fecha{cantidadRecargas === '2' ? 's' : ''}:</strong> Día {dia1}{cantidadRecargas === '2' ? ` y Día ${dia2}` : ''}
              </p>
              <p className="text-sm text-orange-700 mt-2">
                Esta información se usará como referencia para futuras recargas.
              </p>
            </div>
          </div>

          {/* Buttons - Full width */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowConfirmation(false)}
              disabled={loading}
              className="w-full"
            >
              Cancelar
            </Button>
            <Button
              loading={loading}
              onClick={handleConfirmUpdate}
              className="w-full"
            >
              Sí, Actualizar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
