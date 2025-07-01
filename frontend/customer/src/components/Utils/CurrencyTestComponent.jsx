import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../context/CurrencyContext';
import { useRestaurant } from '../../context/RestaurantContext';
import CurrencyDisplay from './CurrencyFormatter';
import { countryCurrencyMap } from '../../utils/currencyUtils';

const CurrencyTestComponent = () => {
  const { currencySymbol, currencyCode, formatCurrency, countryCode } = useCurrency();
  const { restaurant, branch } = useRestaurant();
  const [testAmounts] = useState([0, 1, 9.99, 15.99, 99.99, 1000, 1234.56]);
  const [availableCountries] = useState(Object.keys(countryCurrencyMap).filter(key => key !== 'DEFAULT'));

  // Add test functionality
  const [testRestaurant, setTestRestaurant] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('DEFAULT');
  
  // Mock restaurant data for testing
  useEffect(() => {
    setTestRestaurant({
      name: "Test Restaurant",
      country: selectedCountry
    });
  }, [selectedCountry]);
  
  console.log('Currency Context Values:', {
    currencySymbol,
    currencyCode,
    countryCode,
    restaurant: restaurant?.name,
    restaurantCountry: restaurant?.country,
    branch: branch?.name,
    branchCountry: branch?.country,
    formattedValue: formatCurrency(15.99)
  });
    return (
    <div style={{ padding: '20px', border: '1px solid #ddd', margin: '20px', borderRadius: '8px', maxWidth: '800px' }}>
      <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Currency Display Test</h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3>Country Selection Tester</h3>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Select Country to Test:</label>
          <select 
            value={selectedCountry} 
            onChange={(e) => setSelectedCountry(e.target.value)}
            style={{ 
              padding: '8px', 
              borderRadius: '4px',
              border: '1px solid #ddd',
              width: '100%',
              maxWidth: '300px'
            }}
          >
            <option value="DEFAULT">Default (USD)</option>
            {availableCountries.sort().map(country => (
              <option key={country} value={country}>
                {country} - {countryCurrencyMap[country]?.code} ({countryCurrencyMap[country]?.symbol})
              </option>
            ))}
          </select>
        </div>
        <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          Note: In a real application, this would change based on restaurant/branch settings.
          This test interface allows you to simulate different country settings.
        </p>
      </div>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3>Current Configuration</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '5px' }}>
          <strong>Currency Symbol:</strong> <span>{currencySymbol}</span>
          <strong>Currency Code:</strong> <span>{currencyCode}</span>
          <strong>Country Code:</strong> <span>{countryCode}</span>
          <strong>Restaurant:</strong> <span>{restaurant?.name || testRestaurant?.name || 'Not set'}</span>
          <strong>Restaurant Country:</strong> <span>{restaurant?.country || testRestaurant?.country || 'Not set'}</span>
          <strong>Branch:</strong> <span>{branch?.name || 'Not set'}</span>
          <strong>Branch Country:</strong> <span>{branch?.country || 'Not set'}</span>
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Simple Test Cases</h3>
        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
          <p>
            <strong>Direct formatCurrency:</strong> {formatCurrency(15.99)}
          </p>
          <p>
            <strong>CurrencyDisplay Component:</strong> <CurrencyDisplay amount={15.99} />
          </p>
          <p>
            <strong>With currency code:</strong> <CurrencyDisplay amount={15.99} showCode={true} />
          </p>
        </div>
      </div>
      
      <div>
        <h3>Various Amounts</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Amount</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>formatCurrency()</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>CurrencyDisplay</th>
            </tr>
          </thead>
          <tbody>
            {testAmounts.map((amount, index) => (
              <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{amount}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{formatCurrency(amount)}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}><CurrencyDisplay amount={amount} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CurrencyTestComponent;
