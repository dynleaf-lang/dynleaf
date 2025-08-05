import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './OrderStatusScreen.css';

const OrderStatusScreen = () => {
  const [orders, setOrders] = useState([]);
  const [socket, setSocket] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Initialize socket connection and fetch orders
  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
    const newSocket = io(apiBaseUrl, {
      auth: {
        role: 'customer_status_screen'
      }
    });

    newSocket.on('connect', () => {
      console.log('[STATUS SCREEN] Connected to server');
      newSocket.emit('joinRoom', 'customer_global');
      fetchOrders();
    });

    newSocket.on('disconnect', () => {
      console.log('[STATUS SCREEN] Disconnected from server');
    });

    // Listen for real-time order updates
    newSocket.on('newOrder', (orderData) => {
      if (['preparing', 'ready'].includes(orderData.status)) {
        setOrders(prevOrders => {
          const exists = prevOrders.some(order => order._id === orderData._id);
          if (!exists) {
            return [orderData, ...prevOrders];
          }
          return prevOrders;
        });
      }
    });

    newSocket.on('statusUpdate', (statusData) => {
      const { order, newStatus } = statusData;
      
      if (['preparing', 'ready'].includes(newStatus)) {
        // Add or update order
        setOrders(prevOrders => {
          const existingIndex = prevOrders.findIndex(o => o._id === order._id);
          if (existingIndex >= 0) {
            const updated = [...prevOrders];
            updated[existingIndex] = { ...updated[existingIndex], status: newStatus };
            return updated;
          } else {
            return [{ ...order, status: newStatus }, ...prevOrders];
          }
        });
      } else {
        // Remove order if it's no longer preparing or ready
        setOrders(prevOrders => prevOrders.filter(o => o._id !== order._id));
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
      const response = await fetch(`${apiBaseUrl}/api/public/orders?status=preparing,ready&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };
 

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏰';
      case 'confirmed': return '✅';
      case 'preparing': return '🔥';
      case 'ready': return '🔔';
      case 'delivered': return '🚚';
      case 'cancelled': return '❌';
      default: return '⏰';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'preparing': return 'status-preparing';
      case 'ready': return 'status-ready';
      case 'delivered': return 'status-delivered';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  };

  const preparingOrders = orders.filter(order => order.status === 'preparing');
  const readyOrders = orders.filter(order => order.status === 'ready');

  if (loading) {
    return (
      <div className="status-screen loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h2>Loading Order Status...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="status-screen">
      {/* Header */}
      <header className="status-header">
        <div className="header-content">
          <div className="logo-section">
            <span className="logo-icon">🍽️</span>
            <div>
              <h1>Order Status</h1>
              <p>Live Kitchen Updates</p>
            </div>
          </div>
          <div className="current-time">
            <span className="time-icon">⏰</span>
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="status-main">
        <div className="status-container">
          {/* Ready Orders Section */}
          <section className="ready-section">
            <div className="section-header">
              <h2>
                <span className="section-icon">🔔</span>
                Ready for Pickup
              </h2>
              <div className="order-count">
                {readyOrders.length} order{readyOrders.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            <div className="orders-display">
              {readyOrders.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📋</span>
                  <p>No orders ready yet</p>
                </div>
              ) : (
                <div className="orders-grid">
                  {readyOrders.map(order => (
                    <div key={order._id} className={`status-order-card ${getStatusColor(order.status)}`}>
                      <div className="order-header">
                        <div className="order-id">#{order.orderId}</div>
                        <div className="order-time">{formatTime(order.createdAt)}</div>
                      </div>
                      <div className="order-customer">
                        <span className="customer-icon">👤</span>
                        {order.customerName || 'Guest'}
                      </div>
                      <div className="order-status-badge ready">
                        <span className="status-icon">{getStatusIcon(order.status)}</span>
                        Ready
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div> 
          </section>

          {/* Preparing Orders Section */}
          <section className="preparing-section">
            <div className="section-header">
              <h2>
                <span className="section-icon">🔥</span>
                Currently Preparing
              </h2>
              <div className="order-count">
                {preparingOrders.length} order{preparingOrders.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            <div className="orders-display">
              {preparingOrders.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">🍽️</span>
                  <p>No orders being prepared</p>
                </div>
              ) : (
                <div className="orders-grid">
                  {preparingOrders.map(order => (
                    <div key={order._id} className={`status-order-card ${getStatusColor(order.status)}`}>
                      <div className="order-header">
                        <div className="order-id">#{order.orderId}</div>
                        <div className="order-time">{formatTime(order.createdAt)}</div>
                      </div>
                      <div className="order-customer">
                        <span className="customer-icon">👤</span>
                        {order.customerName || 'Guest'}
                      </div>
                      <div className="order-status-badge preparing">
                        <span className="status-icon">{getStatusIcon(order.status)}</span>
                        Preparing
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="status-footer">
        <div className="footer-content">
          <div className="status-legend">
            <div className="legend-item">
              <div className="legend-color preparing"></div>
              <span>Being Prepared</span>
            </div>
            <div className="legend-item">
              <div className="legend-color ready"></div>
              <span>Ready for Pickup</span>
            </div>
          </div>
          <div className="auto-refresh">
            <span className="refresh-icon">🔄</span>
            Auto-refreshing
          </div>
        </div>
      </footer>
    </div>
  );
};

export default OrderStatusScreen;
