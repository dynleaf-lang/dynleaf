import React, { useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

/**
 * ProtectedRoute component to restrict access to authenticated users only
 * Redirects to login page if user is not authenticated
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user, token, isSuperAdmin } = useContext(AuthContext);
  const location = useLocation();
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Extra verification step to ensure localStorage is properly checked
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        // Check localStorage first
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (!storedToken || !storedUser) {
          setIsVerified(false);
          setIsChecking(false);
          return;
        }
        
        // Parse user data
        let userData;
        try {
          userData = JSON.parse(storedUser);
        } catch (e) {
          console.error('Error parsing user data:', e);
          setIsVerified(false);
          setIsChecking(false);
          return;
        }
        
        // For non-Super_Admin users, verify they have the required IDs
        if (userData && userData.role !== 'Super_Admin') {
          // For non-admin roles, if restaurantId is missing, attempt a profile refresh
          if (userData.restaurantId === undefined || userData.restaurantId === null) {
            try {
              const response = await axios.get('/api/users/profile', {
                headers: { Authorization: `Bearer ${storedToken}` }
              });
              const freshUserData = response.data.user || response.data;
              localStorage.setItem('user', JSON.stringify(freshUserData));
              // Verify successful
              setIsVerified(true);
            } catch (error) {
              // Only fail verification for 401 errors (auth issues)
              // For 403 (permissions) or other errors, still allow the user in
              if (error.response && error.response.status === 401) {
                setIsVerified(false);
              } else {
                // For all other errors, give benefit of doubt
                setIsVerified(true);
              }
            }
          } else {
            // Has required data already
            setIsVerified(true);
          }
        } else {
          // Super_Admin users don't need restaurant/branch verification
          setIsVerified(true);
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        // For unexpected errors, favor keeping user logged in
        setIsVerified(!!localStorage.getItem('token'));
      } finally {
        setIsChecking(false);
      }
    };
    
    verifyAuth();
  }, []);

  // Show loading state while checking authentication
  if (loading || isChecking) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  // Check if user is authenticated and route is accessible
  if (!isAuthenticated && !isVerified) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Render the protected content if authenticated
  return children;
};

export default ProtectedRoute;