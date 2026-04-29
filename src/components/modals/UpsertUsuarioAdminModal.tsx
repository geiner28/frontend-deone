'use client';

import { useState, useEffect } from 'react';
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
  mode?: 'upsert' | 'edit-profile'; // 'upsert' = default, 'edit-profile' = editar info personal
  initialData?: {
    usuario_id?: string;
    telefono: string;
    nombre: string;
    apellido: string;
    correo: string;
    direccion: string | null;
  };
  onSuccess?: (data: { usuario_id: string; creado: boolean; nombre: string; telefono: string; plan?: Plan }) => void;
}

export default function UpsertUsuarioAdminModal({ 
  open, 
  onClose, 
  mode = 'upsert',
  initialData,
  onSuccess 
}: UpsertUsuarioAdminModalProps) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingUser, setFetchingUser] = useState(false);
  const [existingUser, setExistingUser] = useState<{ nombre: string; apellido: string; correo: string; direccion: string | null; plan: Plan } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [userCheckComplete, setUserCheckComplete] = useState(false);

  const [form, setForm] = useState({
    telefono: '',
    nombre: '',
    apellido: '',
    tipo_identificacion: 'CC' as 'CC' | 'NIT',
    numero_identificacion: '',
    correo: '',
    ciudad: '',
    direccion: '',
    plan: 'control' as Plan,
  });

  // Sugerencias de ciudades para autocomplete (catálogo básico Colombia)
  const CIUDADES_SUGERIDAS = [
    'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Cúcuta',
    'Bucaramanga', 'Pereira', 'Santa Marta', 'Ibagué', 'Manizales',
    'Villavicencio', 'Pasto', 'Montería', 'Neiva', 'Armenia', 'Popayán',
    'Sincelejo', 'Valledupar', 'Tunja',
  ];

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  // Inicializar formulario cuando se abre en modo edit-profile
  useEffect(() => {
    if (mode === 'edit-profile' && initialData) {
      setForm({
        telefono: initialData.telefono,
        nombre: initialData.nombre,
        apellido: initialData.apellido,
        tipo_identificacion: 'CC',
        numero_identificacion: '',
        correo: initialData.correo,
        ciudad: '',
        direccion: initialData.direccion || '',
        plan: 'control',
      });
      setExistingUser({
        nombre: initialData.nombre,
        apellido: initialData.apellido,
        correo: initialData.correo,
        direccion: initialData.direccion,
        plan: 'control',
      });
      setUserCheckComplete(true);
    }
  }, [open, mode, initialData]);

  // Debounced fetch user on phone change (solo en modo 'upsert')
  useEffect(() => {
    if (!open || mode === 'edit-profile') return;

    setUserCheckComplete(false);

    const timer = setTimeout(async () => {
      if (form.telefono.trim().length < 7) {
        console.log('[DEBUG] Teléfono muy corto, limpiando existingUser');
        setExistingUser(null);
        setUserCheckComplete(true);
        return;
      }

      console.log('[DEBUG] Buscando usuario con teléfono:', form.telefono.trim());
      setFetchingUser(true);
      const res = await getUsuarioByTelefono(form.telefono.trim());
      setFetchingUser(false);

      console.log('[DEBUG] Respuesta del servidor:', res);
      console.log('[DEBUG] res.ok:', res.ok);
      console.log('[DEBUG] res.data:', res.data);

      if (res.ok && res.data) {
        console.log('[DEBUG] Usuario encontrado! Estableciendo existingUser');
        // Solo detectar que existe, NO pre-llenar
        setExistingUser({
          nombre: res.data.nombre,
          apellido: res.data.apellido,
          correo: res.data.correo,
          direccion: res.data.direccion,
          plan: res.data.plan,
        });
      } else {
        console.log('[DEBUG] Usuario NO encontrado, limpiando existingUser');
        setExistingUser(null);
      }

      setUserCheckComplete(true);
    }, 500); // Debounce 500ms

    return () => {
      clearTimeout(timer);
      setUserCheckComplete(false);
    };
  }, [form.telefono, open, mode]);

  const handleClose = () => {
    setForm({ telefono: '', nombre: '', apellido: '', tipo_identificacion: 'CC', numero_identificacion: '', correo: '', ciudad: '', direccion: '', plan: 'control' });
    setExistingUser(null);
    setShowConfirmation(false);
    setToast(null);
    onClose();
  };

  const handleSaveClick = async () => {
    console.log('[DEBUG] handleSaveClick ejecutado');
    console.log('[DEBUG] form.telefono:', form.telefono);
    console.log('[DEBUG] form.nombre:', form.nombre);
    console.log('[DEBUG] existingUser:', existingUser);
    console.log('[DEBUG] userCheckComplete:', userCheckComplete);
    console.log('[DEBUG] fetchingUser:', fetchingUser);

    if (!form.telefono.trim()) {
      showToast('El teléfono es requerido', 'error');
      return;
    }

    if (!userCheckComplete) {
      console.log('[DEBUG] Búsqueda incompleta');
      showToast('Por favor, espera a que se complete la búsqueda del usuario', 'error');
      return;
    }

    if (!form.nombre.trim()) {
      showToast('El nombre es requerido', 'error');
      return;
    }

    // Si es actualización (usuario existente), mostrar confirmación
    console.log('[DEBUG] ¿existingUser es truthy?', !!existingUser);
    if (existingUser) {
      console.log('[DEBUG] Usuario existe! Mostrando confirmación');
      setShowConfirmation(true);
      return;
    }

    console.log('[DEBUG] Usuario NO existe. Procediendo a crear');
    // Si es creación, proceder directo
    await handleConfirmedSave();
  };

  const handleConfirmedSave = async () => {
    setLoading(true);
    setShowConfirmation(false);

    const payload: {
      usuario_id?: string;
      telefono: string;
      nombre: string;
      apellido: string;
      correo?: string;
      direccion?: string;
      plan?: Plan;
      tipo_identificacion?: 'CC' | 'NIT';
      numero_identificacion?: string;
      ciudad?: string;
    } = {
      telefono: form.telefono.trim(),
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      correo: form.correo.trim() || undefined,
      direccion: form.direccion.trim() || undefined,
      tipo_identificacion: form.tipo_identificacion,
      numero_identificacion: form.numero_identificacion.trim() || undefined,
      ciudad: form.ciudad.trim() || undefined,
    };

    // Incluir usuario_id si viene de initialData (permite cambiar teléfono)
    if (initialData?.usuario_id) {
      payload.usuario_id = initialData.usuario_id;
    }

    // Solo incluir plan en modo 'upsert'
    if (mode === 'upsert') {
      payload.plan = form.plan;
    }

    const res = await upsertUsuarioAdmin(payload);
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
      {/* Toast - DEBE estar FUERA del Modal para tener z-index alto */}
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] animate-fade-in">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}
      
      <Modal
        open={open}
        onClose={handleClose}
        title={existingUser ? 'Actualizar usuario' : 'Agregar usuario'}
      >
        <div className="space-y-4">
          {/* Estado de búsqueda y avisos */}
          {fetchingUser && (
            <div className="text-xs text-gray-500 animate-pulse">Buscando usuario por celular…</div>
          )}

          {/* Visual indicator de cliente existente */}
          {existingUser && mode === 'upsert' && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-xs text-amber-800 font-medium">
                ⚠️ Cliente ya registrado - Se actualizarán los datos proporcionados
              </p>
            </div>
          )}

          {/* Visual indicator en modo edit-profile */}
          {mode === 'edit-profile' && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2">
              <p className="text-xs text-yellow-800 font-medium">
                ⚠️ Ten mucho cuidado al actualizar los datos personales proporcionados
              </p>
            </div>
          )}

          {/* Nombres + Apellidos */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombres"
              required
              placeholder="Nombres"
              value={form.nombre}
              onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
            />
            <Input
              label="Apellidos"
              required
              placeholder="Apellidos"
              value={form.apellido}
              onChange={(e) => setForm(f => ({ ...f, apellido: e.target.value }))}
            />
          </div>

          {/* Tipo + Identificación */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#1d212b]">
                Tipo <span className="text-[#ef4444] ml-1">*</span>
              </label>
              <select
                value={form.tipo_identificacion}
                onChange={(e) => setForm(f => ({ ...f, tipo_identificacion: e.target.value as 'CC' | 'NIT' }))}
                className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm text-[#1d212b] bg-white focus:outline-none focus:ring-2 focus:ring-[#ff8d2d]/50 focus:border-[#ff8d2d]"
              >
                <option value="CC">CC — Cédula de Ciudadanía</option>
                <option value="NIT">NIT</option>
              </select>
            </div>
            <Input
              label="Identificación"
              required
              placeholder="Número de identificación"
              value={form.numero_identificacion}
              onChange={(e) => setForm(f => ({ ...f, numero_identificacion: e.target.value }))}
            />
          </div>

          {/* Celular + Correo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#1d212b]">
                Celular <span className="text-[#ef4444] ml-1">*</span>
              </label>
              <div className="flex items-stretch rounded-lg border border-[#e5e7eb] focus-within:ring-2 focus-within:ring-[#ff8d2d]/50 focus-within:border-[#ff8d2d] overflow-hidden">
                <span className="px-3 py-2 text-sm text-gray-600 bg-gray-50 border-r border-[#e5e7eb] flex items-center">+57</span>
                <input
                  type="tel"
                  placeholder="3182321536"
                  value={form.telefono}
                  onChange={(e) => setForm(f => ({ ...f, telefono: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  className="flex-1 px-3 py-2 text-sm text-[#1d212b] placeholder-[#737780] focus:outline-none"
                />
              </div>
            </div>
            <Input
              label="Correo"
              required
              type="email"
              placeholder="Correo electrónico"
              value={form.correo}
              onChange={(e) => setForm(f => ({ ...f, correo: e.target.value }))}
            />
          </div>

          {/* Ciudad + Dirección */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#1d212b]">
                Ciudad <span className="text-[#ef4444] ml-1">*</span>
              </label>
              <input
                type="text"
                list="ciudades-suggested"
                placeholder="Ciudad de residencia"
                value={form.ciudad}
                onChange={(e) => setForm(f => ({ ...f, ciudad: e.target.value }))}
                className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm text-[#1d212b] placeholder-[#737780] bg-white focus:outline-none focus:ring-2 focus:ring-[#ff8d2d]/50 focus:border-[#ff8d2d]"
              />
              <datalist id="ciudades-suggested">
                {CIUDADES_SUGERIDAS.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <Input
              label="Dirección"
              required
              placeholder="Dirección de residencia"
              value={form.direccion}
              onChange={(e) => setForm(f => ({ ...f, direccion: e.target.value }))}
            />
          </div>

          {/* Plan - Solo en modo 'upsert' */}
          {mode === 'upsert' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#1d212b]">
                Plan <span className="text-[#ef4444] ml-1">*</span>
              </label>
              <select
                className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm text-[#1d212b] bg-white focus:outline-none focus:ring-2 focus:ring-[#ff8d2d]/50 focus:border-[#ff8d2d]"
                value={form.plan}
                onChange={(e) => setForm(f => ({ ...f, plan: e.target.value as Plan }))}
              >
                <option value="control">Control</option>
                <option value="tranquilidad">Tranquilidad</option>
                <option value="respaldo">Respaldo</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              loading={loading} 
              onClick={handleSaveClick}
              disabled={!form.telefono.trim() || !form.nombre.trim() || fetchingUser}
            >
              {existingUser ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmación para actualización */}
      <Modal
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        title="⚠️ Confirmar Actualización"
      >
        <div className="space-y-4">
          {mode === 'upsert' && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3">
              <p className="text-sm text-yellow-900">
                <strong>Este usuario ya está registrado en el sistema.</strong>
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                Los datos que proporciones sobrescribirán la información existente.
              </p>
            </div>
          )}

          {mode === 'edit-profile' && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3">
              <p className="text-sm text-yellow-900">
                <strong>Confirmar actualización de datos personales</strong>
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                Se actualizarán los datos personales del cliente. Asegúrate de que toda la información sea correcta antes de confirmar.
              </p>
            </div>
          )}

          <p className="text-sm text-gray-700">
            <strong>Teléfono:</strong> {form.telefono}
          </p>

          <p className="text-sm text-gray-600 italic">
            ¿Estás seguro de que deseas confirmar la actualización de los datos de este usuario?
          </p>

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
              onClick={handleConfirmedSave}
            >
              Sí, Actualizar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
