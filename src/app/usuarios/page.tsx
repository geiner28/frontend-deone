'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge, { variantFromEstado } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast, { ToastType } from '@/components/ui/Toast';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { upsertUsuario, getUsuarioByTelefono, updatePlan } from '@/lib/api';
import type { Usuario, Plan } from '@/types';
import { formatDateTime, formatDate } from '@/lib/utils';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

export default function UsuariosPage() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);

  // Buscar usuario
  const [searchTel, setSearchTel] = useState('');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Modal crear/actualizar usuario
  const [openUpsert, setOpenUpsert] = useState(false);
  const [upsertForm, setUpsertForm] = useState({ telefono: '', nombre: '', apellido: '', correo: '' });

  // Modal actualizar plan
  const [openPlan, setOpenPlan] = useState(false);
  const [planForm, setPlanForm] = useState<{ telefono: string; plan: Plan }>({ telefono: '', plan: 'control' });

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  const handleSearch = async () => {
    if (!searchTel.trim()) return;
    setSearchLoading(true);
    const res = await getUsuarioByTelefono(searchTel.trim());
    setSearchLoading(false);
    if (res.ok && res.data) {
      setUsuario(res.data);
    } else {
      setUsuario(null);
      showToast(res.error?.message ?? 'Usuario no encontrado', 'error');
    }
  };

  const handleUpsert = async () => {
    setLoading(true);
    const res = await upsertUsuario(upsertForm);
    setLoading(false);
    if (res.ok) {
      showToast(`Usuario ${res.data?.creado ? 'creado' : 'actualizado'} correctamente`, 'success');
      setOpenUpsert(false);
      setUpsertForm({ telefono: '', nombre: '', apellido: '', correo: '' });
    } else {
      showToast(res.error?.message ?? 'Error al guardar usuario', 'error');
    }
  };

  const handleUpdatePlan = async () => {
    setLoading(true);
    const res = await updatePlan(planForm);
    setLoading(false);
    if (res.ok) {
      showToast(`Plan actualizado: ${res.data?.plan_anterior} → ${res.data?.plan_nuevo}`, 'success');
      setOpenPlan(false);
      if (usuario?.telefono === planForm.telefono) {
        setUsuario((u) => u ? { ...u, plan: planForm.plan } : u);
      }
    } else {
      showToast(res.error?.message ?? 'Error al actualizar plan', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => setOpenUpsert(true)}>
          <UserPlusIcon className="h-4 w-4" /> Crear / Actualizar Usuario
        </Button>
        <Button variant="secondary" onClick={() => setOpenPlan(true)}>
          <PencilSquareIcon className="h-4 w-4" /> Actualizar Plan
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader title="Buscar usuario por teléfono" />
        <div className="flex gap-3">
          <Input
            placeholder="Ej: 3001234567"
            value={searchTel}
            onChange={(e) => setSearchTel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="max-w-xs"
          />
          <Button onClick={handleSearch} loading={searchLoading}>
            <MagnifyingGlassIcon className="h-4 w-4" /> Buscar
          </Button>
        </div>

        {searchLoading && <div className="mt-6"><FullPageSpinner /></div>}

        {usuario && !searchLoading && (
          <div className="mt-6 divide-y divide-gray-100">
            <div className="pb-4 flex items-start justify-between">
              <div>
                <p className="text-base font-semibold text-gray-900">
                  {usuario.nombre} {usuario.apellido}
                </p>
                <p className="text-sm text-gray-500">{usuario.correo}</p>
              </div>
              <Badge label={usuario.activo ? 'Activo' : 'Inactivo'} variant={variantFromEstado(usuario.activo ? 'activa' : 'inactiva')} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4">
              <InfoItem label="Teléfono" value={usuario.telefono} />
              <InfoItem label="Plan" value={<Badge label={usuario.plan} variant={usuario.plan === 'tranquilidad' ? 'success' : 'info'} dot={false} />} />
              <InfoItem label="Miembro desde" value={formatDate(usuario.creado_en)} />
              <InfoItem label="Dirección" value={usuario.direccion ?? '—'} />
              <InfoItem label="ID" value={<span className="font-mono text-xs">{usuario.id}</span>} />
            </div>

            <div className="pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Ajustes</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoItem label="Notificaciones" value={usuario.ajustes_usuario.tipo_notificacion} />
                <InfoItem label="Umbral monto alto" value={`$${usuario.ajustes_usuario.umbral_monto_alto.toLocaleString('es-CO')}`} />
                <InfoItem label="Días anticipación" value={`${usuario.ajustes_usuario.dias_anticipacion_recordatorio} días`} />
                <InfoItem label="Recordatorios" value={usuario.ajustes_usuario.recordatorios_activos ? 'Activos' : 'Inactivos'} />
                <InfoItem label="Req. autorización" value={usuario.ajustes_usuario.requiere_autorizacion_monto_alto ? 'Sí' : 'No'} />
                <InfoItem label="Ajustes desde" value={formatDateTime(usuario.ajustes_usuario.creado_en)} />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modal: Upsert */}
      <Modal open={openUpsert} onClose={() => setOpenUpsert(false)} title="Crear / Actualizar Usuario">
        <div className="space-y-4">
          <Input label="Teléfono" required placeholder="3001234567" value={upsertForm.telefono} onChange={(e) => setUpsertForm((f) => ({ ...f, telefono: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre" required value={upsertForm.nombre} onChange={(e) => setUpsertForm((f) => ({ ...f, nombre: e.target.value }))} />
            <Input label="Apellido" required value={upsertForm.apellido} onChange={(e) => setUpsertForm((f) => ({ ...f, apellido: e.target.value }))} />
          </div>
          <Input label="Correo" type="email" required value={upsertForm.correo} onChange={(e) => setUpsertForm((f) => ({ ...f, correo: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpenUpsert(false)}>Cancelar</Button>
            <Button loading={loading} onClick={handleUpsert}>Guardar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Plan */}
      <Modal open={openPlan} onClose={() => setOpenPlan(false)} title="Actualizar Plan de Usuario">
        <div className="space-y-4">
          <Input label="Teléfono" required placeholder="3001234567" value={planForm.telefono} onChange={(e) => setPlanForm((f) => ({ ...f, telefono: e.target.value }))} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Plan <span className="text-red-500">*</span></label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={planForm.plan}
              onChange={(e) => setPlanForm((f) => ({ ...f, plan: e.target.value as Plan }))}
            >
              <option value="control">Control</option>
              <option value="tranquilidad">Tranquilidad</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpenPlan(false)}>Cancelar</Button>
            <Button loading={loading} onClick={handleUpdatePlan}>Actualizar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <div className="text-sm font-medium text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}
