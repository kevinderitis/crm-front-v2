import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Search } from 'lucide-react';
import { api } from '../services/api';
import { SalesReport, PrizeReport } from '../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function Reports() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [activeTab, setActiveTab] = useState<'sales' | 'prizes'>('sales');
  const [salesData, setSalesData] = useState<SalesReport[]>([]);
  const [prizesData, setPrizesData] = useState<PrizeReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      const [sales, prizes] = await Promise.all([
        api.getSalesReport(dateRange.start, dateRange.end),
        api.getPrizesReport(dateRange.start, dateRange.end)
      ]);
      setSalesData(sales);
      setPrizesData(prizes);
    } catch (error) {
      toast.error('Error cargando los reportes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = () => {
    loadReportData();
  };

  // Calculate totals for metrics
  const totalSales = salesData.reduce((acc, curr) => acc + curr.netSales, 0);
  const totalPrizes = prizesData.reduce((acc, curr) => acc + curr.amount, 0);
  const totalBonuses = salesData.reduce((acc, curr) => acc + curr.bonuses, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow flex-none">
        <div className="max-w-[95%] mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Reportes</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
              <button
                onClick={handleFilter}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Search className="h-4 w-4 mr-2" />
                Filtrar
              </button>
              <button
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-[95%] mx-auto h-full flex flex-col">
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Ventas Totales</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                ${totalSales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Premios Pagados</h3>
              <p className="mt-2 text-3xl font-semibold text-red-600">
                ${totalPrizes.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Bonos Otorgados</h3>
              <p className="mt-2 text-3xl font-semibold text-green-600">
                ${totalBonuses.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('sales')}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium",
                activeTab === 'sales'
                  ? "bg-blue-100 text-blue-700"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              Planilla de Ventas
            </button>
            <button
              onClick={() => setActiveTab('prizes')}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium",
                activeTab === 'prizes'
                  ? "bg-blue-100 text-blue-700"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              Planilla de Premios
            </button>
          </div>

          {/* Table Container */}
          <div className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="min-w-full inline-block align-middle">
                {activeTab === 'sales' ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Usuarios Nuevos</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Tickets</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Venta Neta</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Bonos</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Premios</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {salesData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">{row.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{row.newUsers}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{row.ticketCount}</td>
                          <td className="px-6 py-4 whitespace-nowrap">${row.netSales.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">${row.bonuses.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">${row.prizes.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">${row.totalSales.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Usuario</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Importe</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Cobra</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Bono</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Operador</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {prizesData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">{row.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{row.user}</td>
                          <td className="px-6 py-4 whitespace-nowrap">${row.amount.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">${row.collection.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">${row.bonus.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{row.status}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{row.operator}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}