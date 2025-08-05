import React from 'react';
import {
  Card,
  CardBody,
  Row,
  Col
} from 'reactstrap';

const StaffStats = ({ stats }) => {
  const statCards = [
    {
      title: 'Total Staff',
      value: stats.totalStaff,
      icon: 'fas fa-users',
      color: 'primary',
      bgGradient: 'bg-gradient-primary'
    },
    {
      title: 'Active Staff',
      value: stats.activeStaff,
      icon: 'fas fa-user-check',
      color: 'success',
      bgGradient: 'bg-gradient-success'
    },
    {
      title: 'Employees',
      value: stats.employees,
      icon: 'fas fa-user-tie',
      color: 'info',
      bgGradient: 'bg-gradient-info'
    },
    {
      title: 'Waiters',
      value: stats.waiters,
      icon: 'fas fa-concierge-bell',
      color: 'warning',
      bgGradient: 'bg-gradient-warning'
    },
    {
      title: 'Chefs',
      value: stats.chefs,
      icon: 'fas fa-utensils',
      color: 'danger',
      bgGradient: 'bg-gradient-danger'
    },
    {
      title: 'Inactive/Suspended',
      value: stats.inactiveStaff + stats.suspendedStaff,
      icon: 'fas fa-user-times',
      color: 'secondary',
      bgGradient: 'bg-gradient-secondary'
    }
  ];

  return (
    <Row className="mb-4">
      {statCards.map((stat, index) => (
        <Col key={index} xl="3" lg="3" md="6" className="mb-4">
          <Card className="card-stats shadow">
            <CardBody>
              <Row>
                <Col>
                  <h5 className="card-title text-uppercase text-muted mb-0">
                    {stat.title}
                  </h5>
                  <span className="h2 font-weight-bold mb-0">
                    {stat.value}
                  </span>
                </Col>
                <Col className="col-auto">
                  <div className={`icon icon-shape ${stat.bgGradient} text-white rounded-circle shadow`}>
                    <i className={stat.icon}></i>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default StaffStats;
