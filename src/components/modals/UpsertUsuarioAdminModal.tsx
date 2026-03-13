'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Toast, { ToastType } from '@/components/ui/Toast';
import { upsertUsuarioAdmin, getUsuarioByTelefono } from '@/lib/api';
import type { Plan } from '@/types';
import { getErrorMsg } from '@/lib/utils';

interface UpsertUsuarioAdminModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (data: { usuario_id: string; creado: boolean; nombre: string; telefono: string; plan: Plan }) => void;
}

export default function UpsertUsuarioAdminModal({ open, onClose, onSuccess }: UpsertUsuarioAdminModalProps) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingUser, setFetchingUser] = useState(false);
  const [existingUser, setExistingUser] = useState<{ nombre: string; apellido: string; correo: string; direccion: string | null; plan: Plan } | null>(null);

  const [form, setForm] = useState({
    telefono: '',
    nombre: '',
    apellido: '',
    correo: '',
    direccion: '',
    plan: 'control' as Plan,
  });

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  // Debounced fetch user on phone change
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(async () => {
      if (form.telefono.trim().length < 7) {
        setExistingUser(null);
        return;
      }

      setFetchingUser(true);
      const res = await getUsuarioByTelefono(form.telefono.trim());
      setFetchingUser(false);

      if (res.ok && res.data) {
        // Pre-fill form with existing user data
        const data = res.data;
        setExistingUser({
          nombre: data.nombre,
          apellido: data.apellido,
          correo: data.correo,
          direccion: data.direccion,
          plan: data.plan,
        });
        setForm(f => ({
          ...f,
          nombre: data.nombre,
          apellido: data.apellido,
          correo: data.correo,
          direccion: data.direccion || '',
          plan: data.plan,
        }));
      } else {
        setExistingUser(null);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [form.telefono, open]);

  const handleClose = () => {
    // Reset form
    setForm({ telefono: '', nombre: '', apellido: '', correo: '', direccion: '', plan: 'control' });
    setExistingUser(null);
    setToast(null);
    onClose();
  };

  const handleSave = async () => {
    if (!form.telefono.trim()) {
      showToast('El teléfono es requerido', 'error');
      return;
    }

    if (!form.nombre.trim()) {
      showToast('El nombre es requerido', 'error');
      return;
    }

    setLoading(true);
    const res = await upsertUsuarioAdmin({
      telefono: form.telefono.trim(),
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      correo: form.correo.trim() || undefined,
      direccion: form.direccion.trim() || undefined,
      plan: form.plan,
    });
    setLoading(false);

    if (res.ok && res.data) {
      showToast(
        `Usuario ${res.data.creado ? 'creado' : 'actualizado'} correctamente`,
        'success'
      );
      setTimeout(() => {
        if (onSuccess && res.data) onSuccess(res.data);
        handleClose();
      }, 1000);
    } else {
      showToast(getErrorMsg(res, 'Error al guardar usuario'), 'error');
    }
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <Modal
        open={open}
        onClose={handleClose}
        title={existingUser ? '✏️ Actualizar Usuario' : 'Crear / Actualizar Usuario'}
      >
        <div className="space-y-4">
          {/* Teléfono - Primary identifier with fetch indicator */}
          <div className="relative">
            <Input
              label="Teléfono"
              required
              placeholder="3001234567"
              value={form.telefono}
              onChange={(e) => setForm(f => ({ ...f, telefono: e.target.value }))}
            />
            {fetchingUser && (
              <div className="absolute right-3 top-9 text-sm text-gray-400">
                <span className="animate-pulse">Buscando...</span>
              </div>
            )}
          </div>

          {/* Visual indicator */}
          {existingUser && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
              <p className="text-xs text-blue-700 font-medium">
                ℹ️ Cliente existente - Actualizando datos
              </p>
            </div>
          )}

          {/* Nombre + Apellido */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombre"
              required
              value={form.nombre}
              onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
              disabled={fetchingUser}
            />
            <Input
              label="Apellido"
              value={form.apellido}
              onChange={(e) => setForm(f => ({ ...f, apellido: e.target.value }))}
              disabled={fetchingUser}
            />
          </div>

          {/* Correo */}
          <Input
            label="Correo"
            type="email"
            value={form.correo}
            onChange={(e) => setForm(f => ({ ...f, correo: e.target.value }))}
            disabled={fetchingUser}
          />

          {/* Dirección */}
          <Input
            label="Dirección"
            value={form.direccion}
            onChange={(e) => setForm(f => ({ ...f, direccion: e.target.value }))}
            disabled={fetchingUser}
          />

          {/* Plan */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Plan <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
              value={form.plan}
              onChange={(e) => setForm(f => ({ ...f, plan: e.target.value as Plan }))}
              disabled={fetchingUser}
            >
              <option value="control">Control (Default)</option>
              <option value="tranquilidad">Tranquilidad</option>
              <option value="respaldo">Respaldo</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button loading={loading} onClick={handleSave} disabled={!form.telefono.trim() || !form.nombre.trim()}>
              {existingUser ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
