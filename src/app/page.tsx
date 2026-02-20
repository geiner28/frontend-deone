'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Badge, { variantFromEstado } from '@/components/ui/Badge';
import { getHealth } from '@/lib/api';
import type { HealthData } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  UsersIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ArrowPathIcon,
  BanknotesIcon,
  SignalIcon,
  BellIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

const modules = [
  {
    label: 'Usuarios',
    description: 'Crear, actualizar y consultar usuarios.',
    href: '/usuarios',
    icon: UsersIcon,
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
    text: 'text-violet-600',
  },
  {
    label: 'Obligaciones',
    description: 'Gestionar obligaciones mensuales.',
    href: '/obligaciones',
    icon: DocumentTextIcon,
    gradient: 'from-blue-500 to-cyan-600',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
  },
  {
    label: 'Facturas',
    description: 'Capturar, validar y pagar facturas.',
    href: '/facturas',
    icon: CreditCardIcon,
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
  },
  {
    label: 'Recargas',
    description: 'Reportar y aprobar recargas.',
    href: '/recargas',
    icon: ArrowPathIcon,
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
  },
  {
    label: 'Disponibilidad',
    description: 'Consultar saldo disponible.',
    href: '/disponible',
    icon: BanknotesIcon,
    gradient: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50',
    text: 'text-rose-600',
  },
];

const quickActions = [
  { label: 'Nuevo usuario', href: '/usuarios', icon: UsersIcon },
  { label: 'Nueva obligación', href: '/obligaciones', icon: DocumentTextIcon },
  { label: 'Capturar factura', href: '/facturas', icon: CreditCardIcon },
  { label: 'Reportar recarga', href: '/recargas', icon: ArrowPathIcon },
];

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const { notifications, adminUnread } = useNotifications();

  useEffect(() => {
    getHealth().then((res) => {
      if (res.ok && res.data) setHealth(res.data);
      setLoading(false);
    });
  }, []);

  const recentNotifs = notifications.filter((n) => n.target === 'admin').slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <KpiCard
          label="Estado del Servicio"
          value={loading ? '...' : health ? 'Activo' : 'Offline'}
          icon={<SignalIcon className="h-5 w-5" />}
          gradient="from-emerald-500 to-green-600"
          detail={loading ? 'Verificando...' : health ? `v${health.timestamp?.slice(0, 10) ?? ''}` : 'Sin conexión'}
          badge={!loading ? <Badge label={health ? health.status : 'error'} variant={variantFromEstado(health?.status ?? '')} /> : undefined}
        />
        <KpiCard
          label="Notificaciones Admin"
          value={adminUnread.toString()}
          icon={<BellIcon className="h-5 w-5" />}
          gradient="from-amber-500 to-orange-600"
          detail={`${notifications.filter((n) => n.target === 'admin').length} totales`}
        />
        <KpiCard
          label="Último check"
          value={health ? formatDateTime(health.timestamp).split(',')[1]?.trim() ?? '—' : '—'}
          icon={<ClockIcon className="h-5 w-5" />}
          gradient="from-blue-500 to-indigo-600"
          detail={health ? formatDateTime(health.timestamp).split(',')[0] : 'Sin datos'}
        />
        <KpiCard
          label="Módulos Activos"
          value="5"
          icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
          gradient="from-violet-500 to-purple-600"
          detail="Todos operativos"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <p className="text-sm font-semibold text-gray-900 mb-3">⚡ Acciones rápidas</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {quickActions.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-xl border border-gray-100 px-3 py-2.5 text-sm text-gray-700 font-medium hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modules */}
        <div className="lg:col-span-2">
          <p className="text-sm font-semibold text-gray-900 mb-3">Módulos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-children">
            {modules.map(({ label, description, href, icon: Icon, gradient, bg, text }) => (
              <Link key={href} href={href}>
                <div className="group relative rounded-2xl bg-white border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer overflow-hidden h-full">
                  <div className="absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 rounded-full bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity"
                    style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
                  />
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${text}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {label}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{description}</p>
                  <div className={`absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r ${gradient} group-hover:w-full transition-all duration-500`} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent admin activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">Actividad reciente</p>
            <Link href="/notificaciones" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              Ver todo
            </Link>
          </div>
          <Card className="!p-0 overflow-hidden">
            {recentNotifs.length === 0 ? (
              <div className="py-12 text-center">
                <BellIcon className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-xs text-gray-500">Sin actividad reciente</p>
                <p className="text-[10px] text-gray-400 mt-1">Las notificaciones aparecerán aquí</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentNotifs.map((n) => (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 transition-colors ${n.read ? '' : 'bg-indigo-50/30'}`}
                  >
                    <span className="text-base leading-none mt-0.5">{n.title.split(' ')[0]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {n.title.split(' ').slice(1).join(' ')}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Tech info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-gray-500 mb-1">Base URL</p>
          <p className="text-sm font-mono text-gray-800 break-all">{process.env.NEXT_PUBLIC_API_DISPLAY_URL || 'Configurado en servidor'}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">Autenticación</p>
          <p className="text-sm font-medium text-gray-800">X-admin-api-key (server proxy)</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">Formato</p>
          <p className="text-sm font-medium text-gray-800">application/json · REST</p>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  gradient,
  detail,
  badge,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
  detail: string;
  badge?: React.ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-[11px] text-gray-400 mt-1">{detail}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
          {icon}
        </div>
      </div>
      {badge && <div className="mt-2">{badge}</div>}
      <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${gradient} opacity-20`} />
    </Card>
  );
}
