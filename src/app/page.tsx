'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { UtilitiesCard } from '@/components/dashboard/UtilitiesCard';
import { QuickActionsPanel } from '@/components/dashboard/QuickActionsPanel';
import { DistributionChart } from '@/components/dashboard/DistributionChart';
import { FacturesCard } from '@/components/dashboard/FacturesCard';
import { PlansCard } from '@/components/dashboard/PlansCard';
import { getAdminDashboard, getAdminDashboardPeriodos } from '@/lib/api';
import type { AdminDashboardData, AdminDashboardPeriodo } from '@/types';

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
  const [availablePeriods, setAvailablePeriods] = useState<AdminDashboardPeriodo[]>([]);
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
    const initDashboard = async () => {
      let year = selectedYear;
      let month = selectedMonth;

      const pRes = await getAdminDashboardPeriodos();
      if (pRes.ok && pRes.data?.periodos) {
        const periodos = pRes.data.periodos;
        setAvailablePeriods(periodos);

        const existe = periodos.some((p) => p.year === selectedYear && p.month === selectedMonth);
        if (!existe && periodos.length > 0) {
          year = periodos[0].year;
          month = periodos[0].month;
          setSelectedYear(year);
          setSelectedMonth(month);
        }
      }

      await fetchDashboard(year, month, selectedPlan);
    };

    initDashboard();
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
        <DashboardHeader
          onMonthChange={handleMonthChange}
          onPlanChange={handlePlanChange}
          availablePeriods={availablePeriods}
        />
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (loading || !dashboardData) {
    return (
      <div className="space-y-8 animate-fade-in">
        <DashboardHeader
          onMonthChange={handleMonthChange}
          onPlanChange={handlePlanChange}
          availablePeriods={availablePeriods}
        />
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
      <DashboardHeader
        onMonthChange={handleMonthChange}
        onPlanChange={handlePlanChange}
        availablePeriods={availablePeriods}
      />

      {/* Main Grid Layout */}
      <div className="space-y-6">
        {/* TOP ROW: Main Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Transacciones"
            value={metricas.totalRecargasAprobadas}
            isCurrency={true}
            label="Cash in"
          />
          <MetricCard
            title="Transacciones"
            value={metricas.totalPagado}
            isCurrency={true}
            label="Cash out"
          />

          <MetricCard
            title="Saldo Disponible"
            value={metricas.saldoDisponible}
            isCurrency={true}
            label="Reservado"
          />
          <MetricCard
            title="Total Pendiente"
            value={metricas.deudaPendiente}
            isCurrency={true}
            label="En obligaciones por pagar"
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
                  { label: 'Pagadas', count: distribucionFacturas.pagadas ?? 0, color: '#10B981' },
                  { label: 'Pendientes', count: distribucionFacturas.pendientes ?? 0, color: '#F59E0B' },
                  { label: 'Vencidas', count: distribucionFacturas.vencidas ?? 0, color: '#DC2626' },
                  { label: 'Sin factura', count: (distribucionFacturas as { sinFactura?: number }).sinFactura ?? 0, color: '#9CA3AF' },
                ]}
                total={
                  (distribucionFacturas.pagadas ?? 0) +
                  (distribucionFacturas.pendientes ?? 0) +
                  (distribucionFacturas.vencidas ?? 0) +
                  ((distribucionFacturas as { sinFactura?: number }).sinFactura ?? 0)
                }
              />
            </div>
            <div className="flex-1 min-h-0">
              <PlansCard
                plans={[
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
