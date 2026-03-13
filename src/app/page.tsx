'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { UtilitiesCard } from '@/components/dashboard/UtilitiesCard';
import { QuickActionsPanel } from '@/components/dashboard/QuickActionsPanel';
import { DistributionChart } from '@/components/dashboard/DistributionChart';
import { FacturesCard } from '@/components/dashboard/FacturesCard';
import { PlansCard } from '@/components/dashboard/PlansCard';
import { getAdminDashboard } from '@/lib/api';
import type { AdminDashboardData } from '@/types';

// Función para formatear como pesos colombianos
const formatCOP = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value).replace('$', '$COP ');
};

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedPlan, setSelectedPlan] = useState('all');

  // Cargar datos del dashboard
  const fetchDashboard = async (year: number, month: number, plan: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminDashboard({
        year,
        month,
        plan: plan === 'all' ? undefined : plan,
      });

      if (res.ok && res.data) {
        setDashboardData(res.data);
      } else {
        setError('Error al cargar datos del dashboard');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    fetchDashboard(selectedYear, selectedMonth, selectedPlan);
  }, []);

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    fetchDashboard(year, month, selectedPlan);
  };

  const handlePlanChange = (plan: string) => {
    setSelectedPlan(plan);
    fetchDashboard(selectedYear, selectedMonth, plan);
  };

  if (error) {
    return (
      <div className="space-y-8 animate-fade-in">
        <DashboardHeader onMonthChange={handleMonthChange} onPlanChange={handlePlanChange} />
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (loading || !dashboardData) {
    return (
      <div className="space-y-8 animate-fade-in">
        <DashboardHeader onMonthChange={handleMonthChange} onPlanChange={handlePlanChange} />
        <div className="flex items-center justify-center py-12">
          <div className="text-[#6D7382]">Cargando datos...</div>
        </div>
      </div>
    );
  }

  const { metricas, distribucionSaldo, distribucionFacturas, distribucionPlanes } = dashboardData;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Dashboard Header with Filters */}
      <DashboardHeader onMonthChange={handleMonthChange} onPlanChange={handlePlanChange} />

      {/* Main Grid Layout */}
      <div className="space-y-6">
        {/* TOP ROW: 5 Metric Cards - Full Width Horizontal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Total Recargas"
            value={metricas.totalRecargasAprobadas}
            isCurrency={true}
            label={`${metricas.cantidadTransacciones} transacciones`}
          />
          <MetricCard
            title="Total Pagado"
            value={metricas.totalPagado}
            isCurrency={true}
            label={metricas.totalPagado > 0 ? `${Math.round((metricas.totalPagado / metricas.totalRecargasAprobadas) * 100)}% utilizado` : 'sin pagos'}
          />

          <MetricCard
            title="Saldo Disponible"
            value={metricas.saldoDisponible}
            isCurrency={true}
            label="Reservado"
          />
          <MetricCard
            title="Deuda Pendiente"
            value={metricas.deudaPendiente}
            isCurrency={true}
            label="En obligaciones por pagar"
          />
          
          <MetricCard
            title="Transacciones Realizadas"
            value={metricas.cantidadTransacciones}
            label="En este período"
          />
        </div>

        {/* BOTTOM ROW: 3 Equal Sections - Same Height & Width */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-96">
          {/* SECTION 1: Balance + Quick Actions */}
          <div className="grid grid-rows-2 gap-4 h-96">
            <UtilitiesCard
              totalPagado={metricas.totalPagado}
              deudaTotal={metricas.deudaTotal}
              saldoDisponible={metricas.saldoDisponible}
              deudaPendiente={metricas.deudaPendiente}
            />
            <QuickActionsPanel />
          </div>

          {/* SECTION 2: Distribution by User Saldo - Full Height */}
          <div className="h-96 w-full">
            <DistributionChart
              data={distribucionSaldo.map((item) => ({
                label: item.usuario,
                value: item.saldo,
                color: '', // El componente asignará colores automáticamente
              }))}
              title="Distribución de Saldo por Usuarios"
            />
          </div>

          {/* SECTION 3: Facturas + Plans - Compact */}
          <div className="flex flex-col h-96 gap-3">
            <div className="flex-shrink-0">
              <FacturesCard
                indicators={[
                  { label: 'Pagadas', count: distribucionFacturas.pagadas, color: '#FF8D2D' },
                  { label: 'Pendientes', count: distribucionFacturas.pendientes, color: '#52596B' },
                  { label: 'Vencidas', count: distribucionFacturas.vencidas, color: '#DC2626' },
                  { label: 'En Revisión', count: distribucionFacturas.enRevision, color: '#F59E0B' },
                  { label: 'Rechazadas', count: distribucionFacturas.rechazadas, color: '#6B7280' },
                ]}
                total={
                  distribucionFacturas.pagadas +
                  distribucionFacturas.pendientes +
                  distribucionFacturas.vencidas +
                  distribucionFacturas.enRevision +
                  distribucionFacturas.rechazadas
                }
              />
            </div>
            <div className="flex-1 min-h-0">
              <PlansCard
                plans={[
                  { label: 'Control', users: distribucionPlanes.control, percentage: 0, color: '#FF8D2D' },
                  { label: 'Tranquilidad', users: distribucionPlanes.tranquilidad, percentage: 0, color: '#52596B' },
                  { label: 'Respaldo', users: distribucionPlanes.respaldo, percentage: 0, color: '#C9C9C9' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
