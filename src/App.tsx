import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AgentDashboard from './pages/AgentDashboard';
import PaymentManagement from './pages/PaymentManagement';
import TicketManagement from './pages/TicketManagement';
import DashboardOverview from './pages/DashboardOverview';
import Reports from './pages/Reports';
import WebSocketStatus from './components/WebSocketStatus';
import { useAuthStore } from './store/authStore';

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, initialized } = useAuthStore((state) => ({
    user: state.user,
    initialized: state.initialized
  }));

  if (!initialized) {
    return null;
  }

  if (!user) return <Navigate to="/login" />;
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/overview" />;

  return <>{children}</>;
}

function App() {
  const { initAuth, user } = useAuthStore((state) => ({
    initAuth: state.initAuth,
    user: state.user
  }));

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent/*"
            element={
              <ProtectedRoute>
                <AgentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <PaymentManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets"
            element={
              <ProtectedRoute>
                <TicketManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/overview"
            element={
              <ProtectedRoute>
                <DashboardOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              user ? (
                <Navigate to={user.role === 'admin' ? '/admin' : '/overview'} replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </Router>
      <Toaster position="top-center" />
      <WebSocketStatus />
    </>
  );
}

export default App;