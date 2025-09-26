import React from 'react';
import { useNavigate } from 'react-router-dom';

const LinkExpiredPage = ({ 
  title = "Link Expired", 
  message = "This link has expired for security reasons.",
  type = "expired" // "expired", "notfound", "error"
}) => {
  const navigate = useNavigate();

  const getIconAndColor = () => {
    switch(type) {
      case 'expired':
        return { icon: '⏰', color: '#ffc107', bgColor: '#fff3cd' };
      case 'notfound':
        return { icon: '🔗❌', color: '#dc3545', bgColor: '#f8d7da' };
      case 'error':
        return { icon: '⚠️', color: '#dc3545', bgColor: '#f8d7da' };
      default:
        return { icon: '⏰', color: '#ffc107', bgColor: '#fff3cd' };
    }
  };

  const { icon, color, bgColor } = getIconAndColor();

  const handleGoHome = () => {
    // Try to go back to home page or restaurant selection
    navigate('/', { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <div style={{
        background: 'white',
        padding: '40px 30px',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%'
      }}>
        {/* Icon */}
        <div style={{
          fontSize: '64px',
          marginBottom: '20px',
          color: color
        }}>
          {icon}
        </div>

        {/* Title */}
        <h1 style={{
          color: '#333',
          marginBottom: '15px',
          fontSize: '24px',
          fontWeight: '600'
        }}>
          {title}
        </h1>

        {/* Message */}
        <p style={{
          color: '#666',
          lineHeight: '1.6',
          marginBottom: '15px',
          fontSize: '16px'
        }}>
          {message}
        </p>

        {/* Highlight Box for Expired Links */}
        {type === 'expired' && (
          <div style={{
            background: bgColor,
            padding: '15px',
            borderRadius: '6px',
            margin: '20px 0',
            borderLeft: `4px solid ${color}`
          }}>
            <strong>⚡ Links expire after 60 minutes</strong><br />
            This keeps your orders secure and ensures you get the latest menu.
          </div>
        )}

        {/* Instructions */}
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          margin: '25px 0',
          borderLeft: '4px solid #28a745'
        }}>
          <h3 style={{
            color: '#28a745',
            marginBottom: '12px',
            fontSize: '18px'
          }}>
            {type === 'expired' ? '🚀 Get a Fresh Link' : '🎯 Get Your Ordering Link'}
          </h3>
          
          <div style={{ textAlign: 'left', color: '#555' }}>
            <strong>Quick Options:</strong>
            <ul style={{ marginTop: '10px' }}>
              <li style={{ margin: '8px 0', paddingLeft: '10px' }}>
                📱 <strong>Scan the QR code</strong> on your table again
              </li>
              <li style={{ margin: '8px 0', paddingLeft: '10px' }}>
                💬 <strong>Send "Order Now"</strong> to the restaurant's WhatsApp
              </li>
              <li style={{ margin: '8px 0', paddingLeft: '10px' }}>
                📋 <strong>Include your table code</strong> (e.g., "T: T4722")
              </li>
              <li style={{ margin: '8px 0', paddingLeft: '10px' }}>
                ⚡ <strong>Get your new link instantly!</strong>
              </li>
            </ul>
          </div>
        </div>

        {/* Pro Tip for Expired */}
        {type === 'expired' && (
          <p style={{
            color: '#666',
            lineHeight: '1.6',
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            <strong>💡 Pro Tip:</strong> Save time by bookmarking the new link once you get it, 
            but remember it will expire in 60 minutes.
          </p>
        )}

        {/* Action Button */}
        <button
          onClick={handleGoHome}
          style={{
            background: '#667eea',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            marginTop: '20px',
            transition: 'background-color 0.3s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6fd8'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#667eea'}
        >
          🏠 Go to Homepage
        </button>

        {/* Footer */}
        <div style={{
          marginTop: '25px',
          fontSize: '14px',
          color: '#999'
        }}>
          Powered by <span style={{ color: '#667eea', fontWeight: 'bold' }}>OrderEase</span> 🍽️
        </div>
      </div>
    </div>
  );
};

export default LinkExpiredPage;