# Dynamic Tax Calculation System

This documentation explains how the tax calculation system works in the customer frontend application.

## Overview

The tax calculation system determines tax rates based on the restaurant/branch country settings. It integrates with the existing tax management system in the admin portal to ensure consistent tax calculations across the entire application.

## Key Components

### 1. TaxContext

The `TaxContext` serves as the central hub for managing tax information. It provides:

- Current tax rate based on country settings
- Tax name and formatting
- Tax calculation functions
- Loading and error states
- Caching mechanism to reduce API calls

File: `/context/TaxContext.jsx`

### 2. TaxInfo Component

A reusable component that displays tax information with proper handling for:
- Loading states
- Error states
- Different tax configurations

File: `/components/ui/TaxInfo.jsx`

### 3. API Integration

Tax information is fetched from the backend through:
- Public API endpoint for taxes by country code
- Error handling for network issues
- Caching to improve performance

### 4. Testing Utilities

- `TaxTester` component for testing tax calculations
- `testTaxCalculation.js` utility for programmatic testing

## How It Works

1. The `TaxProvider` wraps the application to provide tax context.
2. Country code is derived from the restaurant or branch settings.
3. When country code changes, tax information is fetched from the API.
4. Tax calculations use the appropriate rate based on country.
5. UI components display tax information consistently across the app.
6. Error handling ensures graceful fallbacks to default rates.

## Tax Calculation Flow

```
Restaurant/Branch Country Setting
        │
        ▼
   TaxContext
 (fetches tax data)
        │
        ▼
   Tax Rate & Rules
        │
        ▼
Cart Items ──► Calculate Tax Amount ──► Display in UI
```

## Implementation in Key Components

### Cart Context

The cart uses tax calculations for:
- Order subtotal and total
- Tax amount display
- Storing tax details in orders

### Checkout Form

Displays tax information during the checkout process.

### Order Confirmation

Shows detailed tax breakdown in order summaries.

## Error Handling

The system handles various error scenarios:
- Network failures when fetching tax data
- Missing tax configurations
- Invalid tax rates
- API errors

In all error cases, the system falls back to a default tax rate to ensure the application continues to function.

## Testing

The tax system can be tested using:
1. The `TaxTester` component (available in development mode)
2. The `testTaxCalculations` utility function

To test with different country codes:
1. Access the TaxTester by clicking the calculator icon
2. Select a country and test amount
3. View the calculated tax and rate

## Maintenance

When making changes to the tax system:
1. Ensure consistency between admin and customer frontends
2. Test with multiple country codes
3. Verify calculations are correct
4. Check error handling works properly
