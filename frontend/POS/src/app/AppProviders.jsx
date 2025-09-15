import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { CurrencyProvider } from '../context/CurrencyContext';

// AppProviders keeps only global, lightweight providers at the app root.
// Heavy, session-scoped providers remain under ProtectedArea inside routes.
export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </AuthProvider>
  );
}
