'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge, { variantFromEstado } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast, { ToastType } from '@/components/ui/Toast';
import { FullPageSpinner } from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { upsertUsuario, getUsuarioByTelefono, updatePlan } from '@/lib/api';
import type { Usuario, Plan } from '@/types';
import { formatDateTime, formatDate, getErrorMsg } from '@/lib/utils';
import { useNotifications, notifFromAction } from '@/contexts/NotificationContext';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  PencilSquareIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

export default function UsuariosPage() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotifications();

  // Buscar usuario
  const [searchTel, setSearchTel] = useState('');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);

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
    setSearched(false);
    const res = await getUsuarioByTelefono(searchTel.trim());
    setSearchLoading(false);
    setSearched(true);
    if (res.ok && res.data) {
      setUsuario(res.data);
    } else {
      setUsuario(null);
      showToast(getErrorMsg(res, 'Usuario no encontrado'), 'error');
    }
  };

  const handleUpsert = async () => {
    setLoading(true);
    const res = await upsertUsuario(upsertForm);
    setLoading(false);
    if (res.ok && res.data) {
      const wasCreated = res.data.es_nuevo;
      showToast(`Usuario ${wasCreated ? 'creado' : 'actualizado'} correctamente`, 'success');
      setOpenUpsert(false);
      if (wasCreated) {
        addNotification(notifFromAction('usuario_nuevo', {
          nombre: `${upsertForm.nombre} ${upsertForm.apellido}`,
          telefono: upsertForm.telefono,
        }));
      }
      setUpsertForm({ telefono: '', nombre: '', apellido: '', correo: '' });
    } else {
      showToast(getErrorMsg(res, 'Error al guardar usuario'), 'error');
    }
  };

  const handleUpdatePlan = async () => {
    setLoading(true);
    const res = await updatePlan(planForm);
    setLoading(false);
    if (res.ok && res.data) {
      showToast(`Plan actualizado: ${res.data.plan_anterior} → ${res.data.plan_nuevo}`, 'success');
      setOpenPlan(false);
      addNotification(notifFromAction('plan_actualizado', {
        plan_anterior: res.data.plan_anterior,
        plan_nuevo: res.data.plan_nuevo,
      }));
      if (usuario?.telefono === planForm.telefono) {
        setUsuario((u) => u ? { ...u, plan: planForm.plan } : u);
      }
    } else {
      showToast(getErrorMsg(res, 'Error al actualizar plan'), 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
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
        <CardHeader title="Buscar usuario por teléfono" subtitle="Ingresa el número para ver el perfil completo" />
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
      </Card>

      {searchLoading && <FullPageSpinner />}

      {searched && !searchLoading && !usuario && (
        <EmptyState
          icon={<UsersIcon className="h-6 w-6" />}
          title="Usuario no encontrado"
          description="No se encontró un usuario con ese teléfono. Puedes crear uno nuevo."
          action={<Button size="sm" onClick={() => { setUpsertForm((f) => ({ ...f, telefono: searchTel })); setOpenUpsert(true); }}>Crear usuario</Button>}
        />
      )}

      {/* User Profile Card */}
      {usuario && !searchLoading && (
        <div className="animate-fade-in-up space-y-4">
          {/* Profile header */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <div className="flex items-start justify-between pt-2">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xl font-bold shadow-lg shadow-indigo-500/25">
                  {usuario.nombre.charAt(0)}{usuario.apellido.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {usuario.nombre} {usuario.apellido}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><PhoneIcon className="h-3.5 w-3.5" />{usuario.telefono}</span>
                    <span className="flex items-center gap-1"><EnvelopeIcon className="h-3.5 w-3.5" />{usuario.correo}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge label={usuario.plan} variant={usuario.plan === 'tranquilidad' ? 'success' : 'info'} />
                <Badge label={usuario.activo ? 'Activo' : 'Inactivo'} variant={variantFromEstado(usuario.activo ? 'activa' : 'inactiva')} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <ProfileStat label="Plan" value={usuario.plan} icon={<ShieldCheckIcon className="h-4 w-4" />} />
              <ProfileStat label="Miembro desde" value={formatDate(usuario.creado_en)} icon={<CalendarDaysIcon className="h-4 w-4" />} />
              <ProfileStat label="Dirección" value={usuario.direccion ?? '—'} />
              <ProfileStat label="ID" value={usuario.id.slice(0, 8) + '…'} mono />
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <Button size="sm" variant="secondary" onClick={() => {
                setPlanForm({ telefono: usuario.telefono, plan: usuario.plan === 'control' ? 'tranquilidad' : 'control' });
                setOpenPlan(true);
              }}>
                <PencilSquareIcon className="h-3.5 w-3.5" /> Cambiar plan
              </Button>
              <Button size="sm" variant="ghost" onClick={() => {
                setUpsertForm({ telefono: usuario.telefono, nombre: usuario.nombre, apellido: usuario.apellido, correo: usuario.correo });
                setOpenUpsert(true);
              }}>
                Editar datos
              </Button>
            </div>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader title="⚙️ Ajustes del usuario" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoItem label="Tipo de notificación" value={usuario.ajustes_usuario.tipo_notificacion} />
              <InfoItem label="Umbral monto alto" value={`$${usuario.ajustes_usuario.umbral_monto_alto.toLocaleString('es-CO')}`} />
              <InfoItem label="Días de anticipación" value={`${usuario.ajustes_usuario.dias_anticipacion_recordatorio} días`} />
              <InfoItem label="Recordatorios" value={
                <Badge label={usuario.ajustes_usuario.recordatorios_activos ? 'Activos' : 'Inactivos'}
                  variant={usuario.ajustes_usuario.recordatorios_activos ? 'success' : 'neutral'} dot={false} />
              } />
              <InfoItem label="Req. autorización monto alto" value={
                <Badge label={usuario.ajustes_usuario.requiere_autorizacion_monto_alto ? 'Sí' : 'No'}
                  variant={usuario.ajustes_usuario.requiere_autorizacion_monto_alto ? 'warning' : 'neutral'} dot={false} />
              } />
              <InfoItem label="Ajustes desde" value={usuario.ajustes_usuario.creado_en ? formatDateTime(usuario.ajustes_usuario.creado_en) : '—'} />
            </div>
          </Card>
        </div>
      )}

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
              <option value="respaldo">Respaldo</option>
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

function ProfileStat({ label, value, icon, mono }: { label: string; value: string; icon?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5">
      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-1.5 mt-1">
        {icon && <span className="text-gray-400">{icon}</span>}
        <p className={`text-sm font-semibold text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
      </div>
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
