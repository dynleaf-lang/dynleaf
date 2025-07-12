import React from 'react';
import { theme } from '../../data/theme';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    // Here you could send error to logging service
    // this.logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
            textAlign: 'center',
            backgroundColor: theme.colors.background,
            fontFamily: theme.fonts.body
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: theme.borderRadius.xl,
              padding: '40px 30px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
              maxWidth: '500px',
              width: '100%'
            }}
          >
            {/* Error Icon */}
            <div
              style={{
                fontSize: '4rem',
                marginBottom: '20px',
                opacity: 0.7
              }}
            >
              ⚠️
            </div>

            {/* Error Title */}
            <h2
              style={{
                color: theme.colors.text,
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '15px',
                fontFamily: theme.fonts.heading
              }}
            >
              Something went wrong
            </h2>

            {/* Error Message */}
            <p
              style={{
                color: theme.colors.textSecondary,
                fontSize: '1rem',
                marginBottom: '30px',
                lineHeight: '1.5'
              }}
            >
              We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
            </p>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details
                style={{
                  marginBottom: '30px',
                  textAlign: 'left',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  padding: '15px'
                }}
              >
                <summary
                  style={{
                    color: '#DC2626',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginBottom: '10px'
                  }}
                >
                  Error Details (Development)
                </summary>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#7F1D1D',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  <strong>Error:</strong> {this.state.error.toString()}
                  <br />
                  <br />
                  <strong>Component Stack:</strong>
                  {this.state.errorInfo.componentStack}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '15px',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}
            >
              {/* Retry Button */}
              <button
                onClick={this.handleRetry}
                style={{
                  backgroundColor: theme.colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: theme.borderRadius.md,
                  padding: '12px 24px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '120px'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = theme.colors.primaryDark;
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = theme.colors.primary;
                }}
              >
                Try Again
              </button>

              {/* Reload Button */}
              <button
                onClick={this.handleReload}
                style={{
                  backgroundColor: 'transparent',
                  color: theme.colors.primary,
                  border: `2px solid ${theme.colors.primary}`,
                  borderRadius: theme.borderRadius.md,
                  padding: '12px 24px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '120px'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = theme.colors.primary;
                  e.target.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = theme.colors.primary;
                }}
              >
                Reload Page
              </button>
            </div>

            {/* Retry Count (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.retryCount > 0 && (
              <p
                style={{
                  marginTop: '20px',
                  fontSize: '0.875rem',
                  color: theme.colors.textSecondary,
                  fontStyle: 'italic'
                }}
              >
                Retry attempts: {this.state.retryCount}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
