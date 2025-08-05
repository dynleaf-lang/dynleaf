import React from 'react';
import './StatusFilter.css';

const StatusFilter = ({ currentFilter, onFilterChange, counts }) => {
  const filters = [
    { 
      key: 'all', 
      label: 'All Orders', 
      icon: '📋',
      color: 'filter-all'
    },
    { 
      key: 'pending', 
      label: 'Pending', 
      icon: '⏰',
      color: 'filter-pending'
    },
    { 
      key: 'confirmed', 
      label: 'Confirmed', 
      icon: '✅',
      color: 'filter-confirmed'
    },
    { 
      key: 'preparing', 
      label: 'Preparing', 
      icon: '🔥',
      color: 'filter-preparing'
    },
    { 
      key: 'ready', 
      label: 'Ready', 
      icon: '🔔',
      color: 'filter-ready'
    }
  ];

  return (
    <div className="filter-container">
      <div className="filter-header">
        <h2 className="filter-title">
          <span className="filter-title-icon">🔍</span>
          <span>Filter Orders</span>
        </h2>
      </div>
      
      <div className="filter-content">
        <div className="filter-grid">
          {filters.map(filter => {
            const isActive = currentFilter === filter.key;
            
            return (
              <button
                key={filter.key}
                onClick={() => onFilterChange(filter.key)}
                className={`filter-button ${
                  isActive ? `filter-active ${filter.key}` : 'filter-inactive'
                }`}
              >
                <div className="filter-button-content">
                  <span className="filter-icon">{filter.icon}</span>
                  <span className="filter-label">
                    {filter.label}
                  </span>
                  <span className="filter-count">
                    {counts[filter.key] || 0}
                  </span>
                </div>
                
                {isActive && (
                  <div className="filter-active-indicator" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatusFilter;
