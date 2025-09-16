import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner, Container, Row, Col } from 'reactstrap';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Container fluid className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <Row>
          <Col className="text-center">
            <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
            <div className="mt-3">
              <h5>Loading...</h5>
              <p className="text-muted">Checking authentication status</p>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Check if user has appropriate role for POS access
  const allowedRoles = ['POS_Operator', 'Staff', 'admin', 'Branch_Manager'];
  if (!allowedRoles.includes(user?.role)) {
    return (
      <Container fluid className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <Row>
          <Col className="text-center">
            <div className="alert alert-danger">
              <h4>Access Denied</h4>
              <p>You do not have permission to access the POS system.</p>
              <p>Required roles: POS Operator, Staff, Admin, or Branch Manager</p>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  return children;
};

export default ProtectedRoute;
