import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './utils/notify';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { Spinner } from 'reactstrap';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './components/NotFound';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { SocketProvider } from './context/SocketContext';
import { POSProvider } from './context/POSContext';
import { ShiftProvider } from './context/ShiftContext';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';
// Lazy-load heavy routes and session manager
const Login = React.lazy(() => import('./components/auth/Login'));
const POSDashboard = React.lazy(() => import('./components/dashboard/POSDashboard'));
const SessionManager = React.lazy(() => import('./components/auth/SessionManager'));

// Scope heavy providers to authenticated area only
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

function App() {
  const basename = import.meta.env.VITE_ROUTER_BASENAME || '/';
  return (
    <Router basename={basename}>
      <AuthProvider>
        <CurrencyProvider>
          <div className="App">
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
            <Toaster />
          </div>
        </CurrencyProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
