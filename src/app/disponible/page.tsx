'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast, { ToastType } from '@/components/ui/Toast';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { getDisponible } from '@/lib/api';
import type { DisponibleData } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { MagnifyingGlassIcon, BanknotesIcon } from '@heroicons/react/24/outline';

export default function DisponiblePage() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [data, setData] = useState<DisponibleData | null>(null);

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  const handleConsultar = async () => {
    if (!telefono.trim() || !periodo) return;
    setLoading(true);
    const res = await getDisponible(telefono.trim(), periodo);
    setLoading(false);
    if (res.ok && res.data) {
      setData(res.data);
    } else {
      setData(null);
      showToast(res.error?.message ?? 'Error al consultar disponibilidad', 'error');
    }
  };

  const pct =
    data && data.total_recargas_aprobadas > 0
      ? Math.round((data.disponible / data.total_recargas_aprobadas) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <Card>
        <CardHeader title="Consultar saldo disponible" subtitle="Calcula el saldo disponible para un usuario en un periodo específico" />
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Teléfono del usuario"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="max-w-xs"
          />
          <Input
            type="date"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={handleConsultar} loading={loading}>
            <MagnifyingGlassIcon className="h-4 w-4" /> Consultar
          </Button>
        </div>
      </Card>

      {loading && <FullPageSpinner />}

      {data && !loading && (
        <>
          {/* Resumen visual */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Recargas aprobadas"
              value={formatCurrency(data.total_recargas_aprobadas)}
              color="text-indigo-600"
              bg="bg-indigo-50"
            />
            <StatCard
              label="Pagos realizados"
              value={formatCurrency(data.total_pagos_pagados)}
              color="text-amber-600"
              bg="bg-amber-50"
            />
            <StatCard
              label="Disponible"
              value={formatCurrency(data.disponible)}
              color={data.disponible >= 0 ? 'text-emerald-600' : 'text-red-600'}
              bg={data.disponible >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
              highlight
            />
          </div>

          {/* Detalle */}
          <Card>
            <CardHeader title="Detalle del periodo" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              <InfoItem label="Periodo" value={formatDate(data.periodo)} />
              <InfoItem label="Usuario ID" value={<span className="font-mono text-xs break-all">{data.usuario_id}</span>} />
              <InfoItem label="Disponible" value={formatCurrency(data.disponible)} />
            </div>

            <div className="mt-5">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Saldo disponible vs recargas totales</span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div
                  className={`h-2 rounded-full transition-all ${data.disponible >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                />
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Cálculo</p>
              <div className="space-y-1 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Recargas aprobadas</span>
                  <span className="font-medium text-indigo-600">+{formatCurrency(data.total_recargas_aprobadas)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pagos realizados</span>
                  <span className="font-medium text-red-500">−{formatCurrency(data.total_pagos_pagados)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                  <span className="font-semibold">Disponible</span>
                  <span className={`font-bold ${data.disponible >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(data.disponible)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {!data && !loading && (
        <Card>
          <div className="flex flex-col items-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-4">
              <BanknotesIcon className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Ingresa los datos para consultar</p>
            <p className="text-xs text-gray-500 mt-1">Necesitas el teléfono del usuario y el periodo.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  bg,
  highlight = false,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl ${bg} p-5 ${highlight ? 'ring-2 ring-offset-1 ring-emerald-300' : ''}`}>
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
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
