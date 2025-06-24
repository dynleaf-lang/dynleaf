import React from 'react';
import { Button, Box, Typography, Paper, Alert } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useRestaurant } from '../../context/RestaurantContext';

/**
 * Component to handle and display network errors with retry functionality
 */
const NetworkErrorHandler = () => {
  const { error, retryLastRequest, isRetrying, retryCount } = useRestaurant();
  
  // Check if it's specifically a network connection error
  const isNetworkError = error && (
    error.includes('Connection failed') || 
    error.includes('No response') ||
    error.includes('internet connection') ||
    error.includes('Network Error')
  );
  
  // Use conditional rendering instead of early returns
  return (
    <>
      {error && isNetworkError && (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            m: 2, 
            maxWidth: 600, 
            mx: 'auto',
            backgroundColor: '#f8f9fa',
            borderRadius: 2,
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <WifiOffIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Connection Problem
            </Typography>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            
            {retryCount > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                Retry attempt: {retryCount}
              </Typography>
            )}
            
            <Typography variant="body1" sx={{ mb: 3 }}>
              Please check your internet connection and try again.
            </Typography>
            
            <Button 
              variant="contained" 
              color="primary" 
              onClick={retryLastRequest}
              disabled={isRetrying}
              startIcon={<RefreshIcon />}
              sx={{ 
                minWidth: 150,
                backgroundColor: '#1976d2',
                '&:hover': {
                  backgroundColor: '#115293',
                }
              }}
            >
              {isRetrying ? 'Retrying...' : 'Retry Now'}
            </Button>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              If the problem persists, please try scanning the QR code again or contact the restaurant staff for assistance.
            </Typography>
          </Box>
        </Paper>
      )}
    </>
  );
};

export default NetworkErrorHandler;