'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface DashboardHeaderProps {
  onDateChange?: (startDate: string, endDate: string) => void;
  onPlanChange?: (plan: string) => void;
}

export function DashboardHeader({ onDateChange, onPlanChange }: DashboardHeaderProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('all');

  const plans = [
    { id: 'all', label: 'Planes' },
    { id: 'basic', label: 'Plan Control' },
    { id: 'standard', label: 'Plan Tranquilidad' },
    { id: 'premium', label: 'Plan Respaldo' },
  ];

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    if (type === 'start') {
      setStartDate(e.target.value);
      onDateChange?.(e.target.value, endDate);
    } else {
      setEndDate(e.target.value);
      onDateChange?.(startDate, e.target.value);
    }
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

        {/* Filters - Only 2 filters */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-start sm:items-center">
          {/* Date Range Filter - Consolidated */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#C9C9C9] bg-white w-full sm:w-auto">
            <span className="text-xs text-[#6D7382] whitespace-nowrap">Fecha (rango):</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange(e, 'start')}
              className="px-2 py-1 text-sm bg-transparent text-[#1D212B] focus:outline-none placeholder-[#52596B]"
              placeholder="Desde"
            />
            <span className="text-[#C9C9C9]">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange(e, 'end')}
              className="px-2 py-1 text-sm bg-transparent text-[#1D212B] focus:outline-none placeholder-[#52596B]"
              placeholder="Hasta"
            />
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
