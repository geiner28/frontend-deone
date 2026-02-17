'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Badge, { variantFromEstado } from '@/components/ui/Badge';
import { getHealth } from '@/lib/api';
import type { HealthData } from '@/types';
import { formatDateTime } from '@/lib/utils';
import {
  UsersIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ArrowPathIcon,
  BanknotesIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

const modules = [
  {
    label: 'Usuarios',
    description: 'Crear, actualizar y consultar usuarios.',
    href: '/usuarios',
    icon: UsersIcon,
    color: 'bg-violet-50 text-violet-600',
  },
  {
    label: 'Obligaciones',
    description: 'Gestionar obligaciones por periodo.',
    href: '/obligaciones',
    icon: DocumentTextIcon,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'Facturas',
    description: 'Capturar facturas en obligaciones.',
    href: '/facturas',
    icon: CreditCardIcon,
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    label: 'Recargas',
    description: 'Reportar y aprobar recargas.',
    href: '/recargas',
    icon: ArrowPathIcon,
    color: 'bg-amber-50 text-amber-600',
  },
  {
    label: 'Disponibilidad',
    description: 'Consultar saldo disponible.',
    href: '/disponible',
    icon: BanknotesIcon,
    color: 'bg-rose-50 text-rose-600',
  },
];

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHealth().then((res) => {
      if (res.ok && res.data) setHealth(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <SignalIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Estado del servicio</p>
              <p className="text-xs text-gray-500">
                {loading
                  ? 'Verificando conexión…'
                  : health
                  ? `Última verificación: ${formatDateTime(health.timestamp)}`
                  : 'No se pudo conectar con la API'}
              </p>
            </div>
          </div>
          {!loading && (
            <Badge
              label={health ? health.status : 'Sin conexión'}
              variant={variantFromEstado(health?.status ?? '')}
            />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-gray-500 mb-1">Base URL</p>
          <p className="text-sm font-mono text-gray-800 break-all">prueba-supabase.onrender.com/api</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">Autenticación</p>
          <p className="text-sm font-medium text-gray-800">X-admin-api-key</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">Formato</p>
          <p className="text-sm font-medium text-gray-800">application/json</p>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Módulos disponibles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(({ label, description, href, icon: Icon, color }) => (
            <Link key={href} href={href}>
              <Card className="group hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer h-full">
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {label}
                </p>
                <p className="mt-1 text-xs text-gray-500">{description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
