import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Payment, Ticket } from '../types';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { Image, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function DashboardOverview() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useWebSocket({
    onNewPayment: (payment) => {
      if (payment && payment.status === 'pending') {
        setPayments(prev => {
          const exists = prev.some(p => p._id === payment._id);
          if (exists) {
            return prev.map(p => p._id === payment._id ? payment : p);
          }
          return [payment, ...prev];
        });
      }
    },
    onNewTicket: (ticket) => {
      if (ticket && ticket.status === 'open') {
        setTickets(prev => {
          const exists = prev.some(t => t._id === ticket._id);
          if (exists) {
            return prev.map(t => t._id === ticket._id ? ticket : t);
          }
          return [ticket, ...prev];
        });
      }
    }
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [fetchedPayments, fetchedTickets] = await Promise.all([
        api.getPayments(),
        api.getTickets()
      ]);
      
      setPayments(fetchedPayments.filter(p => p.status === 'pending'));
      setTickets(fetchedTickets.filter(t => t.status === 'open'));
    } catch (error) {
      toast.error('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    try {
      await api.approvePayment(paymentId);
      setPayments(prev => prev.filter(p => p._id !== paymentId));
      toast.success('Pago aprobado exitosamente');
    } catch (error) {
      toast.error('Error al aprobar el pago');
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    try {
      await api.rejectPayment(paymentId);
      setPayments(prev => prev.filter(p => p._id !== paymentId));
      toast.success('Pago rechazado exitosamente');
    } catch (error) {
      toast.error('Error al rechazar el pago');
    }
  };

  const handleCompleteTicket = async (ticketId: string) => {
    try {
      await api.completeTicket(ticketId);
      setTickets(prev => prev.filter(t => t._id !== ticketId));
      toast.success('Ticket completado exitosamente');
    } catch (error) {
      toast.error('Error al completar el ticket');
    }
  };

  const handleCancelTicket = async (ticketId: string) => {
    try {
      await api.cancelTicket(ticketId);
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      toast.success('Ticket cancelado exitosamente');
    } catch (error) {
      toast.error('Error al cancelar el ticket');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra de navegación */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-gray-900">Panel de Control</h1>
            <button
              onClick={() => navigate('/agent')}
              className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              Ir a Mensajes
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sección de Pagos Pendientes */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={() => navigate('/payments')}
              className="w-full p-4 bg-blue-50 border-b border-blue-100 text-left hover:bg-blue-100 transition-colors"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-blue-900">Pagos Pendientes</h2>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {payments.length} pendientes
                </span>
              </div>
            </button>
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {payments.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No hay pagos pendientes
                </div>
              ) : (
                payments.map((payment) => (
                  <div key={payment._id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{payment.customerName}</h3>
                        <p className="text-sm text-gray-500">
                          {payment.date} a las {payment.time}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <button
                        onClick={() => setSelectedImage(payment.receiptImage)}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <Image className="h-4 w-4 mr-1" />
                        Ver Comprobante
                      </button>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRejectPayment(payment._id)}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={() => handleApprovePayment(payment._id)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded"
                        >
                          Aprobar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sección de Tickets Abiertos */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={() => navigate('/tickets')}
              className="w-full p-4 bg-purple-50 border-b border-purple-100 text-left hover:bg-purple-100 transition-colors"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-purple-900">Tickets Abiertos</h2>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                  {tickets.length} abiertos
                </span>
              </div>
            </button>
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {tickets.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No hay tickets abiertos
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div key={ticket.id} className="p-4 hover:bg-gray-50">
                    <div className="mb-2">
                      <h3 className="font-medium text-gray-900">{ticket.subject}</h3>
                      <p className="text-sm text-gray-500">
                        {ticket.date} a las {ticket.time}
                      </p>
                    </div>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {ticket.description}
                    </p>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleCancelTicket(ticket._id)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleCompleteTicket(ticket._id)}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded"
                      >
                        Completar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Imagen */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl max-h-[90vh] overflow-auto bg-white rounded-lg">
            <img 
              src={selectedImage} 
              alt="Comprobante de pago" 
              className="w-full h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}