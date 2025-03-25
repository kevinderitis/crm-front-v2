import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function WebSocketStatus() {
  const [status, setStatus] = useState({ connected: false, attempts: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      const currentStatus = api.getWebSocketStatus();
      setStatus(currentStatus);

      // Notificar cuando se reconecta
      if (currentStatus.connected && !status.connected) {
        toast.success('Server reconectado!');
      }
      // Notificar cuando se desconecta
      if (!currentStatus.connected && status.connected) {
        toast.error('Reconectando...');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status.connected]);

  if (!status.connected && status.attempts === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 p-2 rounded-lg shadow-lg bg-white">
      <div className="flex items-center space-x-2">
        <div
          className={clsx(
            'w-3 h-3 rounded-full',
            status.connected ? 'bg-green-500' : 'bg-red-500',
            !status.connected && 'animate-pulse'
          )}
        />
        <span className="text-sm text-gray-600">
          {status.connected ? 'Conectado' : `Reconectando (${status.attempts})`}
        </span>
      </div>
    </div>
  );
}