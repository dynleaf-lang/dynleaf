import React, { useState } from 'react';
import RestaurantProvider from '../../context/RestaurantContext';
import { CurrencyProvider } from '../../context/CurrencyContext';
import CurrencyTestComponent from './CurrencyTestComponent';

/**
 * Wrapper component that provides all necessary contexts for the currency test
 */
const CurrencyTestWrapper = () => {
  return (
    <RestaurantProvider>
      <CurrencyProvider>
        <div style={{ 
          padding: '20px', 
          maxWidth: '1200px', 
          margin: '0 auto',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
        }}>
          <h1 style={{ color: '#333', borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>
            Currency Formatting Test Dashboard
          </h1>
          
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#f9f9f9', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #e0e0e0' 
          }}>
            <h2 style={{ margin: '0 0 10px 0', color: '#444' }}>About This Test</h2>
            <p>This page tests the dynamic currency formatting functionality across the application:</p>
            <ul style={{ lineHeight: '1.6' }}>
              <li>Verify that currency symbols display correctly based on country settings</li>
              <li>Test formatting of different numerical values</li>
              <li>Ensure consistency across all components using the CurrencyFormatter</li>
            </ul>
          </div>
          
          <div style={{ marginTop: '20px' }}>
            <CurrencyTestComponent />
          </div>
        </div>
      </CurrencyProvider>
    </RestaurantProvider>
  );
};

export default CurrencyTestWrapper;
