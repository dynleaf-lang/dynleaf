import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import EmailVerificationModal from './EmailVerificationModal';

/**
 * VerificationProvider component
 * 
 * This is a wrapper component that automatically displays a verification modal
 * for unverified users. It will handle showing/hiding the modal and managing
 * the verification process.
 * 
 * Usage:
 * 1. Wrap your component with VerificationProvider
 * 2. It will automatically show the verification modal for unverified users
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The wrapped components
 * @param {boolean} props.checkOnMount - Whether to check verification status on mount
 * @param {string} props.email - Optional email override
 * @param {Function} props.onVerified - Callback when verification is successful
 * @returns {React.ReactNode}
 */
const VerificationProvider = ({ 
  children, 
  checkOnMount = false, 
  email = null,
  onVerified = null 
}) => {
  const { user } = useContext(AuthContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [emailToVerify, setEmailToVerify] = useState(email);
  const [verificationComplete, setVerificationComplete] = useState(false);
  
  // Check if the user is already verified
  const isUserVerified = user?.isEmailVerified || user?.emailVerified || user?.verified || false;

  useEffect(() => {
    // If user data changes, update our verification state
    if (user) {
      const isVerified = user.isEmailVerified || user.emailVerified || user.verified || false;
      setVerificationComplete(isVerified);
      
      // If explicitly checking on mount and user is not verified, show the modal
      if (checkOnMount && !isVerified && !verificationComplete) {
        openVerificationModal();
      }
      
      // Update email if not already set
      if (!emailToVerify && user.email) {
        setEmailToVerify(user.email);
      }
    }
  }, [user, checkOnMount]);
  
  // If email prop changes, update our state
  useEffect(() => {
    if (email) {
      setEmailToVerify(email);
    }
  }, [email]);

  const openVerificationModal = (customEmail = null) => {
    if (customEmail) {
      setEmailToVerify(customEmail);
    } else if (user && user.email) {
      setEmailToVerify(user.email);
    }
    setIsModalOpen(true);
  };

  const closeVerificationModal = () => {
    setIsModalOpen(false);
  };

  const handleVerificationSuccess = () => {
    setVerificationComplete(true);
    
    // Call the onVerified callback if provided
    if (typeof onVerified === 'function') {
      onVerified();
    }
  };

  return (
    <>
      {children}
      
      <EmailVerificationModal
        isOpen={isModalOpen}
        toggle={closeVerificationModal}
        email={emailToVerify}
        onVerified={handleVerificationSuccess}
      />
    </>
  );
};

export default VerificationProvider;