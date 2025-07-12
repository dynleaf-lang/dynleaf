import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import ProtectedRoute from '../Utils/ProtectedRoute';
import { theme } from '../../data/theme';

const ProfileContent = () => {
  const { user, logout } = useAuth();
  const { favorites } = useFavorites();

  // Handle navigation to favorites
  const handleNavigateToFavorites = () => {
    // Emit event to navigate to favorites view
    window.dispatchEvent(new CustomEvent('navigate-to-favorites'));
  };

  // Account settings items
  const accountSettings = [
    { 
      icon: "favorite", 
      label: "My Favorites", 
      action: handleNavigateToFavorites,
      badge: favorites?.length > 0 ? favorites.length : null
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
        marginBottom: theme.spacing.lg
      }}>
        <div style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          backgroundColor: theme.colors.background,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: theme.spacing.md,
          overflow: "hidden",
          backgroundColor: theme.colors.primary,
          color: "#fff",
          fontSize: "32px",
          fontWeight: theme.typography.fontWeights.bold
        }}>
          {user?.name?.charAt(0).toUpperCase() || "U"}
        </div>
        <h3 style={{
          fontSize: theme.typography.sizes.lg,
          fontWeight: theme.typography.fontWeights.semibold,
          margin: `${theme.spacing.xs} 0`,
          color: theme.colors.text.primary
        }}>
          {user?.name || "User"}
        </h3>
        <p style={{
          color: theme.colors.text.secondary,
          fontSize: theme.typography.sizes.sm,
          marginBottom: theme.spacing.md
        }}>
          {user?.email || user?.phone || ""}
        </p>
        <button 
          onClick={() => logout()}
          style={{
            backgroundColor: "#f5f5f5",
            color: theme.colors.text.primary,
            border: "none",
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            borderRadius: theme.borderRadius.md,
            fontWeight: theme.typography.fontWeights.medium,
            cursor: "pointer"
          }}
        >
          Logout
        </button>
      </div>
      
      {/* Settings sections */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.shadows.sm,
        overflow: "hidden",
        marginBottom: theme.spacing.lg
      }}>
        <div style={{
          padding: `${theme.spacing.md} ${theme.spacing.lg}`,
          borderBottom: `1px solid ${theme.colors.border}`
        }}>
          <h4 style={{
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.semibold,
            margin: 0,
            color: theme.colors.text.primary
          }}>
            Account Settings
          </h4>
        </div>
        {accountSettings.map((item, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
              borderBottom: index < accountSettings.length - 1 ? `1px solid ${theme.colors.border}` : "none",
              cursor: "pointer",
              transition: "background-color 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.backgroundAlt}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            onClick={item.action || (() => {})}
          >
            <span className="material-icons" style={{
              fontSize: "20px",
              color: item.icon === "favorite" ? theme.colors.primary : theme.colors.text.secondary,
              marginRight: theme.spacing.md
            }}>
              {item.icon}
            </span>
            <span style={{
              fontSize: theme.typography.sizes.md,
              color: theme.colors.text.primary,
              flex: 1
            }}>
              {item.label}
            </span>
            {item.badge && (
              <span style={{
                backgroundColor: theme.colors.primary,
                color: "white",
                borderRadius: "12px",
                padding: "2px 8px",
                fontSize: theme.typography.sizes.xs,
                fontWeight: theme.typography.fontWeights.bold,
                marginRight: theme.spacing.sm,
                minWidth: "20px",
                textAlign: "center"
              }}>
                {item.badge}
              </span>
            )}
            <span className="material-icons" style={{
              fontSize: "20px",
              color: theme.colors.text.muted
            }}>
              chevron_right
            </span>
          </div>
        ))}
      </div>

      {/* Help & Support section */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.shadows.sm,
        overflow: "hidden"
      }}>
        <div style={{
          padding: `${theme.spacing.md} ${theme.spacing.lg}`,
          borderBottom: `1px solid ${theme.colors.border}`
        }}>
          <h4 style={{
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.semibold,
            margin: 0,
            color: theme.colors.text.primary
          }}>
            Help & Support
          </h4>
        </div>
        {helpSupportItems.map((item, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
              borderBottom: index < helpSupportItems.length - 1 ? `1px solid ${theme.colors.border}` : "none",
              cursor: "pointer",
              transition: "background-color 0.2s ease"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.backgroundAlt}
            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
          >
            <span className="material-icons" style={{
              fontSize: "20px",
              color: theme.colors.text.secondary,
              marginRight: theme.spacing.md
            }}>
              {item.icon}
            </span>
            <span style={{
              fontSize: theme.typography.sizes.md,
              color: theme.colors.text.primary
            }}>
              {item.label}
            </span>
            <span className="material-icons" style={{
              fontSize: "20px",
              color: theme.colors.text.muted,
              marginLeft: "auto"
            }}>
              chevron_right
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Protected Profile View
const ProfileView = () => {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
};

export default ProfileView;
