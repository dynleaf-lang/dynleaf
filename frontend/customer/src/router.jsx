import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import APITestView from './components/debug/APITestView';

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
    path: '/debug',
    element: <APITestView />,
  }
]);

export default router;
