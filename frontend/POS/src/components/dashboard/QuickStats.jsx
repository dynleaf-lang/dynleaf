import React from 'react';
import { Card, CardBody } from 'reactstrap';
import { FaReceipt, FaClock, FaCheckCircle, FaDollarSign } from 'react-icons/fa';

const QuickStats = ({ stats }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const statItems = [
    {
      label: 'Today\'s Orders',
      value: stats?.total || 0,
      icon: FaReceipt,
      color: 'info'
    },
    {
      label: 'Pending',
      value: stats?.pending || 0,
      icon: FaClock,
      color: 'warning'
    },
    {
      label: 'Completed',
      value: stats?.delivered || 0,
      icon: FaCheckCircle,
      color: 'success'
    },
    {
      label: 'Revenue',
      value: formatCurrency(stats?.revenue || 0),
      icon: FaDollarSign,
      color: 'success'
    }
  ];

  return (
    <Card className="quick-stats-card">
      <CardBody className="p-3">
        <h6 className="text-muted mb-3 text-center">Today's Summary</h6>
        {statItems.map((item, index) => (
          <div key={index} className="stat-item">
            <div className="d-flex align-items-center">
              <item.icon className={`text-${item.color} me-2`} size={14} />
              <span className="stat-label">{item.label}</span>
            </div>
            <span className={`stat-value ${item.color}`}>
              {item.value}
            </span>
          </div>
        ))}
      </CardBody>
    </Card>
  );
};

export default QuickStats;
