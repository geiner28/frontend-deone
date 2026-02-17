'use client';

import { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl bg-gray-900 px-4 py-3 shadow-lg text-white max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      {type === 'success' ? (
        <CheckCircleIcon className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
      ) : (
        <XCircleIcon className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
      )}
      <p className="text-sm flex-1">{message}</p>
      <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
