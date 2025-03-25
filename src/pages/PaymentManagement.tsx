import React, { useState, useEffect } from 'react';
import { Payment } from '../types';
import { Check, X, Image, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function PaymentManagement() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Cargar pagos iniciales
  useEffect(() => {
    loadPayments();
  }, []);

  // Suscribirse a eventos de WebSocket para nuevos pagos
  useWebSocket({
    onNewPayment: (payment) => {
      if (payment && payment.status) {
        setPayments(prev => [payment, ...prev]);
        // toast.success(`New payment received from ${payment.customerName}!`);
      } else {
        console.error('Invalid payment data received:', payment);
      }
    }
  });

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      const fetchedPayments = await api.getPayments();
      setPayments(fetchedPayments);
    } catch (error) {
      toast.error('Error loading payments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (paymentId: string) => {
    try {
      const updatedPayment = await api.approvePayment(paymentId);
      setPayments(payments.map(payment => 
        payment._id === paymentId ? updatedPayment : payment
      ));
      toast.success('Pago aprobado con éxito');
    } catch (error) {
      toast.error('Error approving payment');
    }
  };

  const handleReject = async (paymentId: string) => {
    try {
      const updatedPayment = await api.rejectPayment(paymentId);
      setPayments(payments.map(payment => 
        payment._id === paymentId ? updatedPayment : payment
      ));
      toast.success('Pago rechazado con éxito');
    } catch (error) {
      toast.error('Error rejecting payment');
    }
  };

  const pendingPayments = payments.filter(p => p?.status === 'pending') || [];
  const approvedPayments = payments.filter(p => p?.status === 'approved') || [];
  const rejectedPayments = payments.filter(p => p?.status === 'rejected') || [];

  const PaymentTable = ({ 
    payments, 
    showActions = false,
  }: { 
    payments: Payment[], 
    showActions?: boolean,
  }) => (
    <div className="overflow-auto h-full bg-white rounded-lg shadow">
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : payments.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-500">
          No hay pagos encontrados
        </div>
      ) : (
        <table className="min-w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
              {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th> */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th> */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comprobante</th>
              {showActions && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.map((payment) => (
              <tr key={payment._id} className={clsx(
                "hover:bg-gray-50",
                payment.status === 'approved' && "bg-green-50",
                payment.status === 'rejected' && "bg-red-50"
              )}>
                <td className="px-6 py-4 whitespace-nowrap">{payment.customerName}</td>
                {/* <td className="px-6 py-4 whitespace-nowrap">
                  ${payment.amount?.toFixed(2)}
                </td> */}
                <td className="px-6 py-4 whitespace-nowrap">{new Date(payment.date).toLocaleDateString('es-AR')} - {new Date(payment.date).toLocaleTimeString('es-AR')}</td>
                {/* <td className="px-6 py-4 whitespace-nowrap">{payment.time}</td> */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => setSelectedImage(payment.image)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Image className="h-5 w-5" />
                  </button>
                </td>
                {showActions && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(payment._id)}
                        className="p-1 text-green-600 hover:text-green-800"
                        title="Approve"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleReject(payment._id)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Reject"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const TabHeader = ({
    title,
    count,
    type,
    color,
  }: {
    title: string;
    count: number;
    type: 'pending' | 'approved' | 'rejected';
    color: string;
  }) => (
    <button
      onClick={() => setExpandedSection(type)}
      className={clsx(
        'w-full flex items-center justify-between px-6 py-3 rounded-lg font-semibold transition-colors',
        expandedSection === type ? `${color} shadow-sm` : 'bg-white hover:bg-gray-50'
      )}
    >
      <div className="flex items-center">
        {expandedSection === type ? <ChevronUp className="h-5 w-5 mr-2" /> : <ChevronDown className="h-5 w-5 mr-2" />}
        <span>{title}</span>
      </div>
      <span className={clsx(
        'px-2 py-1 rounded text-sm',
        expandedSection === type ? 'bg-white bg-opacity-20' : 'bg-gray-100'
      )}>
        {count}
      </span>
    </button>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="p-4 bg-white shadow-sm flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pagos</h1>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver
        </button>
      </div>
      
      <div className="flex-1 p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <TabHeader
            title="Pagos pendientes"
            count={pendingPayments.length}
            type="pending"
            color="bg-blue-500 text-white"
          />
          <TabHeader
            title="Pagos aprobados"
            count={approvedPayments.length}
            type="approved"
            color="bg-green-500 text-white"
          />
          <TabHeader
            title="Pagos rechazados"
            count={rejectedPayments.length}
            type="rejected"
            color="bg-red-500 text-white"
          />
        </div>

        <div className="flex-1 min-h-0">
          {expandedSection === 'pending' && (
            <div className="h-full">
              <PaymentTable payments={pendingPayments} showActions={true} />
            </div>
          )}
          {expandedSection === 'approved' && (
            <div className="h-full">
              <PaymentTable payments={approvedPayments} />
            </div>
          )}
          {expandedSection === 'rejected' && (
            <div className="h-full">
              <PaymentTable payments={rejectedPayments} />
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl max-h-[90vh] overflow-auto bg-white rounded-lg">
            <img 
              src={selectedImage} 
              alt="Payment receipt" 
              className="w-full h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}