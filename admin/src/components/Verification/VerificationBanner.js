import React, { useContext, useEffect, useState } from 'react';
import { Alert, Button } from 'reactstrap';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

/**
 * VerificationBanner component
 * Displays a banner at the top of the admin dashboard for users who need to verify their email
 * Won't display for users who have already verified their email
 */
const VerificationBanner = () => {
  const { user, token } = useContext(AuthContext);
  const [isVerified, setIsVerified] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // IMMEDIATE CHECK: Check localStorage first before any rendering
  useEffect(() => {
    // Check if we should bypass verification immediately
    const bypassVerification = localStorage.getItem('bypassVerification') === 'true';
    if (bypassVerification) {
      console.log('BANNER IMMEDIATE: Bypass flag found, skipping banner display');
      setIsVerified(true);
    }
  }, []);

  // Check all verification sources on component mount and when user changes
  useEffect(() => {
    // Don't proceed with checks if we've already established the user is verified
    if (isVerified) {
      setShowBanner(false);
      return;
    }

    const checkAllVerificationSources = () => {
      // Do a complete check to prevent any possibility of showing the banner unnecessarily
      
      // Source 1: Check bypass flag in localStorage (again)
      const bypassVerification = localStorage.getItem('bypassVerification') === 'true';
      if (bypassVerification) {
        console.log('BANNER: Bypass flag found in storage, no banner needed');
        setIsVerified(true);
        setShowBanner(false);
        return true;
      }

      // Source 2: Check user object directly
      if (user && user.isEmailVerified === true) {
        console.log('BANNER: User is verified according to user object, no banner needed');
        setIsVerified(true);
        setShowBanner(false);
        // Set bypass flag for future reference
        localStorage.setItem('bypassVerification', 'true');
        return true;
      }
      
      // Source 3: Check user data in localStorage
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          if (userData && userData.isEmailVerified === true) {
            console.log('BANNER: User is verified according to localStorage, no banner needed');
            setIsVerified(true);
            setShowBanner(false);
            localStorage.setItem('bypassVerification', 'true'); // Ensure flag is set
            return true;
          }
        }
      } catch (err) {
        console.error('BANNER: Error checking user verification in localStorage:', err);
      }

      // Only if we're absolutely sure the user is NOT verified, should we potentially show the banner
      if (user && user.isEmailVerified === false && !dismissedBanner) {
        console.log('BANNER: User is explicitly NOT verified, showing banner');
        setShowBanner(true);
      } else {
        // If we're not sure, don't show banner
        setShowBanner(false);
      }
      
      return false;
    };
    
    checkAllVerificationSources();
    setInitialCheckDone(true);
    
  }, [user, isVerified, dismissedBanner]);

  // Verify email status by checking API if we're still unsure
  useEffect(() => {
    // Only make API call if all these conditions are true:
    // 1. We're still unsure about verification status
    // 2. We have a token
    // 3. We have a user object
    // 4. Initial check is complete
    if (!isVerified && token && user && initialCheckDone) {
      const checkVerificationApi = async () => {
        try {
          console.log('BANNER: Fetching fresh user data from API');
          const response = await axios.get('/api/users/profile', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          const userData = response.data.user || response.data;
          
          // If API confirms user is verified, update everything
          if (userData && userData.isEmailVerified === true) {
            console.log('BANNER: API confirms user is verified, hiding banner permanently');
            setIsVerified(true);
            setShowBanner(false);
            localStorage.setItem('bypassVerification', 'true');
            
            // Update localStorage with verified state
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              try {
                const parsedUser = JSON.parse(storedUser);
                parsedUser.isEmailVerified = true;
                localStorage.setItem('user', JSON.stringify(parsedUser));
              } catch (err) {
                console.error('BANNER: Error updating user verification in localStorage:', err);
              }
            }
          } else if (userData && userData.isEmailVerified === false) {
            console.log('BANNER: API confirms user is NOT verified');
          }
        } catch (error) {
          console.error('BANNER: Error checking verification status:', error);
        }
      };
      
      // Add a slight delay to avoid competing with VerificationContainer
      const timeoutId = setTimeout(() => {
        checkVerificationApi();
      }, 800);
      
      return () => clearTimeout(timeoutId);
    }
  }, [token, user, isVerified, initialCheckDone]);

  // LAST CHECK: Even if component decides to render, double-check one more time
  if (isVerified || localStorage.getItem('bypassVerification') === 'true' || !showBanner || dismissedBanner) {
    return null;
  }

  // One final guard to ensure we have an unverified user before showing the banner
  if (!user || user.isEmailVerified !== false) {
    return null;
  }

  return (
    <Alert 
      color="warning" 
      className="mt-3 mx-3 mb-0 d-flex align-items-center justify-content-between"
      toggle={() => setDismissedBanner(true)}
    >
      <div className="d-flex align-items-center">
        <i className="fas fa-exclamation-triangle mr-3" style={{ fontSize: '1.25rem' }}></i>
        <div>
          <h5 className="alert-heading mb-1">Email verification required</h5>
          <p className="mb-0 small">Please verify your email to access all features of the dashboard.</p>
        </div>
      </div>
      <Button color="warning" size="sm" className="ml-3" onClick={() => window.location.href = '/admin/user-profile'}>
        Verify Now
      </Button>
    </Alert>
  );
};

export default VerificationBanner;