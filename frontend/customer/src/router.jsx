import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import CurrencyTestWrapper from './components/Utils/CurrencyTestWrapper';
import LinkExpiredPage from './components/pages/LinkExpiredPage';

/**
 * Application router configuration
 * Defines all available routes in the application
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/menu',
    element: <App />, // Use the same App component for the menu path
  },
  {
    path: '/link-expired',
    element: <LinkExpiredPage />,
  },
  {
    path: '/expired',
    element: <LinkExpiredPage />, // Alternative shorter URL
  },
  {
    path: '/currency-test',
    element: <CurrencyTestWrapper />,
  }
]);

export default router;
