/**
 * Example Integration: Enhanced ProfileView with Link Expiration
 * This demonstrates how to integrate the link expiration system into existing components
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useLinkExpiration } from '../../hooks/useLinkExpiration';
import { LinkExpirationGuard } from '../hoc/withLinkExpirationCheck';
import ProtectedRoute from '../Utils/ProtectedRoute';
import { theme } from '../../data/theme';

const EnhancedProfileContent = () => {
  const { user, logout } = useAuth();
  const { favorites } = useFavorites();
  const { checkExpiredData, handleApiError } = useLinkExpiration();
  const [isLoading, setIsLoading] = useState(false);

  // Check for expired data on component mount
  useEffect(() => {
    checkExpiredData();
  }, [checkExpiredData]);

  // Handle navigation to favorites
  const handleNavigateToFavorites = async () => {
    try {
      setIsLoading(true);
      
      // Example of making an API call with expiration handling
      const response = await fetch('/api/user/favorites', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Navigate to favorites view
      window.dispatchEvent(new CustomEvent('navigate-to-favorites'));
    } catch (error) {
      // Use the link expiration handler for API errors
      if (!handleApiError(error)) {
        console.error('Error loading favorites:', error);
        // Handle other types of errors
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout with cleanup
  const handleLogout = () => {
    // Clear any session-related data before logout
    try {
      const sessionKeys = [
        'sessionToken',
        'sessionTime',
        'tempUserData',
        'userPreferences'
      ];
      
      sessionKeys.forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('Error clearing session data:', error);
    }
    
    logout();
  };

  // Account settings items
  const accountSettings = [
    { 
      icon: "favorite", 
      label: "My Favorites", 
      action: handleNavigateToFavorites,
      badge: favorites?.length > 0 ? favorites.length : null,
      loading: isLoading
    },
    { icon: "notifications", label: "Notifications" },
    { icon: "payment", label: "Payment Methods" },
    { icon: "location_on", label: "Delivery Addresses" },
    { icon: "language", label: "Language" }
  ];

  // Help & Support items
  const helpSupportItems = [
    { icon: "help", label: "FAQ" },
    { icon: "support_agent", label: "Contact Support" },
    { icon: "description", label: "Terms & Conditions" },
    { icon: "privacy_tip", label: "Privacy Policy" }
  ];

  return (
    <div style={{
      padding: theme.spacing.md
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: theme.spacing.lg,
        backgroundColor: "#FFF",
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.shadows.sm,
        marginBottom: theme.spacing.md
      }}>
        {/* Profile Header */}
        <div style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          backgroundColor: theme.colors.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: "2rem",
          fontWeight: "bold",
          marginBottom: theme.spacing.md
        }}>
          {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
        </div>

        <h2 style={{
          color: theme.colors.text.primary,
          fontSize: theme.typography.sizes['2xl'],
          fontWeight: theme.typography.fontWeights.bold,
          marginBottom: theme.spacing.xs,
          textAlign: "center"
        }}>
          {user?.name || "User"}
        </h2>

        <p style={{
          color: theme.colors.text.secondary,
          fontSize: theme.typography.sizes.md,
          marginBottom: theme.spacing.lg,
          textAlign: "center"
        }}>
          {user?.email || "user@example.com"}
        </p>

        {/* Session Status Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: `${theme.colors.success}15`,
          border: `1px solid ${theme.colors.success}30`,
          borderRadius: theme.borderRadius.md,
          padding: '8px 16px',
          fontSize: theme.typography.sizes.sm,
          color: theme.colors.success
        }}>
          <span style={{ fontSize: '1rem' }}>✅</span>
          Session Active
        </div>
      </div>

      {/* Account Settings */}
      <div style={{
        backgroundColor: "#FFF",
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.shadows.sm,
        marginBottom: theme.spacing.md
      }}>
        <h3 style={{
          color: theme.colors.text.primary,
          fontSize: theme.typography.sizes.lg,
          fontWeight: theme.typography.fontWeights.semibold,
          padding: `${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing.md}`,
          margin: 0,
          borderBottom: `1px solid ${theme.colors.border}`
        }}>
          Account Settings
        </h3>

        {accountSettings.map((item, index) => (
          <div
            key={index}
            onClick={item.action}
            style={{
              display: "flex",
              alignItems: "center",
              padding: theme.spacing.md,
              borderBottom: index < accountSettings.length - 1 ? `1px solid ${theme.colors.border}` : 'none',
              cursor: item.action ? "pointer" : "default",
              transition: "background-color 0.2s",
              opacity: item.loading ? 0.6 : 1,
              pointerEvents: item.loading ? 'none' : 'auto'
            }}
            onMouseOver={(e) => {
              if (item.action && !item.loading) {
                e.target.style.backgroundColor = theme.colors.backgroundAlt;
              }
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            <span 
              className="material-icons"
              style={{
                color: theme.colors.text.secondary,
                marginRight: theme.spacing.md,
                fontSize: "1.5rem"
              }}
            >
              {item.loading ? 'hourglass_empty' : item.icon}
            </span>

            <span style={{
              color: theme.colors.text.primary,
              fontSize: theme.typography.sizes.md,
              flex: 1
            }}>
              {item.label}
            </span>

            {item.badge && (
              <span style={{
                backgroundColor: theme.colors.primary,
                color: 'white',
                borderRadius: '12px',
                padding: '4px 8px',
                fontSize: theme.typography.sizes.xs,
                fontWeight: theme.typography.fontWeights.semibold,
                minWidth: '20px',
                textAlign: 'center',
                marginRight: theme.spacing.sm
              }}>
                {item.badge}
              </span>
            )}

            {item.action && (
              <span 
                className="material-icons"
                style={{
                  color: theme.colors.text.muted,
                  fontSize: "1.2rem"
                }}
              >
                {item.loading ? 'sync' : 'chevron_right'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Help & Support */}
      <div style={{
        backgroundColor: "#FFF",
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.shadows.sm,
        marginBottom: theme.spacing.md
      }}>
        <h3 style={{
          color: theme.colors.text.primary,
          fontSize: theme.typography.sizes.lg,
          fontWeight: theme.typography.fontWeights.semibold,
          padding: `${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing.md}`,
          margin: 0,
          borderBottom: `1px solid ${theme.colors.border}`
        }}>
          Help & Support
        </h3>

        {helpSupportItems.map((item, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              padding: theme.spacing.md,
              borderBottom: index < helpSupportItems.length - 1 ? `1px solid ${theme.colors.border}` : 'none',
              cursor: "pointer",
              transition: "background-color 0.2s"
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = theme.colors.backgroundAlt;
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            <span 
              className="material-icons"
              style={{
                color: theme.colors.text.secondary,
                marginRight: theme.spacing.md,
                fontSize: "1.5rem"
              }}
            >
              {item.icon}
            </span>

            <span style={{
              color: theme.colors.text.primary,
              fontSize: theme.typography.sizes.md,
              flex: 1
            }}>
              {item.label}
            </span>

            <span 
              className="material-icons"
              style={{
                color: theme.colors.text.muted,
                fontSize: "1.2rem"
              }}
            >
              chevron_right
            </span>
          </div>
        ))}
      </div>

      {/* Logout Button */}
      <div style={{
        backgroundColor: "#FFF",
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.shadows.sm
      }}>
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            padding: theme.spacing.md,
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            transition: "background-color 0.2s",
            borderRadius: theme.borderRadius.lg
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#FEF2F2';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
        >
          <span 
            className="material-icons"
            style={{
              color: theme.colors.danger,
              marginRight: theme.spacing.md,
              fontSize: "1.5rem"
            }}
          >
            logout
          </span>

          <span style={{
            color: theme.colors.danger,
            fontSize: theme.typography.sizes.md,
            flex: 1,
            textAlign: "left",
            fontFamily: 'inherit'
          }}>
            Logout
          </span>
        </button>
      </div>
    </div>
  );
};

// Enhanced ProfileView with Link Expiration Protection
const EnhancedProfileView = () => {
  return (
    <ProtectedRoute>
      <LinkExpirationGuard
        requireAuth={true}
        maxAge={60 * 60 * 1000} // 1 hour
        checkInterval={5 * 60 * 1000} // Check every 5 minutes
        fallback={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            color: theme.colors.text.secondary
          }}>
            <div style={{
              textAlign: 'center'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: `3px solid ${theme.colors.primary}`,
                borderTop: '3px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }} />
              <p>Verifying session...</p>
            </div>
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        }
      >
        <EnhancedProfileContent />
      </LinkExpirationGuard>
    </ProtectedRoute>
  );
};

export default EnhancedProfileView;