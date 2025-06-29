import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Chip, 
  Collapse, IconButton, Tooltip
} from '@mui/material';
import SignalWifiStatusbarConnectedNoInternet4Icon from '@mui/icons-material/SignalWifiStatusbarConnectedNoInternet4';
import SignalWifi4BarIcon from '@mui/icons-material/SignalWifi4Bar';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { api } from '../../utils/apiClient';

/**
 * Component that monitors network status and server connectivity
 * Shows real-time information about connection health
 */
const NetworkStatusMonitor = () => {
  // State for connectivity monitoring
  const [online, setOnline] = useState(window.navigator.onLine);
  const [serverStatus, setServerStatus] = useState('unknown'); // 'unknown', 'connected', 'disconnected'
  const [lastPingTime, setLastPingTime] = useState(null);
  const [pingLatency, setPingLatency] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [pingHistory, setPingHistory] = useState([]);

  // Monitor browser online/offline status
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Ping the server periodically to check connectivity
  useEffect(() => {
    let pingInterval;
    
    const pingServer = async () => {
      if (!online) {
        setServerStatus('disconnected');
        return;
      }
      
      try {
        const startTime = performance.now();
        
        await api.health.check();
        
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);
        
        setServerStatus('connected');
        setPingLatency(latency);
        setLastPingTime(new Date());
        setLastChecked(new Date().toLocaleTimeString());
        
        // Keep a history of ping times for the chart
        setPingHistory(prev => {
          const newHistory = [...prev, { time: new Date().toLocaleTimeString(), latency }];
          // Keep only the last 10 ping results
          if (newHistory.length > 10) {
            return newHistory.slice(newHistory.length - 10);
          }
          return newHistory;
        });
      } catch (error) {
        console.error('Server ping failed:', error);
        setServerStatus('disconnected');
        setLastChecked(new Date().toLocaleTimeString());
      }
    };
    
    // Initial ping
    pingServer();
    
    // Set up periodic ping (every 30 seconds)
    pingInterval = setInterval(pingServer, 30000);
    
    return () => {
      clearInterval(pingInterval);
    };
  }, [online]);

  // Get status indicator color based on status
  const getStatusColor = () => {
    if (!online) return 'error';
    
    if (serverStatus === 'connected') {
      // Green for good connection (< 300ms)
      if (pingLatency && pingLatency < 300) return 'success';
      // Yellow for slow connection (> 300ms)
      if (pingLatency && pingLatency >= 300) return 'warning';
    }
    
    // Red for offline or server disconnected
    return 'error';
  };

  // Get status text for display
  const getStatusText = () => {
    if (!online) return 'Offline';
    if (serverStatus === 'connected') return 'Connected';
    if (serverStatus === 'disconnected') return 'Server Unreachable';
    return 'Checking...';
  };

  // Format ping latency for display
  const getLatencyText = () => {
    if (!pingLatency) return 'N/A';
    return `${pingLatency}ms`;
  };

  return (
    <Paper
      elevation={1}
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        borderRadius: 2,
        overflow: 'hidden',
        maxWidth: expanded ? 300 : 120,
        transition: 'max-width 0.3s ease',
        zIndex: 1000,
        opacity: 0.9,
        '&:hover': {
          opacity: 1,
          boxShadow: 3,
        },
      }}
    >
      <Box 
        display="flex" 
        alignItems="center" 
        justifyContent="space-between"
        sx={{ 
          backgroundColor: theme => theme.palette.grey[100],
          px: 1.5,
          py: 0.75,
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box display="flex" alignItems="center">
          {online && serverStatus === 'connected' ? (
            <SignalWifi4BarIcon color={getStatusColor()} sx={{ fontSize: 18, mr: 0.5 }} />
          ) : (
            <SignalWifiStatusbarConnectedNoInternet4Icon color="error" sx={{ fontSize: 18, mr: 0.5 }} />
          )}
          <Typography variant="body2" fontWeight="medium">
            {expanded ? 'Network Status' : getStatusText()}
          </Typography>
        </Box>
        <IconButton size="small" sx={{ p: 0 }}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Status:
            </Typography>
            <Chip
              label={getStatusText()}
              color={getStatusColor()}
              size="small"
              sx={{ height: 20, fontSize: '0.75rem' }}
            />
          </Box>
          
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Latency:
            </Typography>
            <Typography 
              variant="body2" 
              fontWeight="medium"
              color={pingLatency > 300 ? 'warning.main' : 'text.primary'}
            >
              {getLatencyText()}
            </Typography>
          </Box>
          
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Last Check:
            </Typography>
            <Typography variant="body2">
              {lastChecked || 'N/A'}
            </Typography>
          </Box>
          
          {pingHistory.length > 0 && (
            <Box mt={1.5}>
              <Typography variant="caption" color="text.secondary">
                Recent Ping History:
              </Typography>
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'flex-end', 
                  justifyContent: 'space-between',
                  height: 40,
                  mt: 0.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                {pingHistory.map((ping, index) => (
                  <Tooltip 
                    key={index} 
                    title={`${ping.time}: ${ping.latency}ms`}
                    placement="top"
                  >
                    <Box
                      sx={{
                        width: '8px',
                        backgroundColor: ping.latency < 300 ? 'success.main' : 
                                         ping.latency < 800 ? 'warning.main' : 'error.main',
                        height: `${Math.min(Math.max(ping.latency / 20, 5), 40)}px`,
                        borderRadius: '2px 2px 0 0',
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default NetworkStatusMonitor;
