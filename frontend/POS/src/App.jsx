import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from './utils/notify';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Initialize axios defaults and interceptors in a side-effect import
import './lib/axios';
import AppProviders from './app/AppProviders';
import AppRoutes from './routes/AppRoutes';

function App() {
  const basename = import.meta.env.VITE_ROUTER_BASENAME || '/';
  return (
    <Router basename={basename}>
      <AppProviders>
        <div className="App">
          <AppRoutes />
          <Toaster />
        </div>
      </AppProviders>
    </Router>
  );
}

export default App;
