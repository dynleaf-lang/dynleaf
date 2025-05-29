import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import VerifyEmailModal from '../Modals/VerifyEmailModal';
import { Alert } from 'reactstrap';
import axios from 'axios';

const VerificationContainer = () => {
  const { user, token, requiresVerification, emailToVerify } = useContext(AuthContext);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [refreshAttempted, setRefreshAttempted] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // IMMEDIATE CHECK: Check localStorage first before any rendering
  useEffect(() => {
    // Check if we should bypass verification immediately
    const bypassVerification = localStorage.getItem('bypassVerification') === 'true';
    if (bypassVerification) {
      console.log('IMMEDIATE: Bypass flag found in localStorage, skipping verification checks');
      setIsVerified(true);
      setShowVerificationModal(false);
    }
  }, []);

  // Check all verification sources on initial load and when user changes
  useEffect(() => {
    // Skip all checks if already verified
    if (isVerified) return;

    const checkAllVerificationSources = () => {
      // Already verified in previous check
      if (isVerified) return true;

      // Source 1: Direct check of user object from context
      if (user && user.isEmailVerified === true) {
        console.log('User is verified according to context, setting bypass flag');
        setIsVerified(true);
        localStorage.setItem('bypassVerification', 'true');
        setShowVerificationModal(false);
        return true;
      }
      
      // Source 2: Check localStorage for bypass flag
      const bypassVerification = localStorage.getItem('bypassVerification') === 'true';
      if (bypassVerification) {
        console.log('Verification bypass flag found, skipping verification modal');
        setIsVerified(true);
        setShowVerificationModal(false);
        return true;
      }
      
      // Source 3: Check user data in localStorage
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          if (userData.isEmailVerified === true) {
            console.log('User is verified according to localStorage, updating state');
            setIsVerified(true);
            localStorage.setItem('bypassVerification', 'true');
            setShowVerificationModal(false);
            return true;
          }
        }
      } catch (err) {
        console.error('Error checking user verification status in localStorage:', err);
      }
      
      return false;
    };
    
    // Run the check
    checkAllVerificationSources();
  }, [user, isVerified]);

  // Fetch fresh user data from API only if not verified yet
  useEffect(() => {
    // Skip API check if already verified or no token
    if (isVerified || !token || refreshAttempted) return;
    
    const refreshUserData = async () => {
      try {
        console.log('Refreshing user verification status from API');
        
        const response = await axios.get('/api/users/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        const freshUserData = response.data.user || response.data;
        
        // Check if user is verified in the fresh data
        if (freshUserData && freshUserData.isEmailVerified) {
          console.log('User is verified according to API, updating local storage');
          // Update localStorage
          if (user) {
            const updatedUser = { ...user, isEmailVerified: true };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            localStorage.setItem('bypassVerification', 'true');
            setIsVerified(true);
            setShowVerificationModal(false);
          }
        } else if (freshUserData) {
          // Store verification status for unverified users too
          setIsVerified(!!freshUserData.isEmailVerified);
        }
        
      } catch (error) {
        console.error('Error refreshing user verification status:', error);
      } finally {
        setRefreshAttempted(true);
      }
    };
    
    // Delay API check to allow other methods to work first
    const timeoutId = setTimeout(() => {
      refreshUserData();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [token, user, refreshAttempted, isVerified]);

  // Control verification modal visibility - separate effect to avoid race conditions
  useEffect(() => {
    // Skip if already verified or no user
    if (!user || isVerified) {
      setShowVerificationModal(false);
      return;
    }

    // Skip if bypass flag is set (double-check)
    const bypassVerification = localStorage.getItem('bypassVerification') === 'true';
    if (bypassVerification) {
      setShowVerificationModal(false);
      setIsVerified(true);
      return;
    }

    // Only show verification modal if ALL these conditions are met:
    // 1. User is explicitly NOT verified
    // 2. We have an email to verify
    // 3. Verification is required by the application
    const shouldShowModal = 
      user && 
      user.isEmailVerified === false && 
      (emailToVerify || user.email) && 
      requiresVerification &&
      !verificationSuccess;
    
    setShowVerificationModal(shouldShowModal);
    
    if (!shouldShowModal) {
      console.log('Not showing verification modal - conditions not met');
    }
  }, [user, emailToVerify, requiresVerification, isVerified, verificationSuccess]);

  const handleVerificationSuccess = () => {
    // Mark verification as successful
    setVerificationSuccess(true);
    setIsVerified(true);

    // Close modal
    setShowVerificationModal(false);

    // Update local storage directly
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        userData.isEmailVerified = true;
        localStorage.setItem('user', JSON.stringify(userData));
        // Set bypass flag
        localStorage.setItem('bypassVerification', 'true');
      } catch (err) {
        console.error('Error updating user verification status in localStorage:', err);
      }
    }

    // Don't reload the page, just update state
  };

  // If verified or bypass flag is set, don't render anything
  if (isVerified || localStorage.getItem('bypassVerification') === 'true') {
    return null;
  }

  return (
    <>
      {verificationSuccess && (
        <Alert color="success" className="mx-3 mt-3">
          <div className="d-flex align-items-center">
            <i className="fas fa-check-circle mr-2"></i>
            <strong>Email verified successfully!</strong> You now have full access to all features.
          </div>
        </Alert>
      )}

      {showVerificationModal && (
        <VerifyEmailModal
          isOpen={showVerificationModal}
          toggle={() => setShowVerificationModal(!showVerificationModal)}
          email={emailToVerify || (user && user.email)}
          onVerificationSuccess={handleVerificationSuccess}
        />
      )}
    </>
  );
};

export default VerificationContainer;