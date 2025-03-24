import React, { useState, useEffect } from 'react';
import { Ticket } from '../types';
import { Check, X, ArrowLeft, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function TicketManagement() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [expandedSection, setExpandedSection] = useState<'open' | 'completed' | 'cancelled'>('open');
    const [isLoading, setIsLoading] = useState(true);
    const [showNewTicketModal, setShowNewTicketModal] = useState(false);
    const [newTicket, setNewTicket] = useState({
        subject: '',
        description: '',
    });
    const navigate = useNavigate();

    useEffect(() => {
        loadTickets();
    }, []);

    const loadTickets = async () => {
        try {
            setIsLoading(true);
            const fetchedTickets = await api.getTickets();
            setTickets(fetchedTickets);
        } catch (error) {
            toast.error('Error loading tickets');
        } finally {
            setIsLoading(false);
        }
    };

    const handleComplete = async (ticketId: string) => {
        try {
            const updatedTicket = await api.completeTicket(ticketId);
            setTickets(tickets.map(ticket =>
                ticket._id === ticketId ? updatedTicket : ticket
            ));
            toast.success('Ticket completado con éxito');
        } catch (error) {
            toast.error('Error completing ticket');
        }
    };

    const handleCancel = async (ticketId: string) => {
        try {
            const updatedTicket = await api.cancelTicket(ticketId);
            setTickets(tickets.map(ticket =>
                ticket._id === ticketId ? updatedTicket : ticket
            ));
            toast.success('Ticket cancelado con éxito');
        } catch (error) {
            toast.error('Error cancelling ticket');
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const ticket = await api.createTicket({
                ...newTicket,
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString(),
                status: 'open',
            });
            setTickets([ticket, ...tickets]);
            setShowNewTicketModal(false);
            setNewTicket({ subject: '', description: '' });
            toast.success('Ticket creado');
        } catch (error) {
            toast.error('Error creando ticket');
        }
    };

    useWebSocket({
        onNewTicket: (ticket) => {
            setTickets(prev => [ticket, ...prev]);
        }
    });

    const openTickets = tickets.filter(t => t.status === 'open') || [];
    const completedTickets = tickets.filter(t => t.status === 'completed') || [];
    const cancelledTickets = tickets.filter(t => t.status === 'cancelled') || [];

    const TicketTable = ({
        tickets,
        showActions = false,
    }: {
        tickets: Ticket[],
        showActions?: boolean,
    }) => (
        <div className="overflow-auto h-full bg-white rounded-lg shadow">
            {isLoading ? (
                <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : tickets.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500">
                    No hay tickets
                </div>
            ) : (
                <table className="min-w-full">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th> */}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asunto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario - Contraseña</th>
                            {showActions && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {tickets.map((ticket) => (
                            <tr key={ticket._id} className={clsx(
                                "hover:bg-gray-50",
                                ticket.status === 'completed' && "bg-green-50",
                                ticket.status === 'cancelled' && "bg-red-50"
                            )}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {new Date(ticket.date).toLocaleString("es-AR", {
                                        dateStyle: "short",
                                        timeStyle: "short",
                                    })}
                                </td>
                                {/* <td className="px-6 py-4 whitespace-nowrap">{ticket.time}</td> */}
                                <td className="px-6 py-4 whitespace-nowrap">{ticket.subject}</td>
                                <td className="px-6 py-4">{ticket.description}</td>
                                {showActions && (
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleComplete(ticket._id)}
                                                className="p-1 text-green-600 hover:text-green-800"
                                                title="Complete"
                                            >
                                                <Check className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleCancel(ticket._id)}
                                                className="p-1 text-red-600 hover:text-red-800"
                                                title="Cancel"
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
        type: 'open' | 'completed' | 'cancelled';
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
                <h1 className="text-2xl font-bold">Tickets</h1>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        Volver
                    </button>
                </div>
            </div>

            <div className="flex-1 p-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    <TabHeader
                        title="Tickets abiertos"
                        count={openTickets.length}
                        type="open"
                        color="bg-blue-500 text-white"
                    />
                    <TabHeader
                        title="Tickets completados"
                        count={completedTickets.length}
                        type="completed"
                        color="bg-green-500 text-white"
                    />
                    <TabHeader
                        title="Tickets cancelados"
                        count={cancelledTickets.length}
                        type="cancelled"
                        color="bg-red-500 text-white"
                    />
                </div>

                <div className="flex-1 min-h-0">
                    {expandedSection === 'open' && (
                        <div className="h-full">
                            <TicketTable tickets={openTickets} showActions={true} />
                        </div>
                    )}
                    {expandedSection === 'completed' && (
                        <div className="h-full">
                            <TicketTable tickets={completedTickets} />
                        </div>
                    )}
                    {expandedSection === 'cancelled' && (
                        <div className="h-full">
                            <TicketTable tickets={cancelledTickets} />
                        </div>
                    )}
                </div>
            </div>

            {/* New Ticket Modal */}
            {showNewTicketModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-4">Create New Ticket</h2>
                        <form onSubmit={handleCreateTicket}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Subject
                                    </label>
                                    <input
                                        type="text"
                                        value={newTicket.subject}
                                        onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={newTicket.description}
                                        onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowNewTicketModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Create Ticket
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}