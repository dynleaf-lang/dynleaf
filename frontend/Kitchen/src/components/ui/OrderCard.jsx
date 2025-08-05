import React, { useState } from 'react';
import { useOrders } from '../../context/OrderContext';
import './OrderCard.css';

const OrderCard = ({ order }) => {
  const { updateOrderStatus } = useOrders();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showItems, setShowItems] = useState(false);

  const handleStatusUpdate = async (newStatus) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    const result = await updateOrderStatus(order._id, newStatus);
    
    if (!result.success) {
      // Error handling is done in the context
      console.error('Failed to update order status:', result.error);
    }
    
    setIsUpdating(false);
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

  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'pending': return 'confirmed';
      case 'confirmed': return 'preparing';
      case 'preparing': return 'ready';
      case 'ready': return 'delivered';
      default: return null;
    }
  };

  const getStatusButtonText = (currentStatus) => {
    switch (currentStatus) {
      case 'pending': return 'Confirm Order';
      case 'confirmed': return 'Start Preparing';
      case 'preparing': return 'Mark Ready';
      case 'ready': return 'Mark Delivered';
      default: return null;
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Check if order is approaching archive time (ready for > 45 minutes)
  const getArchiveStatus = () => {
    if (order.status !== 'ready') return null;
    
    const currentTime = new Date();
    const orderUpdatedTime = new Date(order.updatedAt);
    const timeDifferenceInMinutes = (currentTime - orderUpdatedTime) / (1000 * 60);
    
    if (timeDifferenceInMinutes >= 60) {
      return { type: 'expired', message: 'Will be archived soon' };
    } else if (timeDifferenceInMinutes >= 45) {
      return { type: 'warning', message: `${Math.round(60 - timeDifferenceInMinutes)} min until archive` };
    }
    
    return null;
  };

  const archiveStatus = getArchiveStatus();

  const nextStatus = getNextStatus(order.status);
  const canUpdate = nextStatus && ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status);

  const statusColors = {
    'status-pending': 'border-l-amber-500 bg-amber-50/50',
    'status-confirmed': 'border-l-blue-500 bg-blue-50/50',
    'status-preparing': 'border-l-red-500 bg-red-50/50',
    'status-ready': 'border-l-green-500 bg-green-50/50',
    'status-delivered': 'border-l-gray-500 bg-gray-50/50',
    'status-cancelled': 'border-l-red-600 bg-red-100/50'
  };

  const statusBadgeColors = {
    'status-pending': 'bg-amber-100 text-amber-800 border-amber-200',
    'status-confirmed': 'bg-blue-100 text-blue-800 border-blue-200',
    'status-preparing': 'bg-red-100 text-red-800 border-red-200',
    'status-ready': 'bg-green-100 text-green-800 border-green-200',
    'status-delivered': 'bg-gray-100 text-gray-800 border-gray-200',
    'status-cancelled': 'bg-red-200 text-red-900 border-red-300'
  };

  return (
    <div className={`order-card ${getStatusColor(order.status)}`}>
      {/* Order Header */}
      <div className="order-header">
        <div className="order-header-top">
         
         <div className='order-header-sub-top'>
         <h3 className="order-id">#{order.orderId}</h3>

<div className={`order-status-badge ${getStatusColor(order.status)}`}>
  <span className="status-icon">{getStatusIcon(order.status)}</span>
  <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
</div>
         </div>

          <div className="order-time">
            <span className="time-icon">⏰</span>
            <span>{formatTime(order.createdAt)}</span>
          </div>
        </div>
        
        {/* Archive Warning */}
        {archiveStatus && (
          <div className={`archive-warning ${archiveStatus.type}`}>
            <span className="warning-icon">
              {archiveStatus.type === 'expired' ? '⚠️' : '⏳'}
            </span>
            <span className="warning-text">{archiveStatus.message}</span>
          </div>
        )} 
      </div>

      {/* Customer Info */}
      {/* <div className="customer-info">
        <div className="customer-details">
          <span className="status-icon">👤</span>
          <span>{order.customerName || 'Guest'}</span>
        </div>
        <div className="order-type">
          <span className="status-icon">{order.orderType === 'dine-in' ? '🍽️' : order.orderType === 'delivery' ? '🚚' : '🛍️'}</span>
          {order.orderType?.charAt(0).toUpperCase() + order.orderType?.slice(1) || 'Takeaway'}
        </div>
      </div> */}

      {/* Order Summary */}
      <div className="order-summary">
        <div className="items-summary">
          <button 
            className="items-toggle"
            onClick={() => setShowItems(!showItems)}
          >
            <span className="status-icon">{showItems ? '▲' : '▼'}</span>
            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
          </button>
           {/* Order Actions */}
      <div className="order-actions">
        {canUpdate && (
          <button
            className={`status-update-btn ${isUpdating ? 'updating' : ''}`}
            onClick={() => handleStatusUpdate(nextStatus)}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <div className="spinner"></div>
                Updating...
              </>
            ) : (
              <>
                <span className="status-icon">{getStatusIcon(nextStatus)}</span>
                {getStatusButtonText(order.status)}
              </>
            )}
          </button>
        )}

        {order.status === 'ready' && (
          <div className="ready-indicator">
            <span className="status-icon">🔔</span>
            Order Ready for Pickup/Delivery
          </div>
        )}

        {['delivered', 'cancelled'].includes(order.status) && (
          <div className="completed-indicator">
            <span className="status-icon">{order.status === 'delivered' ? '✓' : '✖'}</span>
            Order {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </div>
        )}
      </div>
        </div>

        {/* Items List */}
        {showItems && (
          <div className="items-list">
            {order.items?.map((item, index) => (
              <div key={index} className="order-item">
                <div className="item-details">
                  <span className="item-name">{item.name}</span>
                  <span className="item-quantity">x{item.quantity}</span>
                </div>
                {item.notes && (
                  <div className="item-notes">
                    <span className="status-icon">📝</span>
                    {item.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

     

      {/* Special Instructions */}
      {order.notes && (
        <div className="order-notes">
          <span className="status-icon">💬</span>
          <span>Note: {order.notes}</span>
        </div>
      )}
    </div>
  );
};

export default OrderCard;
