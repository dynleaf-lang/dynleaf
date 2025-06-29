import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [featureSettings, setFeatureSettings] = useState({});
  const [availableFeatures, setAvailableFeatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, token } = useAuth();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  
  // Configure axios headers with timeout
  const getConfig = useCallback(() => {
    return {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
      },
      timeout: 10000 // 10 second timeout
    };
  }, [token]);

  // Define available feature list
  useEffect(() => {
    // This defines what features can be toggled in settings
    const features = [
      { 
        id: 'tax_management', 
        name: 'Tax Management', 
        description: 'Enable/disable tax calculation and management',
        icon: 'ni ni-money-coins text-purple'
      },
      { 
        id: 'customer_management', 
        name: 'Customer Management', 
        description: 'Enable/disable customer profiles and history',
        icon: 'ni ni-single-02 text-cyan'
      },
      { 
        id: 'table_management', 
        name: 'Table Management', 
        description: 'Enable/disable dining table management',
        icon: 'ni ni-ungroup text-info'
      },
      { 
        id: 'order_reports', 
        name: 'Order Reports', 
        description: 'Enable/disable access to detailed order reports',
        icon: 'ni ni-chart-bar-32 text-purple'
      },
      { 
        id: 'menu_management', 
        name: 'Menu Management', 
        description: 'Enable/disable menu editing capabilities',
        icon: 'ni ni-box-2 text-green'
      }
    ];
    
    // Filter features based on user role
    let filteredFeatures = features;
    
    if (user) {
      if (user.role === 'Branch_Manager') {
        // Branch managers can toggle most features for their branch
        filteredFeatures = features;
      } else if (user.role === 'Super_Admin') {
        // Super admins can toggle all features globally
        filteredFeatures = features;
      } else {
        // Other roles have restricted access to toggleable features
        filteredFeatures = [];
      }
    }
    
    setAvailableFeatures(filteredFeatures);
  }, [user]);

  // Get all settings
  const getFeatureSettings = useCallback(async () => {
    if (!user || !user.branchId) return;
    
    setLoading(true);
    try {
      // In a real implementation, this would be a call to get settings from backend
      const response = await axios.get(
        `${API_URL}/settings/features${user.role === 'Branch_Manager' ? `/branch/${user.branchId}` : ''}`, 
        getConfig()
      );
      
      setFeatureSettings(response.data.settings || {});
      setError(null);
    } catch (err) {
      console.error('Error fetching feature settings:', err);
      
      // If API doesn't exist yet, use localStorage as fallback
      const storedSettings = localStorage.getItem('featureSettings');
      if (storedSettings) {
        try {
          setFeatureSettings(JSON.parse(storedSettings));
        } catch (parseError) {
          console.error('Error parsing stored settings:', parseError);
        }
      } else {
        // Initialize with default values if no stored settings
        const defaultSettings = availableFeatures.reduce((acc, feature) => {
          acc[feature.id] = true; // Default all features to enabled
          return acc;
        }, {});
        
        setFeatureSettings(defaultSettings);
        localStorage.setItem('featureSettings', JSON.stringify(defaultSettings));
      }
      
      setError('Unable to fetch settings from server, using local settings instead');
    } finally {
      setLoading(false);
    }
  }, [API_URL, getConfig, user, availableFeatures]);

  // Update feature setting
  const updateFeatureSetting = useCallback(async (featureId, enabled) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // In a real implementation, this would be a call to update settings on backend
      const response = await axios.put(
        `${API_URL}/settings/features/${featureId}${user.role === 'Branch_Manager' ? `/branch/${user.branchId}` : ''}`,
        { enabled },
        getConfig()
      );
      
      setFeatureSettings(prev => ({
        ...prev,
        [featureId]: enabled
      }));
      
      // Also update localStorage as backup
      const storedSettings = localStorage.getItem('featureSettings');
      if (storedSettings) {
        try {
          const parsed = JSON.parse(storedSettings);
          parsed[featureId] = enabled;
          localStorage.setItem('featureSettings', JSON.stringify(parsed));
        } catch (parseError) {
          console.error('Error updating stored settings:', parseError);
        }
      }
      
      setError(null);
      return response.data;
    } catch (err) {
      console.error(`Error updating feature setting for ${featureId}:`, err);
      
      // Update local state even if API fails
      setFeatureSettings(prev => ({
        ...prev,
        [featureId]: enabled
      }));
      
      // Update localStorage as backup
      const storedSettings = localStorage.getItem('featureSettings');
      if (storedSettings) {
        try {
          const parsed = JSON.parse(storedSettings);
          parsed[featureId] = enabled;
          localStorage.setItem('featureSettings', JSON.stringify(parsed));
        } catch (parseError) {
          console.error('Error updating stored settings:', parseError);
        }
      }
      
      setError('Unable to update settings on server, changes saved locally');
      return { success: true, message: 'Changes saved locally' };
    } finally {
      setLoading(false);
    }
  }, [API_URL, getConfig, user]);

  // Check if a feature is enabled
  const isFeatureEnabled = useCallback((featureId) => {
    return featureSettings[featureId] !== false; // Default to true if not specifically disabled
  }, [featureSettings]);

  // Initialize settings on mount and when user changes
  useEffect(() => {
    if (user) {
      getFeatureSettings();
    }
  }, [user, getFeatureSettings]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    featureSettings,
    availableFeatures,
    loading,
    error,
    getFeatureSettings,
    updateFeatureSetting,
    isFeatureEnabled
  }), [
    featureSettings,
    availableFeatures,
    loading,
    error,
    getFeatureSettings,
    updateFeatureSetting,
    isFeatureEnabled
  ]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export default SettingsProvider;