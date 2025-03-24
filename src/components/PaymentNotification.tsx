import React from 'react';
import { Payment } from '../types';

interface PaymentNotificationProps {
  t: { visible: boolean; id: string };
  payment: Payment;
  onView: () => void;
}

export function PaymentNotification({ t, payment, onView }: PaymentNotificationProps) {
  // Validar que el pago tenga los datos necesarios
  if (!payment || !payment.customerName) {
    return null;
  }

  return (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
    >
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-600 text-lg font-semibold">$</span>
            </div>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">
              Nuevo pago recibido
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Usuario: {payment.customerName}
            </p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-gray-200">
      </div>
    </div>
  );
}