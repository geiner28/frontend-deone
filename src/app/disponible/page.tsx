'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast, { ToastType } from '@/components/ui/Toast';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { getDisponible } from '@/lib/api';
import type { DisponibleData } from '@/types';
import { formatCurrency, formatDate, getErrorMsg } from '@/lib/utils';
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
      showToast(getErrorMsg(res, 'Error al consultar disponibilidad'), 'error');
    }
  };

  const pct =
    data && data.total_recargas > 0
      ? Math.round((data.disponible / data.total_recargas) * 100)
      : 0;

  return (
    <div className="space-y-6 animate-fade-in">
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
        <div className="animate-fade-in-up space-y-6">
          {/* Visual summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
            <StatCard
              label="Recargas aprobadas"
              value={formatCurrency(data.total_recargas)}
              color="text-indigo-600"
              gradient="from-indigo-500 to-blue-600"
              emoji="📥"
            />
            <StatCard
              label="Pagos realizados"
              value={formatCurrency(data.total_pagos)}
              color="text-amber-600"
              gradient="from-amber-500 to-orange-600"
              emoji="📤"
            />
            <StatCard
              label="Disponible"
              value={formatCurrency(data.disponible)}
              color={data.disponible >= 0 ? 'text-emerald-600' : 'text-red-600'}
              gradient={data.disponible >= 0 ? 'from-emerald-500 to-green-600' : 'from-red-500 to-rose-600'}
              emoji={data.disponible >= 0 ? '💰' : '⚠️'}
              highlight
            />
          </div>

          {/* Detail card */}
          <Card className="relative overflow-hidden">
            <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${data.disponible >= 0 ? 'from-emerald-500 to-green-500' : 'from-red-500 to-rose-500'}`} />
            <CardHeader title="📊 Detalle del periodo" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              <InfoItem label="Periodo" value={formatDate(data.periodo)} />
              <InfoItem label="Usuario ID" value={<span className="font-mono text-xs break-all">{data.usuario_id.slice(0, 16)}…</span>} />
              <InfoItem label="Disponible" value={<span className={data.disponible >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>{formatCurrency(data.disponible)}</span>} />
            </div>

            {/* Progress bar */}
            <div className="mt-6">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Saldo consumido</span>
                <span className="font-semibold">{Math.min(100, Math.max(0, 100 - pct))}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-700 relative"
                  style={{ width: `${Math.min(100, Math.max(0, 100 - pct))}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>Pagado: {formatCurrency(data.total_pagos)}</span>
                <span>Total: {formatCurrency(data.total_recargas)}</span>
              </div>
            </div>

            {/* Calculation */}
            <div className="mt-6 rounded-2xl bg-gradient-to-br from-gray-50 to-slate-50 p-5 border border-gray-100">
              <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Cálculo</p>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">📥 Recargas aprobadas</span>
                  <span className="font-bold text-indigo-600">+{formatCurrency(data.total_recargas)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">📤 Pagos realizados</span>
                  <span className="font-bold text-red-500">−{formatCurrency(data.total_pagos)}</span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-1" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">💎 Disponible</span>
                  <span className={`text-lg font-black ${data.disponible >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(data.disponible)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {!data && !loading && (
        <Card>
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-500 mb-4">
              <BanknotesIcon className="h-8 w-8" />
            </div>
            <p className="text-base font-bold text-gray-900">Consulta el saldo disponible</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">Ingresa el teléfono del usuario y el periodo para calcular su saldo disponible.</p>
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
  gradient,
  emoji,
  highlight = false,
}: {
  label: string;
  value: string;
  color: string;
  gradient: string;
  emoji: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`relative overflow-hidden ${highlight ? 'ring-2 ring-offset-2 ring-emerald-200' : ''}`}>
      <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${gradient}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-600 font-medium mb-1">{label}</p>
          <p className={`text-2xl font-black ${color}`}>{value}</p>
        </div>
        <span className="text-2xl">{emoji}</span>
      </div>
    </Card>
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
