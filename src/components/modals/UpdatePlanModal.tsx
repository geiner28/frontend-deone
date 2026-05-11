'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Toast, { ToastType } from '@/components/ui/Toast';
import { updatePlan } from '@/lib/api';
import type { Plan } from '@/types';
import { getErrorMsg } from '@/lib/utils';

interface UpdatePlanModalProps {
  open: boolean;
  onClose: () => void;
  telefono: string;
  currentPlan: Plan;
  onSuccess?: (data: { plan_anterior: Plan; plan_nuevo: Plan }) => void;
}

export default function UpdatePlanModal({ open, onClose, telefono, currentPlan, onSuccess }: UpdatePlanModalProps) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>(currentPlan);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  const handleOpenConfirmation = () => {
    if (selectedPlan === currentPlan) {
      showToast('Selecciona un plan diferente al actual', 'error');
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmUpdate = async () => {
    setLoading(true);
    const res = await updatePlan({ telefono, plan: selectedPlan });
    setLoading(false);

    if (res.ok && res.data) {
      showToast(`Plan actualizado: ${res.data.plan_anterior} → ${res.data.plan_nuevo}`, 'success');
      setShowConfirmation(false);
      onSuccess?.(res.data);
      setTimeout(() => {
        setSelectedPlan(currentPlan);
        onClose();
      }, 500);
    } else {
      showToast(getErrorMsg(res, 'Error al actualizar plan'), 'error');
    }
  };

  const handleClose = () => {
    setSelectedPlan(currentPlan);
    setShowConfirmation(false);
    onClose();
  };

  return (
    <>
      {/* Main Modal */}
      <Modal
        open={open && !showConfirmation}
        onClose={handleClose}
        title="Editar plan"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Plan <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8d2d] focus:border-[#ff8d2d]"
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value as Plan)}
            >
              <option value="tranquilidad">Tranquilidad</option>
              <option value="respaldo">Respaldo</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="secondary" onClick={handleClose} disabled={loading} className="w-full">
              Cancelar
            </Button>
            <Button
              loading={loading}
              onClick={handleOpenConfirmation}
              disabled={selectedPlan === currentPlan}
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
        <div className="space-y-4">
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3">
            <p className="text-sm text-yellow-900">
              <strong>¿Estás seguro de que deseas cambiar de plan?</strong>
            </p>
            <p className="text-sm text-yellow-800 mt-1">
              El cambio de plan entrará en vigor en el próximo ciclo de facturación.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowConfirmation(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              loading={loading}
              onClick={handleConfirmUpdate}
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
