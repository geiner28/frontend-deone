'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface DashboardHeaderProps {
  onMonthChange?: (year: number, month: number) => void;
  onPlanChange?: (plan: string) => void;
}

export function DashboardHeader({ onMonthChange, onPlanChange }: DashboardHeaderProps) {
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

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const handleMonthChange = (newMonth: number) => {
    setSelectedMonth(newMonth);
    onMonthChange?.(selectedYear, newMonth);
  };

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    onMonthChange?.(newYear, selectedMonth);
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
              className="appearance-none px-3 py-2 text-sm rounded-lg border border-[#C9C9C9] bg-white text-[#1D212B] focus:outline-none focus:border-[#FF8D2D] pr-8 cursor-pointer w-full sm:w-auto"
            >
              {months.map((month) => (
                <option key={month.id} value={month.id}>
                  {month.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6D7382] pointer-events-none" />
          </div>

          {/* Year Selector */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="appearance-none px-3 py-2 text-sm rounded-lg border border-[#C9C9C9] bg-white text-[#1D212B] focus:outline-none focus:border-[#FF8D2D] pr-8 cursor-pointer w-full sm:w-auto"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
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
