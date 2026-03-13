'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { UtilitiesCard } from '@/components/dashboard/UtilitiesCard';
import { QuickActionsPanel } from '@/components/dashboard/QuickActionsPanel';
import { DistributionChart } from '@/components/dashboard/DistributionChart';
import { FacturesCard } from '@/components/dashboard/FacturesCard';
import { PlansCard } from '@/components/dashboard/PlansCard';
import { getHealth } from '@/lib/api';
import type { HealthData } from '@/types';

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string } | null>(null);
  const [planFilter, setPlanFilter] = useState('all');

  // Datos de ejemplo - serán reemplazados con datos reales del backend
  const metricsData = {
    totalRecargas: 125430,
    totalPagado: 98500,
    totalPendiente: 26930,
    saldoDisponible: 45000,
    utilidades: 15250,
  };

  const distributionData = [
    { label: 'Pagado', value: 98500, percentage: 58, color: '#FF8D2D' },
    { label: 'Pendiente', value: 26930, percentage: 16, color: '#52596B' },
    { label: 'En Proceso', value: 45000, percentage: 26, color: '#C9C9C9' },
  ];

  useEffect(() => {
    getHealth().then((res) => {
      if (res.ok && res.data) setHealth(res.data);
      setLoading(false);
    });
  }, []);

  const handleDateChange = (startDate: string, endDate: string) => {
    setDateFilter({ start: startDate, end: endDate });
    // TODO: Llama a la API con los nuevos filtros de fecha
  };

  const handlePlanChange = (plan: string) => {
    setPlanFilter(plan);
    // TODO: Llama a la API para filtrar por plan
  };

  const handleDistributionFilterChange = (filter: string) => {
    // TODO: Actualiza los datos del gráfico según el filtro temporal
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Dashboard Header with Filters */}
      <DashboardHeader onDateChange={handleDateChange} onPlanChange={handlePlanChange} />

      {/* Main Grid Layout */}
      <div className="space-y-6">
        {/* TOP ROW: 5 Metric Cards - Full Width Horizontal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Total Recargas"
            value={`$${(metricsData.totalRecargas / 1000).toFixed(1)}k`}
            label="+12% este mes"
          />
          <MetricCard
            title="Total Pagado"
            value={`$${(metricsData.totalPagado / 1000).toFixed(1)}k`}
            label="58% del total"
          />
          <MetricCard
            title="Total Pendiente"
            value={`$${(metricsData.totalPendiente / 1000).toFixed(1)}k`}
            label="16% del total"
          />
          <MetricCard
            title="Saldo Disponible"
            value={`$${(metricsData.saldoDisponible / 1000).toFixed(1)}k`}
            label="26% reservado"
          />
          <MetricCard
            title="Transacciones"
            value="342"
            label="Este período"
          />
        </div>

        {/* BOTTOM ROW: 3 Equal Sections - Same Height & Width */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-96">
          {/* SECTION 1: Utilities + Quick Actions */}
          <div className="space-y-3 flex flex-col h-96">
            <UtilitiesCard
              value={metricsData.utilidades || 15250}
              label="Utilidades"
              description="Ganancia neta"
            />
            <div className="flex-1 min-h-0">
              <QuickActionsPanel />
            </div>
          </div>

          {/* SECTION 2: Distribution Chart - Full Height */}
          <div className="h-96 w-full">
            <DistributionChart
              data={distributionData}
              onFilterChange={handleDistributionFilterChange}
            />
          </div>

          {/* SECTION 3: Facturas + Plans - Compact */}
          <div className="flex flex-col h-96 gap-3">
            <div className="flex-shrink-0">
              <FacturesCard />
            </div>
            <div className="flex-1 min-h-0">
              <PlansCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
