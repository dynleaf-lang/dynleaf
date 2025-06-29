import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, LinearProgress, Box, Alert, 
  AlertTitle, Divider, Paper, Stack, IconButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import SignalWifiOffIcon from '@mui/icons-material/SignalWifiOff';
import WifiIcon from '@mui/icons-material/Wifi';
import { api } from '../../utils/apiClient';
import { clearCache } from '../../utils/cacheHelper';

/**
 * Enhanced Network Error Dialog with detailed status information
 * and troubleshooting options for the user
 */
const NetworkErrorFeedback = ({ 
  open, 
  onClose, 
  error, 
  onRetry,
  retryCount = 0, 
  isRetrying = false 
}) => {
  const [serverPingStatus, setServerPingStatus] = useState('unknown'); // 'unknown', 'ok', 'error'
  const [pingTime, setPingTime] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  
  useEffect(() => {
    if (open) {
      pingServer();
    }
  }, [open]);
  
  // Ping the server to check if it's reachable
  const pingServer = async () => {
    try {
      setServerPingStatus('checking');
      const startTime = performance.now();
      
      await api.health.check();
      
      const endTime = performance.now();
      setPingTime(Math.round(endTime - startTime));
      setServerPingStatus('ok');
    } catch (error) {
      setServerPingStatus('error');
      setPingTime(null);
    }
  };
  
  // Clear cache and retry
  const handleClearCacheAndRetry = () => {
    clearCache();
    if (onRetry) onRetry();
  };

  // Get the error category for better user feedback
  const getErrorCategory = () => {
    if (!error) return 'unknown';
    
    if (error.includes('Network Error') || 
        error.includes('Connection failed') ||
        error.includes('No response') ||
        error.includes('internet connection') ||
        error.includes('ECONNREFUSED') ||
        error.includes('failed to fetch')) {
      return 'network';
    }
    
    if (error.includes('401') || error.includes('Unauthorized')) {
      return 'auth';
    }
    
    if (error.includes('404') || error.includes('Not Found')) {
      return 'notfound';
    }
    
    if (error.includes('500') || error.includes('Internal Server Error')) {
      return 'server';
    }
    
    return 'unknown';
  };
  
  const errorCategory = getErrorCategory();
  
  // Dynamic troubleshooting tips based on error category
  const getTroubleshootingSteps = () => {
    switch (errorCategory) {
      case 'network':
        return [
          'Check your internet connection',
          'Make sure the server is running',
          'Check if the API URL is correct in the app settings',
          'Try disabling any VPN or proxy you might be using',
          'Check if other websites are accessible'
        ];
      case 'auth':
        return [
          'Your session may have expired',
          'Try logging out and logging back in',
          'Check if your account has the necessary permissions'
        ];
      case 'notfound':
        return [
          'The requested resource could not be found',
          'Check if you have the correct URL or ID',
          'The resource may have been deleted or moved'
        ];
      case 'server':
        return [
          'The server encountered an internal error',
          'Try again later as the issue might be temporary',
          'Contact support if the problem persists'
        ];
      default:
        return [
          'Try refreshing the page',
          'Check your internet connection',
          'Try clearing the browser cache',
          'Restart the application'
        ];
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      aria-labelledby="network-error-dialog-title"
    >
      <DialogTitle id="network-error-dialog-title">
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            {errorCategory === 'network' ? 
              <SignalWifiOffIcon color="error" sx={{ mr: 1 }} /> : 
              <WifiIcon color="warning" sx={{ mr: 1 }} />
            }
            <Typography variant="h6">Connection Problem</Typography>
          </Box>
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error Details</AlertTitle>
          {error || 'An unknown error occurred while connecting to the server'}
        </Alert>
        
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Server Connectivity</Typography>
          
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="body2">Status:</Typography>
            <Box display="flex" alignItems="center">
              {serverPingStatus === 'checking' && (
                <Typography variant="body2" color="text.secondary">Checking...</Typography>
              )}
              {serverPingStatus === 'ok' && (
                <>
                  <Box sx={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: '50%', 
                    bgcolor: 'success.main',
                    mr: 1 
                  }} />
                  <Typography variant="body2" color="success.main">Connected</Typography>
                </>
              )}
              {serverPingStatus === 'error' && (
                <>
                  <Box sx={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: '50%', 
                    bgcolor: 'error.main',
                    mr: 1 
                  }} />
                  <Typography variant="body2" color="error">Disconnected</Typography>
                </>
              )}
            </Box>
          </Box>
          
          {pingTime && (
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="body2">Response Time:</Typography>
              <Typography variant="body2">{pingTime} ms</Typography>
            </Box>
          )}
          
          <Box display="flex" justifyContent="center" mt={1}>
            <Button 
              startIcon={<RefreshIcon />}
              size="small"
              onClick={pingServer}
            >
              Check Again
            </Button>
          </Box>
        </Paper>
        
        <Button 
          fullWidth 
          variant="outlined" 
          color="info"
          onClick={() => setShowTroubleshooting(!showTroubleshooting)} 
          sx={{ mb: 2 }}
        >
          {showTroubleshooting ? 'Hide Troubleshooting Steps' : 'Show Troubleshooting Steps'}
        </Button>
        
        {showTroubleshooting && (
          <Box mb={2}>
            <Typography variant="subtitle1" gutterBottom>
              Troubleshooting Steps
            </Typography>
            <Stack spacing={1}>
              {getTroubleshootingSteps().map((step, index) => (
                <Alert key={index} severity="info" icon={false}>
                  {index + 1}. {step}
                </Alert>
              ))}
            </Stack>
          </Box>
        )}
        
        <Button
          startIcon={<SettingsIcon />}
          fullWidth
          color="secondary"
          variant="outlined" 
          onClick={() => setShowSettings(!showSettings)}
        >
          {showSettings ? 'Hide Advanced Options' : 'Show Advanced Options'}
        </Button>
        
        {showSettings && (
          <Box mt={2}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" gutterBottom>Advanced Options</Typography>
            
            <Stack spacing={1}>
              <Button 
                variant="outlined" 
                color="warning" 
                onClick={handleClearCacheAndRetry}
                size="small"
                fullWidth
              >
                Clear Cache and Retry
              </Button>
                <Button
                variant="outlined"
                color="primary"
                size="small"
                fullWidth
                component="a"
                href="/debug"
                onClick={() => {
                  // Close dialog when navigating
                  onClose();
                  // Open in new tab if Ctrl key is pressed
                  if (window.event && window.event.ctrlKey) {
                    window.open('/debug', '_blank');
                    return;
                  }
                  window.location.href = '/debug';
                }}
              >
                Open Debug Tools
              </Button>
            </Stack>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Box>
          {retryCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              Retry attempt: {retryCount}
            </Typography>
          )}
        </Box>
        <Box>
          <Button variant="outlined" onClick={onClose}>
            Dismiss
          </Button>
          <Button 
            variant="contained" 
            onClick={onRetry} 
            disabled={isRetrying}
            startIcon={isRetrying && <LinearProgress size={20} color="inherit" />}
            sx={{ ml: 1 }}
          >
            {isRetrying ? 'Retrying...' : 'Retry Now'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default NetworkErrorFeedback;
