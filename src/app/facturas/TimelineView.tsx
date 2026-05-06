'use client';

import { useMemo, useState } from 'react';
import type { FacturaEnriquecida } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface TimelineViewProps {
  facturas: FacturaEnriquecida[];
  selectedUser: string;
  onUserChange: (userId: string) => void;
  users: FacturaEnriquecida[];
  selectedPlan: string;
  onPlanChange: (plan: string) => void;
}

export default function TimelineView({
  facturas: facturasRaw,
  selectedUser,
  onUserChange,
  users,
  selectedPlan,
  onPlanChange,
}: TimelineViewProps) {
  // Aplicar filtros de user y plan
  const planDisabled = selectedUser !== 'todos';
  const facturas = facturasRaw.filter((f) => {
    const matchUser = selectedUser === 'todos' || f.usuario_id === selectedUser;
    const userPlan = f.usuario?.plan || 'sin_plan';
    const matchPlan = selectedUser !== 'todos' || selectedPlan === 'todos' || userPlan === selectedPlan;
    return matchUser && matchPlan;
  });

  const ahora = new Date();
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  const [mesSeleccionado, setMesSeleccionado] = useState(ahora.getMonth());
  const [añoSeleccionado, setAñoSeleccionado] = useState(ahora.getFullYear());

  const timelineData = useMemo(() => {
    if (!facturas.length) return { usuarios: [], dias: [], hoy: 0, mesActual: '', mesAño: '', esHoy: false };

    // Get unique users
    const usuarios = Array.from(new Set(facturas.map(f => f.usuario_id)))
      .map(userId => facturas.find(f => f.usuario_id === userId)!)
      .map(f => ({
        id: f.usuario_id,
        nombre: f.usuario?.nombre || 'Sin nombre',
        apellido: f.usuario?.apellido || '',
      }));

    // Mostrar todo el mes para representar rangos (recordatorio -> vencimiento).
    const daysInMonth = new Date(añoSeleccionado, mesSeleccionado + 1, 0).getDate();
    const dias = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Check if today is in the selected month
    const hoy = ahora.getDate();
    const esHoy = ahora.getMonth() === mesSeleccionado && ahora.getFullYear() === añoSeleccionado;

    const mesActual = meses[mesSeleccionado];
    const mesAño = `${mesActual} ${añoSeleccionado}`;

    return { usuarios, dias, hoy, mesActual, mesAño, esHoy };
  }, [facturas, mesSeleccionado, añoSeleccionado]);

  const getFacturaRange = (f: FacturaEnriquecida) => {
    const startRaw = f.fecha_recordatorio || f.fecha_emision || f.fecha_vencimiento;
    const endRaw = f.fecha_vencimiento || f.fecha_recordatorio || f.fecha_emision;
    if (!startRaw || !endRaw) return null;

    const start = new Date(startRaw);
    const end = new Date(endRaw);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

    if (start.getTime() <= end.getTime()) return { start, end };
    return { start: end, end: start };
  };

  const isFacturaVisibleInSelectedMonth = (f: FacturaEnriquecida) => {
    const range = getFacturaRange(f);
    if (!range) return false;

    const monthStart = new Date(añoSeleccionado, mesSeleccionado, 1);
    const monthEnd = new Date(añoSeleccionado, mesSeleccionado + 1, 0, 23, 59, 59, 999);
    return range.end >= monthStart && range.start <= monthEnd;
  };

  const getVisibleFacturasByUser = (usuarioId: string) => {
    return facturas
      .filter((f) => f.usuario_id === usuarioId)
      .filter((f) => isFacturaVisibleInSelectedMonth(f))
      .sort((a, b) => {
        const ra = getFacturaRange(a);
        const rb = getFacturaRange(b);
        if (!ra || !rb) return 0;
        return ra.start.getTime() - rb.start.getTime();
      });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pagada':
        return 'bg-green-500';
      case 'pendiente':
        return 'bg-amber-500';
      case 'aproximada':
        return 'bg-indigo-500';
      case 'sin_factura':
        return 'bg-gray-400';
      // Compat
      case 'validada':
        return 'bg-blue-500';
      case 'extraida':
        return 'bg-yellow-500';
      case 'rechazada':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'pagada':
        return 'Pagada';
      case 'pendiente':
        return 'Pendiente';
      case 'aproximada':
        return 'Aproximada';
      case 'sin_factura':
        return 'Sin factura';
      // Compat
      case 'validada':
        return 'Validada';
      case 'extraida':
        return 'Por validar';
      case 'rechazada':
        return 'Rechazada';
      default:
        return estado;
    }
  };

  if (!facturas.length) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No hay facturas para mostrar</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between mb-2 gap-3">
        <h2 className="text-xl font-bold text-gray-900">Cronograma de Facturas (Recordatorio → Vencimiento)</h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedUser}
            onChange={(e) => {
              onUserChange(e.target.value);
              if (e.target.value !== 'todos') onPlanChange('todos');
            }}
            className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="todos">User: Todos</option>
            {users.map((u) => (
              <option key={u.usuario_id} value={u.usuario_id}>
                User: {u.usuario?.nombre}
              </option>
            ))}
          </select>
          <select
            value={selectedPlan}
            onChange={(e) => onPlanChange(e.target.value)}
            disabled={planDisabled}
            title={planDisabled ? 'Quita el filtro de Usuario para filtrar por plan' : ''}
            className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="todos">Plan: Todos</option>
            <option value="tranquilidad">Plan: Tranquilidad</option>
            <option value="respaldo">Plan: Respaldo</option>
          </select>
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(parseInt(e.target.value))}
            className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {meses.map((mes, idx) => (
              <option key={idx} value={idx}>{mes}</option>
            ))}
          </select>
          <select
            value={añoSeleccionado}
            onChange={(e) => setAñoSeleccionado(parseInt(e.target.value))}
            className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {[2024, 2025, 2026, 2027].map((año) => (
              <option key={año} value={año}>{año}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-6">
      {/* Main Timeline */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header with days */}
          <div className="flex">
            <div className="w-48 border-r border-gray-200 sticky left-0 bg-white">
              <div className="p-4 h-20 flex items-end pb-4">
                <span className="text-xs font-medium text-gray-500">Usuario</span>
              </div>
            </div>
            <div className="flex-1 flex">
              {timelineData.dias.length > 0 ? (
                <>
                  {/* Day columns */}
                  {timelineData.dias.map((dia) => (
                    <div key={dia} className="flex-1 min-w-40 border-r border-gray-200 last:border-r-0">
                      <div className="p-3 border-b border-gray-200">
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-bold text-gray-900">{dia}</span>
                          <span className="text-xs text-gray-500 mt-0.5">{timelineData.mesActual}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex-1 p-4 text-gray-500 text-sm">Sin datos de fecha</div>
              )}
            </div>
          </div>

          {/* Users rows */}
          {timelineData.usuarios.map((usuario) => {
            const facturasUsuario = getVisibleFacturasByUser(usuario.id);
            const rowHeight = Math.max(56, facturasUsuario.length * 26 + 12);

            return (
            <div key={usuario.id} className="flex border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
              {/* User column */}
              <div className="w-48 border-r border-gray-200 sticky left-0 bg-white p-4 flex items-center" style={{ minHeight: rowHeight }}>
                <div className="text-sm font-medium text-gray-900">
                  {usuario.nombre} {usuario.apellido}
                </div>
              </div>

              {/* Day cells */}
              <div className="flex-1 flex relative" style={{ minHeight: rowHeight }}>
                {timelineData.dias.map((dia) => {
                  return (
             <div
                      key={`${usuario.id}-${dia}`}
                      className="flex-1 min-w-32 border-r border-gray-200 last:border-r-0 relative"
                    >
                      {/* Today indicator line */}
                      {timelineData.esHoy && timelineData.hoy === dia && (
                        <div className="absolute inset-y-0 left-0 border-l-2 border-orange-500 z-20">
                          <div className="absolute -top-2 -left-2 px-1 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded">HOY</div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Facturas como barras continuas recordatorio -> vencimiento */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                  {facturasUsuario.map((factura, idx) => {
                    const range = getFacturaRange(factura);
                    if (!range) return null;

                    const monthStart = new Date(añoSeleccionado, mesSeleccionado, 1);
                    const monthEnd = new Date(añoSeleccionado, mesSeleccionado + 1, 0);

                    const visibleStart = range.start < monthStart ? monthStart : range.start;
                    const visibleEnd = range.end > monthEnd ? monthEnd : range.end;

                    const startDay = visibleStart.getDate();
                    const endDay = visibleEnd.getDate();
                    const totalDays = timelineData.dias.length || 30;
                    const leftPct = ((startDay - 1) / totalDays) * 100;
                    const widthPct = ((endDay - startDay + 1) / totalDays) * 100;

                    return (
                      <div
                        key={factura.id}
                        className={`${getEstadoColor(factura.estado)} absolute h-5 rounded-md text-white text-[11px] font-semibold truncate px-2 leading-5 pointer-events-auto`}
                        style={{
                          left: `${leftPct}%`,
                          width: `${Math.max(widthPct, 1.8)}%`,
                          top: `${6 + idx * 26}px`,
                        }}
                        title={`${factura.etiqueta || factura.servicio} - ${formatCurrency(factura.monto)} (${getEstadoLabel(factura.estado)})`}
                      >
                        {`${factura.etiqueta || factura.servicio} - ${formatCurrency(factura.monto)}`}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );})}
        </div>
      </div>

      {/* Legend */}
      <div className="w-48">
        <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-0">
          <h3 className="font-bold text-gray-900 mb-4">Estados</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-700">Pagada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-sm text-gray-700">Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <span className="text-sm text-gray-700">Aproximada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span className="text-sm text-gray-700">Sin factura</span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
