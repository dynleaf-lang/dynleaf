import React, { useState, useContext } from 'react';
import { Button, Card, CardHeader, CardBody, Alert } from 'reactstrap';
import { AuthContext } from '../../../context/AuthContext';
import { useEmailVerification } from '../';

/**
 * Example component demonstrating how to use the email verification system.
 * This pattern can be applied to any component that needs to verify users.
 */
const VerificationExample = () => {
  const { user } = useContext(AuthContext);
  const [message, setMessage] = useState('');
  
  // Use our custom hook for email verification
  const {
    isModalOpen,
    email,
    isEmailVerified,
    openVerificationModal,
    verificationModalProps
  } = useEmailVerification(user?.email);
  
  // Example function that requires verification
  const handleVerifiedAction = () => {
    if (!isEmailVerified) {
      // If not verified, show the verification modal
      openVerificationModal(user.email);
      setMessage('Please verify your email before performing this action.');
    } else {
      // User is verified, proceed with action
      setMessage('Action completed successfully! Your email is verified.');
    }
  };
  
  return (
    <Card className="shadow">
      <CardHeader className="border-0">
        <h3 className="mb-0">Email Verification Example</h3>
      </CardHeader>
      <CardBody>
        {message && (
          <Alert color={isEmailVerified ? 'success' : 'warning'} toggle={() => setMessage('')}>
            {message}
          </Alert>
        )}
        
        <div className="mb-3">
          <p>
            <strong>Email:</strong> {user?.email || 'Not available'}
          </p>
          <p>
            <strong>Verification Status:</strong>{' '}
            {isEmailVerified ? (
              <span className="text-success">Verified</span>
            ) : (
              <span className="text-danger">Not Verified</span>
            )}
          </p>
        </div>
        
        <Button
          color="primary"
          onClick={handleVerifiedAction}
        >
          Perform Action (Requires Verification)
        </Button>
        
        {!isEmailVerified && (
          <Button
            color="info"
            className="ml-2"
            onClick={() => openVerificationModal(user?.email)}
          >
            Verify Email Now
          </Button>
        )}
        
        {/* Import the EmailVerificationModal component and pass our verificationModalProps */}
        <EmailVerificationModal {...verificationModalProps} />
      </CardBody>
    </Card>
  );
};

export default VerificationExample;