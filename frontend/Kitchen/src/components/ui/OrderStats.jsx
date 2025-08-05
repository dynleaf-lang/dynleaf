import React from 'react';
import './OrderStats.css';

const OrderStats = ({ counts }) => {
  const stats = [
    {
      key: 'pending',
      label: 'Pending Orders',
      icon: '⏰',
      color: 'stat-pending',
      value: counts.pending || 0
    },
    {
      key: 'preparing',
      label: 'In Kitchen',
      icon: '🔥',
      color: 'stat-preparing',
      value: counts.preparing || 0
    },
    {
      key: 'ready',
      label: 'Ready to Serve',
      icon: '🔔',
      color: 'stat-ready',
      value: counts.ready || 0
    },
    {
      key: 'all',
      label: 'Total Active',
      icon: '📋',
      color: 'stat-total',
      value: counts.all || 0
    }
  ];

  const totalActive = stats.reduce((acc, stat) => acc + stat.value, 0);

  return (
    <div className="stats-container">
      <div className="stats-header">
        <h2 className="stats-title">
          <span className="stats-title-icon">📊</span>
          <span>Kitchen Overview</span>
        </h2>
      </div>
      
      <div className="stats-content">
        <div className="stats-grid">
          {stats.map(stat => (
            <div key={stat.key} className={`stat-card ${stat.color}`}>
              <div className="stat-header">
                <div className={`stat-icon-container ${stat.color}`}>
                  <span className="stat-icon">{stat.icon}</span>
                </div>
                <span className={`stat-number ${stat.color}`}>{stat.value}</span>
              </div>
              <h3 className="stat-title">{stat.label}</h3>
              {stat.key === 'pending' && <p className="stat-description">Awaiting confirmation</p>}
              {stat.key === 'preparing' && <p className="stat-description">Currently preparing</p>}
              {stat.key === 'ready' && <p className="stat-description">Ready for pickup</p>}
              {stat.key === 'all' && <p className="stat-description">All active orders</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderStats;
