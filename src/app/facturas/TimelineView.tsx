'use client';

import { useMemo } from 'react';
import type { FacturaEnriquecida } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface TimelineViewProps {
  facturas: FacturaEnriquecida[];
}

export default function TimelineView({ facturas }: TimelineViewProps) {
  const timelineData = useMemo(() => {
    if (!facturas.length) return { usuarios: [], dias: [] };

    // Get unique users
    const usuarios = Array.from(new Set(facturas.map(f => f.usuario_id)))
      .map(userId => facturas.find(f => f.usuario_id === userId)!)
      .map(f => ({
        id: f.usuario_id,
        nombre: f.usuario?.nombre || 'Sin nombre',
        apellido: f.usuario?.apellido || '',
      }));

    // Get day range
    const fechas = facturas
      .filter(f => f.fecha_vencimiento)
      .map(f => new Date(f.fecha_vencimiento || new Date()).getDate());

    const dias = Array.from(new Set(fechas))
      .sort((a, b) => a - b);

    // Get today's day
    const hoy = new Date().getDate();

    return { usuarios, dias, hoy };
  }, [facturas]);

  const getFacturasByUserAndDay = (usuarioId: string, dia: number) => {
    return facturas.filter(f => {
      if (f.usuario_id !== usuarioId) return false;
      if (!f.fecha_vencimiento) return false;
      const facturaDay = new Date(f.fecha_vencimiento).getDate();
      return facturaDay === dia;
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pagada':
        return 'bg-green-500';
      case 'validada':
        return 'bg-blue-500';
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
                  {timelineData.dias.map((dia, idx) => (
                    <div key={dia} className="flex-1 min-w-32 border-r border-gray-200  last:border-r-0">
                      <div className="p-4 h-20 flex items-end pb-4 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-700">{dia}</span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex-1 p-4 text-gray-500 text-sm">Sin datos de fecha</div>
              )}
            </div>
          </div>

          {/* Today line indicator (will be added to each row)*/}

          {/* Users rows */}
          {timelineData.usuarios.map((usuario) => (
            <div key={usuario.id} className="flex border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
              {/* User column */}
              <div className="w-48 border-r border-gray-200 sticky left-0 bg-white p-4 flex items-center">
                <div className="text-sm font-medium text-gray-900">
                  {usuario.nombre} {usuario.apellido}
                </div>
              </div>

              {/* Day cells */}
              <div className="flex-1 flex relative">
                {timelineData.dias.map((dia) => {
                  const facturasDelDia = getFacturasByUserAndDay(usuario.id, dia);
                  return (
                    <div
                      key={`${usuario.id}-${dia}`}
                      className="flex-1 min-w-32 border-r border-gray-200 last:border-r-0 p-2 relative"
                    >
                      {/* Today indicator line */}
                      {timelineData.hoy === dia && (
                        <div className="absolute inset-0 border-l-2 border-blue-500">
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-blue-500 rounded-full"></div>
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-blue-500 rounded-full"></div>
                        </div>
                      )}

                      {/* Facturas pills */}
                      {facturasDelDia.map((factura) => (
                        <div
                          key={factura.id}
                          className={`${getEstadoColor(
                            factura.estado
                          )} text-white rounded-lg px-2 py-1 text-xs font-medium mb-1 truncate`}
                          title={`${factura.servicio} - ${formatCurrency(factura.monto)}`}
                        >
                          {factura.etiqueta || factura.servicio} - {formatCurrency(factura.monto)}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="w-48">
        <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-0">
          <h3 className="font-bold text-gray-900 mb-4">Facturas</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-700">Pagadas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-gray-700">Validadas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-gray-700">Pendientes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-gray-700">Vencidas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span className="text-sm text-gray-700">Sin factura</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
