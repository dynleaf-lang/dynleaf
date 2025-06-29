import React, { useState, useEffect } from 'react';
import NetworkErrorFeedback from './NetworkErrorFeedback';
import { useRestaurant } from '../../context/RestaurantContext';

/**
 * Component to handle and display network errors with retry functionality
 * Enhanced with a more comprehensive UI for user feedback
 */
const NetworkErrorHandler = () => {
  const { error, retryLastRequest, isRetrying, retryCount } = useRestaurant();
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  
  // Check if it's specifically a network connection error
  const isNetworkError = error && (
    error.includes('Connection failed') || 
    error.includes('No response') ||
    error.includes('internet connection') ||
    error.includes('Network Error')
  );
  
  const handleClose = () => {
    setIsDialogOpen(false);
  };
  
  const handleRetry = () => {
    retryLastRequest();
    // Keep dialog open while retrying
  };
  
  // If there's a new error, reopen the dialog
  useEffect(() => {
    if (error && isNetworkError) {
      setIsDialogOpen(true);
    }
  }, [error, isNetworkError]);
  
  return (
    <>
      {error && isNetworkError && (
        <NetworkErrorFeedback
          open={isDialogOpen}
          onClose={handleClose}
          error={error}
          onRetry={handleRetry}
          retryCount={retryCount}
          isRetrying={isRetrying}
        />
      )}
    </>
  );
};

export default NetworkErrorHandler;
