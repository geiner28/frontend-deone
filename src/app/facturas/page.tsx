'use client';

import { useEffect, useState } from 'react';
import Toast, { ToastType } from '@/components/ui/Toast';
import { getAllFacturas } from '@/lib/api';
import type { FacturaEnriquecida, ListarTodasLasFacturasData } from '@/types';
import { formatCurrency, getErrorMsg } from '@/lib/utils';
import TimelineView from './TimelineView';
import TableView from './TableView';

type ViewType = 'timeline' | 'table';
type EstadoFilter = 'todas' | 'pagada' | 'pendiente' | 'sin_factura';

export default function FacturasPage() {
  const [currentView, setCurrentView] = useState<ViewType>('table');
  const [facturas, setFacturas] = useState<FacturaEnriquecida[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [currentEstado, setCurrentEstado] = useState<EstadoFilter>('todas');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Table view specific
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('todos');
  const [selectedPlan, setSelectedPlan] = useState<string>('todos');

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  const loadFacturas = async (page = 1, estado?: string) => {
    setLoading(true);
    const res = await getAllFacturas({
      page,
      limit: 50,
      estado: estado || (currentEstado !== 'todas' ? currentEstado : undefined),
    });
    setLoading(false);
    
    if (res.ok && res.data) {
      setFacturas(res.data.facturas);
      setTotalPages(res.data.pagination.total_pages);
      setTotal(res.data.pagination.total);
    } else {
      showToast(getErrorMsg(res, 'Error al cargar facturas'), 'error');
    }
  };

  useEffect(() => {
    loadFacturas(1, currentEstado !== 'todas' ? currentEstado : undefined);
  }, [currentEstado]);

  // Filter and search facturas for table view
  const filteredFacturas = facturas.filter(f => {
    const matchSearch = 
      !searchTerm || 
      f.servicio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.usuario_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.referencia_pago?.includes(searchTerm);
    
    const matchUser = selectedUser === 'todos' || f.usuario_id === selectedUser;
    
    return matchSearch && matchUser;
  });

  // Get unique users for filter
  const uniqueUsers = Array.from(new Set(facturas.map(f => f.usuario_id)))
    .map(userId => facturas.find(f => f.usuario_id === userId))
    .filter(Boolean) as FacturaEnriquecida[];

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
          <p className="text-sm text-gray-500 mt-1">Descripción</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setCurrentView('table')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
              currentView === 'table'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:text-gray-900'
            } flex items-center gap-2`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z" />
            </svg>
            Tabla
          </button>
          <button
            onClick={() => setCurrentView('timeline')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
              currentView === 'timeline'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:text-gray-900'
            } flex items-center gap-2`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H3a1 1 0 000 2h3a2 2 0 01-2-2V5zm0 4a1 1 0 100 2h10a1 1 0 100-2H4zm0 4a1 1 0 100 2h10a1 1 0 100-2H4z" clipRule="evenodd" />
            </svg>
            Timeline
          </button>
        </div>
      </div>

      {/* Estado Filter Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 flex gap-3 flex-wrap">
        {(['todas', 'pagada', 'pendiente', 'sin_factura'] as const).map((estado) => (
          <button
            key={estado}
            onClick={() => {
              setCurrentEstado(estado);
              setCurrentPage(1);
            }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              currentEstado === estado
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            } flex items-center gap-2`}
          >
            <span>{estado.charAt(0).toUpperCase() + estado.slice(1)}</span>
            {currentEstado === estado && total > 0 && (
              <span className="bg-white text-orange-500 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <p className="text-gray-500 mt-2">Cargando facturas...</p>
          </div>
        </div>
      ) : currentView === 'timeline' ? (
        <TimelineView facturas={facturas} />
      ) : (
        <TableView
          facturas={filteredFacturas}
          total={total}
          currentPage={currentPage}
          totalPages={totalPages}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedUser={selectedUser}
          onUserChange={setSelectedUser}
          users={uniqueUsers}
          onPageChange={(page: number) => {
            setCurrentPage(page);
            loadFacturas(page, currentEstado !== 'todas' ? currentEstado : undefined);
          }}
        />
      )}
    </div>
  );
}

