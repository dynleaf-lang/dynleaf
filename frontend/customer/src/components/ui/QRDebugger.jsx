import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import ServerStatusCheck from '../Utils/ServerStatusCheck';

const QRDebugger = () => {
  const { 
    restaurant, branch, table, 
    loading, error, initialized, 
    retryCount, isRetrying 
  } = useRestaurant();

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const restaurantId = urlParams.get('restaurantId');
  const branchId = urlParams.get('branchId');
  const tableId = urlParams.get('tableId');

  // Get API URL configuration
  const baseUrl = window.location.origin;
  const apiEndpoint = `${window.location.protocol}//${window.location.hostname}:5001`;

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f8f9fa', 
      border: '1px solid #ddd', 
      borderRadius: '8px',
      margin: '20px auto',
      maxWidth: '600px',
      fontFamily: 'monospace',
      fontSize: '14px'
    }}>
      <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px', marginTop: 0 }}>QR Code Debug Info</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>URL Parameters:</strong>
        <pre style={{ 
          backgroundColor: '#f1f1f1', 
          padding: '10px', 
          borderRadius: '4px', 
          overflow: 'auto' 
        }}>
          restaurantId: {restaurantId || 'not provided'}<br />
          branchId: {branchId || 'not provided'}<br />
          tableId: {tableId || 'not provided'}
        </pre>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Context State:</strong>
        <pre style={{ 
          backgroundColor: '#f1f1f1', 
          padding: '10px', 
          borderRadius: '4px', 
          overflow: 'auto' 
        }}>
          initialized: {String(initialized)}<br />
          loading: {String(loading)}<br />
          error: {error || 'none'}<br />
          restaurant: {restaurant ? restaurant.name : 'null'}<br />
          branch: {branch ? branch.name : 'null'}<br />
          table: {table ? table.tableNumber : 'null'}<br />
          retryCount: {retryCount}<br />
          isRetrying: {String(isRetrying)}
        </pre>
      </div>
        <div style={{ marginBottom: '10px' }}>
        <strong>Network Configuration:</strong>
        <pre style={{ 
          backgroundColor: '#f1f1f1', 
          padding: '10px', 
          borderRadius: '4px', 
          overflow: 'auto' 
        }}>
          baseUrl: {baseUrl}<br />
          apiEndpoint: {apiEndpoint}<br />
          online: {String(navigator.onLine)}<br />
          API URL: {import.meta.env.VITE_API_BASE_URL || 'Not set in .env'}
        </pre>
      </div>

      <ServerStatusCheck />
        <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => {
            console.log('URL Parameters:', { restaurantId, branchId, tableId });
            console.log('Context State:', { 
              initialized, loading, error, 
              restaurant: restaurant ? { id: restaurant._id, name: restaurant.name } : null,
              branch: branch ? { id: branch._id, name: branch.name } : null,
              table: table ? { id: table._id, number: table.tableNumber } : null
            });
            console.log('Network:', { online: navigator.onLine });
            alert('Debug info logged to console');
          }}
          style={{
            backgroundColor: '#0d6efd',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Log to Console
        </button>

        <button 
          onClick={() => {
            console.log('Manual retry initiated with params:', { restaurantId, branchId, tableId });
            // Import the useRestaurant hook to get the retryLastRequest function
            // This is a direct call to window.location to reload with current params
            window.location.reload();
          }}
          style={{
            backgroundColor: '#198754',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>
    </div>
  );
};

export default QRDebugger;