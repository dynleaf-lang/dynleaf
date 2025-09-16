import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spinner } from 'reactstrap';
import ErrorBoundary from '../components/ErrorBoundary';
import NotFound from '../components/NotFound';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { SocketProvider } from '../context/SocketContext';
import { POSProvider } from '../context/POSContext';
import { ShiftProvider } from '../context/ShiftContext';
import { CartProvider } from '../context/CartContext';
import { OrderProvider } from '../context/OrderContext';

const Login = React.lazy(() => import('../components/auth/Login'));
const POSDashboard = React.lazy(() => import('../components/dashboard/POSDashboard'));
const SessionManager = React.lazy(() => import('../components/auth/SessionManager'));

function ProtectedArea({ children }) {
  return (
    <ProtectedRoute>
      <SocketProvider>
        <POSProvider>
          <ShiftProvider>
            <CartProvider>
              <OrderProvider>
                <SessionManager />
                {children}
              </OrderProvider>
            </CartProvider>
          </ShiftProvider>
        </POSProvider>
      </SocketProvider>
    </ProtectedRoute>
  );
}

export default function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
          <Spinner color="primary" />
        </div>
      }
    >
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedArea>
                <POSDashboard />
              </ProtectedArea>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </Suspense>
  );
}
