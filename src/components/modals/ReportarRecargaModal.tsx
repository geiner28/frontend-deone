'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronDownIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Toast, { ToastType } from '@/components/ui/Toast';
import UserCombobox from '@/components/ui/UserCombobox';
import { reportarRecarga, getAdminClientes } from '@/lib/api';
import type { RecargaData } from '@/types';
import { getErrorMsg } from '@/lib/utils';

interface ReportarRecargaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (data: RecargaData) => void;
  onError?: (error: string) => void;
  mode?: 'create' | 'from-profile';
  initialTelefono?: string;
  usuarioNombre?: string;
}

interface UsuarioOpt {
  telefono: string;
  nombre: string;
  apellido: string;
}

export default function ReportarRecargaModal({
  open,
  onClose,
  onSuccess,
  onError,
  mode = 'create',
  initialTelefono,
  usuarioNombre,
}: ReportarRecargaModalProps) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [monto, setMonto] = useState('');
  const [grupo, setGrupo] = useState<'' | '1' | '2'>('');
  const [usuarios, setUsuarios] = useState<UsuarioOpt[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(true);

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  // Cargar usuarios cuando se abre en modo create
  useEffect(() => {
    if (!open || mode !== 'create') return;
    setLoadingUsers(true);
    getAdminClientes({ page: 1, limit: 100 }).then((res) => {
      setLoadingUsers(false);
      if (res.ok && res.data) {
        const items = (res.data.clientes || []).map((u) => ({
          telefono: u.telefono,
          nombre: u.nombre || '',
          apellido: u.apellido || '',
        }));
        setUsuarios(items);
      }
    });
  }, [open, mode]);

  // Pre-llenar teléfono en modo from-profile
  useEffect(() => {
    if (open && mode === 'from-profile' && initialTelefono) {
      setTelefono(initialTelefono);
    }
  }, [open, mode, initialTelefono]);

  // Validar campos requeridos según modo
  const isComplete = useMemo(() => {
    const usuarioOk = mode === 'from-profile' ? Boolean(initialTelefono) : Boolean(telefono);
    const montoOk = Boolean(monto && Number(monto) > 0);
    const grupoOk = Boolean(grupo);
    return usuarioOk && montoOk && grupoOk;
  }, [mode, initialTelefono, telefono, monto, grupo]);

  const handleClose = () => {
    setTelefono('');
    setMonto('');
    setGrupo('');
    setSectionOpen(true);
    setToast(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!isComplete) {
      showToast('Por favor completa todos los campos requeridos', 'error');
      return;
    }

    setLoading(true);
    const payload = {
      telefono: mode === 'from-profile' ? (initialTelefono || telefono) : telefono,
      periodo: new Date().toISOString().split('T')[0],
      monto: Number(monto),
      referencia_tx: `RECARGA-${Date.now()}`,
      grupo: Number(grupo) as 1 | 2,
    };
    const res = await reportarRecarga(payload);
    setLoading(false);

    if (res.ok && res.data) {
      showToast('Recarga registrada correctamente', 'success');
      onSuccess?.(res.data);
      setTimeout(() => handleClose(), 800);
    } else {
      const errorMsg = getErrorMsg(res, 'Error al registrar recarga');
      showToast(errorMsg, 'error');
      onError?.(errorMsg);
    }
  };

  const sectionFilled = isComplete;

  return (
    <>
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] animate-fade-in">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      <Modal open={open} onClose={handleClose} title="Registrar recarga" maxWidth="md">
        <div className="space-y-4">
          {/* Sección Recarga colapsable */}
          <div className="border-b border-[#e5e7eb] pb-4">
            <button
              type="button"
              onClick={() => setSectionOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-left"
            >
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-[#1d212b]">Recarga</h4>
                {sectionFilled ? (
                  <CheckCircleIcon className="h-5 w-5 text-[#ff8d2d]" />
                ) : (
                  <ExclamationCircleIcon className="h-5 w-5 text-[#ff8d2d]" />
                )}
              </div>
              <ChevronDownIcon
                className={`h-4 w-4 text-[#737780] transition-transform ${sectionOpen ? '' : '-rotate-90'}`}
              />
            </button>

            {sectionOpen && (
              <div className="space-y-4 mt-4">
                {mode === 'create' ? (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#1d212b]">
                      Usuario <span className="text-[#ef4444]">*</span>
                    </label>
                    <UserCombobox
                      options={usuarios}
                      value={telefono}
                      onChange={setTelefono}
                      loading={loadingUsers}
                      placeholder="Buscar por nombre o celular…"
                    />
                  </div>
                ) : (
                  usuarioNombre && (
                    <div className="rounded-lg bg-[#fff4e6] border border-[#ff8d2d]/30 px-3 py-2 text-sm text-[#1d212b]">
                      <span className="font-medium">Usuario:</span> {usuarioNombre}
                    </div>
                  )
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-[#1d212b]">
                    Monto <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="$ 0.00"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#1d212b] placeholder-[#737780] focus:outline-none focus:ring-2 focus:ring-[#ff8d2d]/50 focus:border-[#ff8d2d]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-[#1d212b]">
                    Grupo <span className="text-[#ef4444]">*</span>
                  </label>
                  <select
                    value={grupo}
                    onChange={(e) => setGrupo(e.target.value as '' | '1' | '2')}
                    className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#1d212b] focus:outline-none focus:ring-2 focus:ring-[#ff8d2d]/50 focus:border-[#ff8d2d]"
                  >
                    <option value="">Seleccione</option>
                    <option value="1">Grupo 1</option>
                    <option value="2">Grupo 2</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="secondary" onClick={handleClose} className="w-full" disabled={loading}>
              Cancelar
            </Button>
            <Button
              loading={loading}
              onClick={handleSubmit}
              disabled={!isComplete}
              className="w-full"
            >
              Registrar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
