// Temporary debug component - Add this to your app for testing
import React from 'react';

const EnvironmentDebug = () => {
  const envVars = {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE,
    PROD: import.meta.env.PROD,
    DEV: import.meta.env.DEV,
    currentOrigin: window.location.origin,
    allViteEnv: Object.keys(import.meta.env)
      .filter(key => key.startsWith('VITE_'))
      .reduce((acc, key) => {
        acc[key] = import.meta.env[key];
        return acc;
      }, {})
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      right: 0, 
      background: 'white', 
      border: '1px solid #ccc', 
      padding: '10px', 
      maxWidth: '400px',
      zIndex: 9999,
      fontSize: '12px'
    }}>
      <h4>Environment Debug</h4>
      <pre>{JSON.stringify(envVars, null, 2)}</pre>
    </div>
  );
};

export default EnvironmentDebug;