'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type { AdminDashboardPeriodo } from '@/types';

interface DashboardHeaderProps {
  onMonthChange?: (year: number, month: number) => void;
  onPlanChange?: (plan: string) => void;
  availablePeriods?: AdminDashboardPeriodo[];
}

export function DashboardHeader({ onMonthChange, onPlanChange, availablePeriods = [] }: DashboardHeaderProps) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedPlan, setSelectedPlan] = useState('all');

  const plans = [
    { id: 'all', label: 'Todos los Planes' },
    { id: 'control', label: 'Plan Control' },
    { id: 'tranquilidad', label: 'Plan Tranquilidad' },
    { id: 'respaldo', label: 'Plan Respaldo' },
  ];

  const months = [
    { id: 1, label: 'Enero' },
    { id: 2, label: 'Febrero' },
    { id: 3, label: 'Marzo' },
    { id: 4, label: 'Abril' },
    { id: 5, label: 'Mayo' },
    { id: 6, label: 'Junio' },
    { id: 7, label: 'Julio' },
    { id: 8, label: 'Agosto' },
    { id: 9, label: 'Septiembre' },
    { id: 10, label: 'Octubre' },
    { id: 11, label: 'Noviembre' },
    { id: 12, label: 'Diciembre' },
  ];

  const sortedPeriods = useMemo(
    () => [...availablePeriods].sort((a, b) => (b.year - a.year) || (b.month - a.month)),
    [availablePeriods]
  );

  const years = useMemo(
    () => Array.from(new Set(sortedPeriods.map((p) => p.year))),
    [sortedPeriods]
  );

  const monthsBySelectedYear = useMemo(
    () => sortedPeriods.filter((p) => p.year === selectedYear).map((p) => p.month),
    [sortedPeriods, selectedYear]
  );

  useEffect(() => {
    if (sortedPeriods.length === 0) return;

    const exists = sortedPeriods.some((p) => p.year === selectedYear && p.month === selectedMonth);
    if (!exists) {
      const first = sortedPeriods[0];
      setSelectedYear(first.year);
      setSelectedMonth(first.month);
      onMonthChange?.(first.year, first.month);
    }
  }, [sortedPeriods, selectedYear, selectedMonth, onMonthChange]);

  const handleMonthChange = (newMonth: number) => {
    setSelectedMonth(newMonth);
    onMonthChange?.(selectedYear, newMonth);
  };

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    const monthsForYear = sortedPeriods.filter((p) => p.year === newYear).map((p) => p.month);
    const nextMonth = monthsForYear.includes(selectedMonth) ? selectedMonth : (monthsForYear[0] || selectedMonth);
    setSelectedMonth(nextMonth);
    onMonthChange?.(newYear, nextMonth);
  };

  const handlePlanChange = (planId: string) => {
    setSelectedPlan(planId);
    onPlanChange?.(planId);
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1D212B]">Dashboard</h1>
          <p className="text-sm text-[#52596B] mt-1">Resumen de actividad y métricas</p>
        </div>

        {/* Filters - Month, Year, Plan */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-start sm:items-center">
          {/* Month Selector */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              disabled={monthsBySelectedYear.length === 0}
              className="appearance-none px-3 py-2 text-sm rounded-lg border border-[#C9C9C9] bg-white text-[#1D212B] focus:outline-none focus:border-[#FF8D2D] pr-8 cursor-pointer w-full sm:w-auto"
            >
              {monthsBySelectedYear.length > 0 ? (
                months
                  .filter((month) => monthsBySelectedYear.includes(month.id))
                  .map((month) => (
                    <option key={month.id} value={month.id}>
                      {month.label}
                    </option>
                  ))
              ) : (
                <option value="">Sin registros</option>
              )}
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6D7382] pointer-events-none" />
          </div>

          {/* Year Selector */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              disabled={years.length === 0}
              className="appearance-none px-3 py-2 text-sm rounded-lg border border-[#C9C9C9] bg-white text-[#1D212B] focus:outline-none focus:border-[#FF8D2D] pr-8 cursor-pointer w-full sm:w-auto"
            >
              {years.length > 0 ? (
                years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))
              ) : (
                <option value="">Sin registros</option>
              )}
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6D7382] pointer-events-none" />
          </div>

          {/* Plan Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedPlan}
              onChange={(e) => handlePlanChange(e.target.value)}
              className="appearance-none px-3 py-2 text-sm rounded-lg border border-[#C9C9C9] bg-white text-[#1D212B] focus:outline-none focus:border-[#FF8D2D] pr-8 cursor-pointer w-full sm:w-auto"
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6D7382] pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
