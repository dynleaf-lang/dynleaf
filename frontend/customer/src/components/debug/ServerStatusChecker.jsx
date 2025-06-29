// Server status checker utility
import React, { useState, useEffect } from 'react';

const ServerStatusChecker = ({ baseUrl = 'http://localhost:5001', autoCheck = true }) => {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(null);
  const [endpoints, setEndpoints] = useState([
    { url: '/', name: 'Health Check', status: null },
    { url: '/api/restaurants', name: 'Restaurants API', status: null },
    { url: '/api/branches', name: 'Branches API', status: null },
    { url: '/api/tables', name: 'Tables API', status: null },
    { url: '/api/menus', name: 'Menus API', status: null },
  ]);
  const checkEndpoint = async (url, name) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${baseUrl}${url}`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = await response.text();
      }
      
      return {
        url,
        name,
        online: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: data
      };
    } catch (error) {
      return {
        url,
        name,
        online: false,
        error: error.message
      };
    }
  };

  const checkServer = async () => {
    setChecking(true);
    setStatus(null);
    
    try {
      // Check main endpoint first
      const mainResponse = await checkEndpoint('/', 'Health Check');
      setStatus(mainResponse);
      
      // Then check all endpoints in parallel
      const results = await Promise.all(
        endpoints.map(endpoint => checkEndpoint(endpoint.url, endpoint.name))
      );
      
      setEndpoints(results);
      
    } catch (error) {
      setStatus({
        online: false,
        error: error.message
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#f8f9fa',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '16px'
    }}>
      <h3 style={{ marginTop: 0 }}>Server Status Checker</h3>
      
      <div style={{ marginBottom: '12px' }}>
        <input 
          type="text" 
          value={baseUrl} 
          onChange={(e) => baseUrl = e.target.value}
          style={{
            padding: '6px 8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            marginRight: '8px',
            width: '300px'
          }}
        />
        
        <button
          onClick={checkServer}
          disabled={checking}
          style={{
            backgroundColor: '#0d6efd',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: checking ? 'not-allowed' : 'pointer'
          }}
        >
          {checking ? 'Checking...' : 'Check Server'}
        </button>
      </div>
      
      {status && (
        <div>
          <div style={{ 
            backgroundColor: status.online ? '#d4edda' : '#f8d7da',
            color: status.online ? '#155724' : '#721c24',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '8px'
          }}>
            Server is {status.online ? 'ONLINE' : 'OFFLINE'}
          </div>
          
          <pre style={{ 
            backgroundColor: '#f1f1f1',
            padding: '10px',
            borderRadius: '4px',
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            {JSON.stringify(status, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ServerStatusChecker;
