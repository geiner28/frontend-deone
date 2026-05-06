import { useState } from 'react';
import {
  ChevronDownIcon,
  UserIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  BuildingLibraryIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import type { Factura } from '@/types';
import type { ToastType } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/utils';

interface UserAccionesCardProps {
  usuario: {
    nombre: string;
    apellido: string;
    telefono: string;
  };
  recargasUsuario: any[];
  facturasUsuario: any[];
  facturasHeredadasUsuario: any[];
  onOpenValidarFactura: (factura: Factura) => void;
  onOpenRechazarFactura: (factura: Factura) => void;
  onOpenAproximarValor: (factura: Factura) => void;
  onOpenAprobarRecarga: (usuarioTelefono: string, recargaId?: string) => void;
  onShowToast: (msg: string, type: ToastType) => void;
}

interface AccionGroupProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccionGroup({ icon, title, count, children, defaultOpen = true }: AccionGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
      {/* Header del subgrupo */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-600">{icon}</span>
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
            {count}
          </span>
          <ChevronDownIcon
            className={`h-4 w-4 text-gray-600 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Contenido */}
      {isOpen && (
        <div className="px-4 py-3 space-y-3 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}

export default function UserAccionesCard({
  usuario,
  recargasUsuario,
  facturasUsuario,
  facturasHeredadasUsuario,
  onOpenValidarFactura,
  onOpenRechazarFactura,
  onOpenAproximarValor,
  onOpenAprobarRecarga,
  onShowToast,
}: UserAccionesCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  // Debug: mostrar qué se recibe para diagnosticar
  if (facturasUsuario.length > 0 || facturasHeredadasUsuario.length > 0) {
    console.log('DEBUG UserAccionesCard:', {
      facturasUsuario: facturasUsuario.map(f => ({ servicio: f.servicio, origen: f.origen, es_heredada: f.es_heredada })),
      facturasHeredadasUsuario: facturasHeredadasUsuario.map(f => ({ servicio: f.servicio, origen: f.origen, es_heredada: f.es_heredada }))
    });
  }

  const totalAcciones = recargasUsuario.length + facturasUsuario.length + facturasHeredadasUsuario.length;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
      {/* Header del usuario - ACORDEÓN PRINCIPAL */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-25 border-b border-blue-100 flex items-center justify-between hover:bg-blue-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <UserIcon className="h-5 w-5 text-gray-600" />
          <div className="text-left">
            <p className="font-bold text-gray-900">
              {usuario.nombre} {usuario.apellido}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{usuario.telefono}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <p className="font-semibold text-blue-900">{totalAcciones} acción{totalAcciones !== 1 ? 'es' : ''}</p>
          </div>
          <ChevronDownIcon
            className={`h-5 w-5 text-gray-600 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Contenido colapsable - SUBGRUPOS POR TIPO */}
      {isOpen && (
        <div className="px-6 py-4 space-y-3">
          {/* RECARGAS */}
          {recargasUsuario.length > 0 && (
            <AccionGroup icon={<DevicePhoneMobileIcon className="h-5 w-5" />} title="Recargas Reportadas" count={recargasUsuario.length} defaultOpen={true}>
              <div className="space-y-2">
                {recargasUsuario.map((accion: any) => (
                  <div key={accion.id} className="flex items-center justify-between gap-3 p-3 bg-white rounded border border-gray-200 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">+${accion.monto}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">Estado:</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          {String(accion.estado || 'pendiente').replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(accion.creado_en)}</p>
                      {accion.comprobante_url && (
                        <p className="text-xs mt-1">
                          <a
                            href={accion.comprobante_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                          <PaperClipIcon className="h-3 w-3 inline mr-1" />
                            Ver comprobante
                          </a>
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        onOpenAprobarRecarga(usuario.telefono, accion.recarga_id);
                      }}
                      title="Aprobar o rechazar recarga"
                      className="whitespace-nowrap"
                    >
                      Revisar
                    </Button>
                  </div>
                ))}
              </div>
            </AccionGroup>
          )}

          {/* FACTURAS */}
          {facturasUsuario.length > 0 && (
            <AccionGroup icon={<DocumentTextIcon className="h-5 w-5" />} title="Facturas en Revisión" count={facturasUsuario.length} defaultOpen={true}>
              <div className="space-y-2">
                {facturasUsuario.map((accion: any) => (
                  <div key={accion.id} className="flex items-center justify-between gap-2 p-3 bg-white rounded border border-gray-200 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{accion.servicio}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Período: {accion.periodo} | ${accion.monto}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">Validación:</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                          {String(accion.validacion_estado || 'extraida').replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(accion.creado_en)}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          if (accion.factura_id) {
                            const facturaPartial: Factura = {
                              id: accion.factura_id,
                              usuario_id: accion.usuario_id,
                              obligacion_id: '',
                              monto: accion.monto || 0,
                              servicio: accion.servicio || '',
                              periodo: accion.periodo || '',
                              estado: accion.estado || 'pendiente',
                              referencia_pago: undefined,
                              etiqueta: undefined,
                              fecha_emision: undefined,
                              fecha_vencimiento: undefined,
                              origen: 'admin_panel',
                              extraccion_estado: 'manual',
                              archivo_url: undefined,
                              creado_en: new Date().toISOString(),
                              actualizado_en: new Date().toISOString(),
                            } as Factura;
                            onOpenValidarFactura(facturaPartial);
                          } else {
                            onShowToast('No se puede identificar la factura', 'error');
                          }
                        }}
                        title="Validar factura"
                        className="px-2"
                      >
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (accion.factura_id) {
                            const facturaPartial: Factura = {
                              id: accion.factura_id,
                              usuario_id: accion.usuario_id,
                              obligacion_id: '',
                              monto: accion.monto || 0,
                              servicio: accion.servicio || '',
                              periodo: accion.periodo || '',
                              estado: accion.estado || 'pendiente',
                              referencia_pago: undefined,
                              etiqueta: undefined,
                              fecha_emision: undefined,
                              fecha_vencimiento: undefined,
                              origen: 'admin_panel',
                              extraccion_estado: 'manual',
                              archivo_url: undefined,
                              creado_en: new Date().toISOString(),
                              actualizado_en: new Date().toISOString(),
                            } as Factura;
                            onOpenRechazarFactura(facturaPartial);
                          } else {
                            onShowToast('No se puede identificar la factura', 'error');
                          }
                        }}
                        title="Rechazar factura"
                        className="px-2"
                      >
                        ✗
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </AccionGroup>
          )}

          {/* FACTURAS HEREDADAS */}
          {facturasHeredadasUsuario.length > 0 && (
            <AccionGroup icon={<BuildingLibraryIcon className="h-5 w-5" />} title="Facturas Heredadas" count={facturasHeredadasUsuario.length} defaultOpen={false}>
              <div className="space-y-2">
                {facturasHeredadasUsuario.map((accion: any) => (
                  <div key={accion.id} className="flex items-center justify-between gap-2 p-3 bg-white rounded border border-gray-200 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{accion.servicio}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Período: {accion.periodo} | ${accion.monto}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">Validación:</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                          {String(accion.validacion_estado || 'extraida').replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(accion.creado_en)}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          if (accion.factura_id) {
                            const facturaPartial: Factura = {
                              id: accion.factura_id,
                              usuario_id: accion.usuario_id,
                              obligacion_id: '',
                              monto: accion.monto || 0,
                              servicio: accion.servicio || '',
                              periodo: accion.periodo || '',
                              estado: accion.estado || 'pendiente',
                              referencia_pago: undefined,
                              etiqueta: undefined,
                              fecha_emision: undefined,
                              fecha_vencimiento: undefined,
                              origen: 'admin_panel',
                              extraccion_estado: 'manual',
                              archivo_url: undefined,
                              creado_en: new Date().toISOString(),
                              actualizado_en: new Date().toISOString(),
                            } as Factura;
                            onOpenValidarFactura(facturaPartial);
                          } else {
                            onShowToast('No se puede identificar la factura', 'error');
                          }
                        }}
                        title="Validar factura"
                        className="px-2"
                      >
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (accion.factura_id) {
                            const facturaPartial: Factura = {
                              id: accion.factura_id,
                              usuario_id: accion.usuario_id,
                              obligacion_id: '',
                              monto: accion.monto || 0,
                              servicio: accion.servicio || '',
                              periodo: accion.periodo || '',
                              estado: accion.estado || 'pendiente',
                              referencia_pago: undefined,
                              etiqueta: undefined,
                              fecha_emision: undefined,
                              fecha_vencimiento: undefined,
                              origen: 'admin_panel',
                              extraccion_estado: 'manual',
                              archivo_url: undefined,
                              creado_en: new Date().toISOString(),
                              actualizado_en: new Date().toISOString(),
                            } as Factura;
                            onOpenRechazarFactura(facturaPartial);
                          } else {
                            onShowToast('No se puede identificar la factura', 'error');
                          }
                        }}
                        title="Rechazar factura"
                        className="px-2"
                      >
                        ✗
                      </Button>
                      {accion.origen === 'auto' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (accion.factura_id) {
                              const facturaPartial: Factura = {
                                id: accion.factura_id,
                                usuario_id: accion.usuario_id,
                                obligacion_id: '',
                                monto: accion.monto || 0,
                                servicio: accion.servicio || '',
                                periodo: accion.periodo || '',
                                estado: accion.estado || 'pendiente',
                                referencia_pago: undefined,
                                etiqueta: undefined,
                                fecha_emision: undefined,
                                fecha_vencimiento: undefined,
                                origen: 'admin_panel',
                                extraccion_estado: 'manual',
                                archivo_url: undefined,
                                creado_en: new Date().toISOString(),
                                actualizado_en: new Date().toISOString(),
                              } as Factura;
                              onOpenAproximarValor(facturaPartial);
                            } else {
                              onShowToast('No se puede identificar la factura', 'error');
                            }
                          }}
                          title="Aproximar valor de factura heredada"
                          className="px-2"
                        >
                          ↻
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AccionGroup>
          )}
        </div>
      )}
    </div>
  );
}
