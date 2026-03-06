'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Toast, { ToastType } from '@/components/ui/Toast';
import { updateProgramacionRecargas } from '@/lib/api';
import type { ProgramacionRecargas } from '@/types';
import { getErrorMsg } from '@/lib/utils';
import { CalendarIcon, PencilIcon, PlusIcon } from '@heroicons/react/24/outline';

interface ProgramacionRecargasCardProps {
  programacion: ProgramacionRecargas | null;
  usuarioId: string;
  onReload: () => Promise<void>;
  showToast: (message: string, type: ToastType) => void;
}

export default function ProgramacionRecargasCard({
  programacion,
  usuarioId,
  onReload,
  showToast,
}: ProgramacionRecargasCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Form state
  const [cantidadRecargas, setCantidadRecargas] = useState(1);
  const [dia1, setDia1] = useState('');
  const [dia2, setDia2] = useState('');

  // Initialize form when opening modal
  const openModal = () => {
    if (programacion) {
      setCantidadRecargas(programacion.cantidad_recargas);
      setDia1(programacion.dia_1.toString());
      setDia2(programacion.dia_2?.toString() || '');
    } else {
      setCantidadRecargas(1);
      setDia1('');
      setDia2('');
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    // Validate
    const d1 = parseInt(dia1, 10);
    const d2 = cantidadRecargas === 2 ? parseInt(dia2, 10) : null;

    if (!dia1 || d1 < 1 || d1 > 28) {
      showToast('El día 1 debe estar entre 1 y 28', 'error');
      return;
    }

    if (cantidadRecargas === 2) {
      if (!dia2 || d2! < 1 || d2! > 28) {
        showToast('El día 2 debe estar entre 1 y 28', 'error');
        return;
      }
      if (d2! <= d1) {
        showToast('El día 2 debe ser mayor que el día 1', 'error');
        return;
      }
    }

    setConfirmOpen(true);
  };

  const confirmSave = async () => {
    setLoading(true);
    setConfirmOpen(false);

    const res = await updateProgramacionRecargas(usuarioId, {
      cantidad_recargas: cantidadRecargas,
      dia_1: parseInt(dia1, 10),
      dia_2: cantidadRecargas === 2 ? parseInt(dia2, 10) : null,
    });

    setLoading(false);

    if (res.ok) {
      showToast(programacion ? 'Programación actualizada' : 'Programación creada', 'success');
      setModalOpen(false);
      await onReload();
    } else {
      showToast(getErrorMsg(res, 'Error al guardar programación'), 'error');
    }
  };

  const handleCantidadChange = (cant: number) => {
    setCantidadRecargas(cant);
    if (cant === 1) {
      setDia2('');
    }
  };

  // Render days selector
  const renderDaySelector = (value: string, onChange: (v: string) => void, label: string) => (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700 w-20">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Seleccionar día</option>
        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      <Card>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
              <CalendarIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Programación de Recargas</h3>
              {programacion ? (
                <div className="mt-1 text-sm text-gray-600">
                  <p>Recargas al mes: <span className="font-semibold">{programacion.cantidad_recargas}</span></p>
                  <p>
                    Días: {programacion.dia_1}
                    {programacion.cantidad_recargas === 2 && ` y ${programacion.dia_2}`}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  Este cliente aún no tiene programación de recargas.
                </p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={openModal}
          >
            {programacion ? (
              <>
                <PencilIcon className="h-4 w-4" /> Editar
              </>
            ) : (
              <>
                <PlusIcon className="h-4 w-4" /> Crear
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Modal de edición/creación */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={programacion ? 'Editar Programación' : 'Crear Programación'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad de recargas al mes
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleCantidadChange(1)}
                className={`flex-1 rounded-xl border-2 p-3 text-center transition-all ${
                  cantidadRecargas === 1
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-lg font-bold">1</p>
                <p className="text-xs text-gray-500">Una vez</p>
              </button>
              <button
                type="button"
                onClick={() => handleCantidadChange(2)}
                className={`flex-1 rounded-xl border-2 p-3 text-center transition-all ${
                  cantidadRecargas === 2
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-lg font-bold">2</p>
                <p className="text-xs text-gray-500">Dos veces</p>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {renderDaySelector(dia1, setDia1, 'Día 1:')}
            {cantidadRecargas === 2 && renderDaySelector(dia2, setDia2, 'Día 2:')}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={loading}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmación */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar Programación"
      >
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-sm text-indigo-800">
              <strong>Cantidad de recargas:</strong> {cantidadRecargas} vez{cantidadRecargas === 1 ? '' : 's'} al mes
            </p>
            <p className="text-sm text-indigo-800 mt-1">
              <strong>Días:</strong> {dia1}
              {cantidadRecargas === 2 && ` y ${dia2}`}
            </p>
          </div>
          <p className="text-sm text-gray-600">
            ¿Está seguro de guardar esta programación?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmSave} loading={loading}>
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

