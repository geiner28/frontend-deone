'use client';

import { useState } from 'react';
import { CheckCircleIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';

interface NotificationDisplayProps {
  notification: {
    id: string;
    tipo: string;
    mensaje: string;
  } | null;
  status: 'success' | 'error';
  errorMessage?: string;
  onClose: () => void;
  title?: string;
}

const notificationIcons: Record<string, React.ReactNode> = {
  factura_validada: '📄',
  factura_rechazada: '⚠️',
  recarga_aprobada: '✅',
  recarga_rechazada: '❌',
};

export default function NotificationDisplay({
  notification,
  status,
  errorMessage,
  onClose,
  title,
}: NotificationDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (notification?.mensaje) {
      try {
        await navigator.clipboard.writeText(notification.mensaje);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Error copying:', err);
      }
    }
  };

  if (status === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 my-4">
        <div className="flex items-start gap-4">
          <XMarkIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error en la operación</h3>
            <p className="text-sm text-red-700 mt-1">{errorMessage || 'Ocurrió un error al processar la solicitud'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!notification) return null;

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-6 my-4">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <CheckCircleIcon className="h-6 w-6 text-green-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-green-900 flex items-center gap-2">
            {notificationIcons[notification.tipo] && (
              <span className="text-xl">{notificationIcons[notification.tipo]}</span>
            )}
            {title || 'Operación completada'}
          </h3>

          {/* Notificación enviada al usuario */}
          <div className="mt-4 p-4 bg-white rounded-lg border border-green-100">
            <p className="text-sm text-gray-600 mb-2 font-semibold">
              Notificación enviada al usuario:
            </p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
              {notification.mensaje}
            </p>
          </div>

          {/* Botones de acción */}
          <div className="mt-4 flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleCopy}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Copiado
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copiar mensaje
                </>
              )}
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
