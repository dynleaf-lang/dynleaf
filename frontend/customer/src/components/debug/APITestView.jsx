import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Button, Grid, Card, CardContent, 
  CircularProgress, Chip, Divider, List, ListItem, ListItemText,
  IconButton, Collapse, Alert, TextField, Switch, FormControlLabel
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import CachedIcon from '@mui/icons-material/Cached';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { api } from '../../utils/apiClient';
import { getCacheStats, clearCache } from '../../utils/cacheHelper';

/**
 * Comprehensive API Integration Testing Component
 * Tests the connection between frontend and backend and provides:
 * - Real-time API endpoint status 
 * - Response data preview
 * - Cache management
 * - Network simulation options
 */
const APITestView = () => {
  const [endpointResults, setEndpointResults] = useState([]);
  const [expandedEndpoint, setExpandedEndpoint] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [useCache, setUseCache] = useState(true);
  const [simNetworkDelay, setSimNetworkDelay] = useState(0);
  const [cacheStats, setCacheStats] = useState({ count: 0, totalSize: '0 KB', items: [] });
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [customEndpointResult, setCustomEndpointResult] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);
  
  // Define the APIs to test
  const endpointsToTest = [
    { name: 'Server Health', apiCall: () => api.health.check(), expectedStatus: 200, description: 'Basic server health check' },
    { name: 'Get All Restaurants', apiCall: () => api.restaurants.getAll(), expectedStatus: 200, description: 'Fetch all restaurants' },
    { name: 'Get All Menu Items', apiCall: () => api.menuItems.getAll(), expectedStatus: 200, description: 'Fetch all menu items' },
    { name: 'Get All Categories', apiCall: () => api.categories.getAll(), expectedStatus: 200, description: 'Fetch all categories' },
    { name: 'Get Tables', apiCall: () => api.tables.getAll(), expectedStatus: 200, description: 'Fetch all tables' },
  ];
  
  // Load cache stats on init
  useEffect(() => {
    updateCacheStats();
  }, []);
  
  const updateCacheStats = () => {
    const stats = getCacheStats();
    setCacheStats(stats);
  };

  const handleExpandEndpoint = (name) => {
    setExpandedEndpoint(expandedEndpoint === name ? '' : name);
  };

  // Test an individual endpoint
  const testEndpoint = async (endpoint) => {
    try {
      const startTime = performance.now();
      
      // Optional: Simulate network delay
      if (simNetworkDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, simNetworkDelay));
      }
      
      const response = await endpoint.apiCall();
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      return {
        ...endpoint,
        success: true,
        status: response?.status || 200,
        responseTime,
        data: response,
        error: null,
        timestamp: new Date().toLocaleTimeString()
      };
    } catch (error) {
      return {
        ...endpoint,
        success: false,
        status: error.status || 500,
        responseTime: 0,
        data: null,
        error: error.message || 'Unknown error occurred',
        timestamp: new Date().toLocaleTimeString()
      };
    }
  };

  // Test all endpoints
  const runAllTests = async () => {
    setLoading(true);
    
    const results = [];
    for (const endpoint of endpointsToTest) {
      const result = await testEndpoint(endpoint);
      results.push(result);
    }
    
    setEndpointResults(results);
    setLoading(false);
    updateCacheStats();
  };

  // Test a custom endpoint
  const testCustomEndpoint = async () => {
    if (!customEndpoint) return;
    
    setCustomLoading(true);
    
    try {
      const startTime = performance.now();
      
      // Format the endpoint
      let endpoint = customEndpoint;
      if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
      
      const response = await api.custom.get(endpoint);
      
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      setCustomEndpointResult({
        success: true,
        status: 200,
        responseTime,
        data: response,
        error: null,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      setCustomEndpointResult({
        success: false,
        status: error.status || 500,
        responseTime: 0,
        data: null,
        error: error.message || 'Unknown error occurred',
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setCustomLoading(false);
      updateCacheStats();
    }
  };

  // Clear all cached data
  const handleClearCache = () => {
    clearCache();
    updateCacheStats();
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4">API Integration Test</Typography>
          <Box>
            <Button 
              variant="outlined" 
              color="info" 
              startIcon={<InfoIcon />}
              onClick={() => setShowSettings(!showSettings)}
              sx={{ mr: 1 }}
            >
              Settings
            </Button>
            <Button 
              variant="contained" 
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
              onClick={runAllTests}
              disabled={loading}
            >
              {loading ? 'Testing...' : 'Run All Tests'}
            </Button>
          </Box>
        </Box>
        
        <Collapse in={showSettings}>
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa' }}>
            <Typography variant="h6" gutterBottom>Test Settings</Typography>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={useCache} 
                      onChange={(e) => setUseCache(e.target.checked)} 
                    />
                  }
                  label="Use Cache"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  label="Simulate Network Delay (ms)"
                  type="number"
                  value={simNetworkDelay}
                  onChange={(e) => setSimNetworkDelay(parseInt(e.target.value) || 0)}
                  variant="outlined"
                  size="small"
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Button 
                  variant="outlined" 
                  color="warning"
                  startIcon={<CachedIcon />}
                  onClick={handleClearCache}
                >
                  Clear Cache
                </Button>
              </Grid>
            </Grid>
            
            <Box mt={2}>
              <Typography variant="subtitle2" color="textSecondary">
                Cache Status: {cacheStats.count} items ({cacheStats.totalSize})
              </Typography>
              {cacheStats.items.length > 0 && (
                <List dense sx={{ maxHeight: '150px', overflow: 'auto' }}>
                  {cacheStats.items.map((item, idx) => (
                    <ListItem key={idx} dense>
                      <ListItemText 
                        primary={item.key} 
                        secondary={`Size: ${item.size} | Expires in: ${item.expires}`} 
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Paper>
        </Collapse>
        
        {/* Custom endpoint test */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Test Custom Endpoint</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={8}>
              <TextField
                label="API Endpoint"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                placeholder="e.g., /api/restaurants/123"
                variant="outlined"
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={4}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={testCustomEndpoint}
                disabled={customLoading || !customEndpoint}
                startIcon={customLoading ? <CircularProgress size={20} color="inherit" /> : null}
                fullWidth
              >
                {customLoading ? 'Testing...' : 'Test Endpoint'}
              </Button>
            </Grid>
          </Grid>
          
          {customEndpointResult && (
            <Box mt={2}>
              <Card variant={customEndpointResult.success ? 'outlined' : 'elevation'}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1">
                      Custom Endpoint: {customEndpoint}
                    </Typography>
                    <Box>
                      <Chip 
                        icon={customEndpointResult.success ? <CheckCircleIcon /> : <ErrorIcon />}
                        label={customEndpointResult.success ? 'Success' : 'Failed'}
                        color={customEndpointResult.success ? 'success' : 'error'}
                        size="small"
                      />
                      {customEndpointResult.responseTime > 0 && (
                        <Chip 
                          label={`${customEndpointResult.responseTime}ms`}
                          variant="outlined"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  </Box>
                  
                  {customEndpointResult.error ? (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {customEndpointResult.error}
                    </Alert>
                  ) : (
                    <Box mt={2} sx={{ maxHeight: 200, overflow: 'auto' }}>
                      <pre style={{ margin: 0 }}>
                        {JSON.stringify(customEndpointResult.data, null, 2)}
                      </pre>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}
        </Paper>
        
        {/* Test results */}
        <Divider sx={{ my: 3 }} />
        <Typography variant="h6" gutterBottom>
          Endpoint Test Results {endpointResults.length > 0 && `(${new Date().toLocaleString()})`}
        </Typography>
        
        {endpointResults.length === 0 && !loading ? (
          <Alert severity="info">Run the tests to see results</Alert>
        ) : (
          <Grid container spacing={3}>
            {loading ? (
              <Grid item xs={12}>
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              </Grid>
            ) : (
              endpointResults.map((result, index) => (
                <Grid item xs={12} key={index}>
                  <Card variant={result.success ? 'outlined' : 'elevation'}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="h6">{result.name}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {result.description}
                          </Typography>
                        </Box>
                        <Box>
                          <Chip 
                            icon={result.success ? <CheckCircleIcon /> : <ErrorIcon />}
                            label={result.status}
                            color={result.success ? 'success' : 'error'}
                            size="small"
                          />
                          {result.responseTime > 0 && (
                            <Chip 
                              label={`${result.responseTime}ms`}
                              variant="outlined"
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                          <IconButton 
                            size="small"
                            onClick={() => handleExpandEndpoint(result.name)}
                          >
                            {expandedEndpoint === result.name ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </Box>
                      </Box>
                      
                      <Collapse in={expandedEndpoint === result.name}>
                        <Box mt={2}>
                          {result.error ? (
                            <Alert severity="error">{result.error}</Alert>
                          ) : (
                            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                              <pre style={{ margin: 0 }}>
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )}
      </Paper>
    </Box>
  );
};

export default APITestView;
