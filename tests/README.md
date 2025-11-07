# Payment Failure Validation Test Suite

This comprehensive test suite validates the payment failure flow in the OrderEase food ordering system. It ensures robust error handling, proper user messaging, and reliable system behavior during various payment failure scenarios.

## Overview

The test suite covers all aspects of payment failure handling:

- **Network & Connection Failures**
- **Payment Gateway Errors** 
- **User Cancellation Flows**
- **Timeout Scenarios**
- **WebSocket Real-time Updates**
- **UI Error Messaging**
- **Retry Mechanisms**
- **Backend Webhook Processing**

## Test Structure

### 1. Payment Failure Validation (`payment-failure-validation.js`)
Main test suite covering core payment failure scenarios:
- Network timeouts and connection issues
- Authentication failures
- Payment declined scenarios (insufficient funds, card declined, etc.)
- User cancellation handling
- Payment processing timeouts
- WebSocket failure notifications
- Retry mechanism validation
- Error message categorization

### 2. Frontend Error Handling (`frontend-error-handling-test.js`)
Browser-based tests for UI error handling:
- Error message display validation
- Payment failure modal behavior
- Retry button functionality
- Error message categorization
- User interaction flows
- Accessibility features

### 3. WebSocket Failure Events (`websocket-failure-test.js`)
Real-time communication failure testing:
- Payment failed event handling
- Payment dropped event processing
- Connection recovery mechanisms
- Event duplication handling
- Invalid event validation
- Multi-order event management

### 4. Payment Status Tracker (`payment-status-tracker-test.js`)
UI component testing for status display:
- Failure state visualization
- Cancelled state handling
- Processing state indicators
- Progress tracking
- Animation states
- Accessibility compliance

### 5. Backend Webhook Handling (`backend-webhook-failure-test.js`)
Server-side webhook processing validation:
- Payment failure webhook processing
- Signature validation
- Malformed data handling
- Duplicate webhook management
- Order state updates
- Error logging and recovery

## Installation

```bash
# Install test dependencies
cd tests
npm install
```

## Configuration

Set environment variables for testing:

```bash
# Test environment URLs
export TEST_API_URL=http://localhost:5001
export TEST_CUSTOMER_URL=http://localhost:3000
export TEST_ADMIN_URL=http://localhost:3001
export TEST_SOCKET_URL=http://localhost:5001

# Webhook testing
export CASHFREE_WEBHOOK_SECRET=your_webhook_secret

# Test mode
export NODE_ENV=test
```

## Running Tests

### Complete Validation Suite
```bash
# Run all payment failure validation tests
npm run test:payment-failures

# Or run directly
node run-payment-failure-validation.js
```

### Individual Test Suites
```bash
# Core payment scenarios
npm run test:payment-scenarios

# Frontend error handling
npm run test:frontend-errors

# WebSocket failure events
npm run test:websocket-failures

# Payment status tracker UI
npm run test:status-tracker

# Backend webhook handling
npm run test:webhook-failures
```

### CI/CD Integration
```bash
# Quick test for CI pipelines
npm run test:ci
```

## Test Environment Setup

### Prerequisites
1. **Backend Server**: Must be running on configured port (default: 5001)
2. **Customer Frontend**: Should be running for UI tests (default: 3000)
3. **Database**: MongoDB connection for order state testing
4. **WebSocket Server**: Real-time communication testing

### Test Data
Tests automatically create and clean up test data:
- Test customer information
- Mock payment sessions
- Temporary order records
- WebSocket connections

## Test Reports

The validation suite generates comprehensive reports:

### Master Report
```
🏁 COMPREHENSIVE PAYMENT FAILURE VALIDATION REPORT
================================================================================

EXECUTION SUMMARY:
  Total Duration: 45.67 seconds
  Test Suites: 5
  Suite Status: 4 passed, 1 warnings, 0 failed, 0 errors

TEST SUMMARY:
  Total Individual Tests: 47
  Passed: 43
  Failed: 0
  Warnings: 4
  Success Rate: 91.49%
```

### Individual Suite Reports
Each test suite provides detailed results with:
- Test execution status
- Error descriptions
- Performance metrics
- Recommendations

## Understanding Test Results

### Status Levels
- ✅ **PASS**: Test completed successfully
- ⚠️ **WARN**: Test passed but with concerns
- ❌ **FAIL**: Test failed - requires attention
- ⏭️ **SKIP**: Test skipped due to prerequisites
- 💥 **ERROR**: Test execution error

### Common Issues and Solutions

#### Network Timeout Tests
```
❌ Network Error Display: FAIL - Timeout message not user-friendly
```
**Solution**: Update error messaging in `handleError()` function

#### WebSocket Connection Issues
```
⚠️ WebSocket Fallback: WARN - WebSocket fallback behavior unclear
```
**Solution**: Implement proper fallback polling mechanism

#### UI Component Problems
```
❌ Retry Button Functionality: FAIL - Retry button callback not triggered
```
**Solution**: Check event handler binding in PaymentStatusTracker

## Best Practices

### Test Maintenance
1. **Regular Execution**: Run tests before deployments
2. **Environment Consistency**: Use identical test configurations
3. **Data Cleanup**: Ensure tests clean up after execution
4. **Dependency Updates**: Keep test dependencies current

### Adding New Tests
1. Follow existing test structure patterns
2. Include proper error handling
3. Add comprehensive assertions
4. Document test scenarios
5. Update master test runner

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Run Payment Failure Validation
  run: |
    cd tests
    npm install
    npm run test:ci
```

## Troubleshooting

### Common Issues

#### Test Environment Not Ready
```bash
# Check if backend is running
curl http://localhost:5001/api/health

# Verify WebSocket connection
telnet localhost 5001
```

#### Browser Tests Failing
```bash
# Install Chrome dependencies (Linux)
apt-get install -y chromium-browser

# Use headless mode for CI
export PUPPETEER_HEADLESS=true
```

#### WebSocket Connection Errors
```bash
# Check firewall settings
netstat -an | grep 5001

# Verify Socket.io version compatibility
npm list socket.io socket.io-client
```

### Debug Mode
Enable detailed logging:
```bash
export DEBUG=payment:*
npm run test:payment-failures
```

## Contributing

When adding new payment failure scenarios:

1. **Identify the scenario**: What specific failure case?
2. **Choose appropriate test suite**: Which test file to modify?
3. **Write the test**: Follow existing patterns
4. **Update documentation**: Add scenario description
5. **Test thoroughly**: Verify on multiple environments

## Security Considerations

- Test credentials are separate from production
- Webhook signatures use test secrets
- No real payment processing in tests
- Test data is automatically cleaned up

## Performance

### Test Execution Times
- Complete suite: ~45-60 seconds
- Individual suites: ~5-15 seconds each
- Browser tests: Slower due to UI automation

### Optimization Tips
- Run tests in parallel where possible
- Use headless browser mode for CI
- Minimize network delays in test environment
- Cache browser instances for multiple UI tests

## Support

For test suite issues:
1. Check environment configuration
2. Verify all services are running
3. Review test logs for specific errors
4. Consult troubleshooting guide
5. Contact development team if needed