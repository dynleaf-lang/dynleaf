import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../context/OrderContext';
import { useSocket } from '../../context/SocketContext';
import OrderCard from '../ui/OrderCard';
import StatusFilter from '../ui/StatusFilter';
import OrderStats from '../ui/OrderStats';
import './KitchenDashboard.css';

const KitchenDashboard = () => {
  const { user, logout } = useAuth();
  const { orders, loading, error, filter, setFilter, getOrderCounts, fetchOrders } = useOrders();
  const { connected } = useSocket();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="kitchen-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-section">
              <span className="logo-icon">🍽️</span>
              <h1 className="dashboard-title">Kitchen Dashboard</h1>
              <p className="text-gray-600 text-sm font-medium">Order Management System</p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <span className={`text-lg ${refreshing ? 'animate-spin' : ''}`}>🔄</span>
              </button>
            </div>
          </div>
          <div className="header-right">
            {/* Connection Status */}
            <div className="connection-status">
              <div className={`status-indicator ${
                connected ? 'connected' : 'disconnected'
              }`}></div>
              <span className="status-text">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {/* User Info */}
            <div className="user-info">
              <span className="user-icon">👨‍🍳</span>
              <span>Chef {user?.name || 'User'}</span>
            </div>
            
            {/* Logout Button */}
            <button
              onClick={logout}
              className="logout-btn"
            >
              <span className="btn-icon">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-container">
          {/* Order Stats */}
          <OrderStats counts={getOrderCounts()} />
          
          {/* Status Filter */}
          <StatusFilter 
            currentFilter={filter}
            onFilterChange={setFilter}
            counts={getOrderCounts()}
          />
          
          {/* Orders Section */}
          <div className="orders-section">
            <div className="orders-header">
              <div className="orders-title-section">
                <h2 className="orders-title">
                  <span className="title-icon">📋</span>
                  <span>Orders {filter !== 'all' && `- ${filter.charAt(0).toUpperCase() + filter.slice(1)}`}</span>
                </h2>
                <div className="orders-count">
                  {orders.length} orders
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="error-state">
                <span className="error-icon">⚠️</span>
                <div className="error-content">
                  <p className="error-title">Failed to load orders. Please try again.</p>
                </div>
                <button 
                  onClick={handleRefresh} 
                  className="error-btn"
                >
                  <span>🔄</span>
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="loading-state">
                <div className="loading-spinner">🔄</div>
                <p className="loading-text">Loading orders...</p>
              </div>
            )}

            {/* Orders Grid */}
            {!loading && (
              <div>
                {orders.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h3>No orders found</h3>
                    <p>
                      {filter === 'all' 
                        ? 'No orders available at the moment.' 
                        : `No ${filter} orders found.`
                      }
                    </p>
                    <button 
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="refresh-btn"
                    >
                      <span className={refreshing ? 'loading-spinner' : ''}>🔄</span>
                      <span>Refresh Orders</span>
                    </button>
                  </div>
                ) : (
                  <div className="orders-sections">
                    {/* Dine-In Section */}
                    <div>
                      <div className="section-header">
                        <div className="section-title">
                          <span className="section-icon">🍽️</span>
                          <h3>Dine-In Orders</h3>
                          <span className="section-count">
                            {orders.filter(order => order.orderType === 'dine-in').length}
                          </span>
                        </div>
                      </div>
                      <div className="orders-grid">
                        {orders
                          .filter(order => order.orderType === 'dine-in')
                          .map(order => (
                            <OrderCard key={order._id} order={order} />
                          ))
                        }
                        {orders.filter(order => order.orderType === 'dine-in').length === 0 && (
                          <div className="section-empty">
                            <span className="empty-icon">🍽️</span>
                            <p>No dine-in orders</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Takeout Section */}
                    <div>
                      <div className="section-header">
                        <div className="section-title">
                          <span className="section-icon">🥡</span>
                          <h3>Takeout Orders</h3>
                          <span className="section-count">
                            {orders.filter(order => order.orderType !== 'dine-in').length}
                          </span>
                        </div>
                      </div>
                      <div className="orders-grid">
                        {orders
                          .filter(order => order.orderType !== 'dine-in')
                          .map(order => (
                            <OrderCard key={order._id} order={order} />
                          ))
                        }
                        {orders.filter(order => order.orderType !== 'dine-in').length === 0 && (
                          <div className="section-empty">
                            <span className="empty-icon">🥡</span>
                            <p>No takeout orders</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default KitchenDashboard;
