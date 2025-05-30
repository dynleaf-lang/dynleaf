import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../../context/AuthContext';

/**
 * Custom hook to manage email verification state and functionality
 * Makes it easy to integrate the email verification modal into any component
 * 
 * @returns {Object} Verification state and functions to manage it
 */
const useEmailVerification = (initialEmail = '') => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const { verifyEmail, confirmVerification, resendVerificationEmail, user } = useContext(AuthContext);

  // Check if the user is already verified
  const isEmailVerified = user?.isEmailVerified || user?.emailVerified || user?.verified || false;

  // Reset verification state when user changes
  useEffect(() => {
    if (user) {
      const isVerified = user.isEmailVerified || user.emailVerified || user.verified || false;
      setVerificationComplete(isVerified);
    }
  }, [user]);

  /**
   * Opens the verification modal with a specific email
   * @param {string} emailToVerify - The email address to verify
   */
  const openVerificationModal = (emailToVerify) => {
    if (emailToVerify) {
      setEmail(emailToVerify);
    }
    setIsModalOpen(true);
  };

  /**
   * Closes the verification modal
   */
  const closeVerificationModal = () => {
    setIsModalOpen(false);
  };

  /**
   * Handles the verification completion
   * Updates verification state and closes the modal
   */
  const handleVerificationSuccess = () => {
    setVerificationComplete(true);
    setTimeout(() => {
      setIsModalOpen(false);
    }, 2000);
  };

  /**
   * Helper to check if verification is needed
   * @returns {boolean} Whether verification is needed
   */
  const needsVerification = () => {
    return !isEmailVerified && !verificationComplete;
  };
  
  return {
    // State
    isModalOpen,
    email,
    isEmailVerified,
    verificationComplete,
    
    // Actions
    openVerificationModal,
    closeVerificationModal,
    handleVerificationSuccess,
    needsVerification,
    
    // Modal props (for convenience)
    verificationModalProps: {
      isOpen: isModalOpen,
      toggle: closeVerificationModal,
      email: email,
      onVerified: handleVerificationSuccess
    }
  };
};

export default useEmailVerification;