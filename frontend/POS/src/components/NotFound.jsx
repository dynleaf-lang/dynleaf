import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col } from 'reactstrap';

const NotFound = () => {
  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} className="text-center">
          <h1 className="display-5 fw-semibold">404</h1>
          <p className="lead text-muted mb-4">The page you’re looking for doesn’t exist.</p>
          <div className="d-flex gap-2 justify-content-center">
            <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
            <Link to="/login" className="btn btn-outline-secondary">Login</Link>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default NotFound;
