import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * RoleProtectedRoute component to restrict access to users with specific roles
 * Redirects to dashboard if user doesn't have the required role
 */
const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useContext(AuthContext);
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Check if user has one of the allowed roles
  const hasRequiredRole = allowedRoles.includes(user.role);
  
  // Redirect to dashboard if user doesn't have the required role
  if (!hasRequiredRole) {
    return <Navigate to="/admin/index" state={{ from: location }} replace />;
  }

  // Render the protected content if authenticated and authorized
  return children;
};

export default RoleProtectedRoute;