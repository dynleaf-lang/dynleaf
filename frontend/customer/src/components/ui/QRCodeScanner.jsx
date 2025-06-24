import React, { useState, useRef, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion } from 'framer-motion';
import { useRestaurant } from '../../context/RestaurantContext';
import { theme } from '../../data/theme';

const QRCodeScanner = () => {
  const { loadFromQrCode, loading, error } = useRestaurant();
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const [manualQrCode, setManualQrCode] = useState('');
  const scannerRef = useRef(null);
  const qrScannerDivId = "qr-reader";

  useEffect(() => {
    if (!scannerInitialized) {
      try {
        // Initialize the scanner with configuration
        const scanner = new Html5QrcodeScanner(
          qrScannerDivId, 
          { 
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true,
            // Updated: Remove formatsToSupport to use defaults
          },
          false
        );

        // Define what happens when QR code is successfully scanned
        const onScanSuccess = async (decodedText) => {
          console.log(`QR Code detected: ${decodedText}`);
          
          // Stop scanner to prevent multiple scans
          scanner.clear();
          
          // Load data based on QR code
          await loadFromQrCode(decodedText);
        };

        // Start the scanner
        scanner.render(onScanSuccess, (error) => {
          console.warn(`QR Code scanning error: ${error}`);
        });

        // Store scanner instance for cleanup
        scannerRef.current = scanner;
        setScannerInitialized(true);
      } catch (error) {
        console.error("Error initializing scanner:", error);
      }
      
      // Cleanup scanner on component unmount
      return () => {
        if (scannerRef.current) {
          try {
            scannerRef.current.clear();
          } catch (error) {
            console.error("Error clearing scanner:", error);
          }
        }
      };
    }
  }, [scannerInitialized, loadFromQrCode]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (manualQrCode.trim()) {
      // Clean up scanner
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
      
      // Load data based on manually entered QR code
      await loadFromQrCode(manualQrCode.trim());
    }
  };

  // Add function to load demo data directly
  const handleLoadDemoData = async () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (error) {
        console.error("Error clearing scanner:", error);
      }
    }
    
    try {
      // This will load sample data without requiring a QR code
      await loadFromQrCode("test-mode");
    } catch (error) {
      console.error("Error loading demo data:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        padding: "20px",
        maxWidth: "500px",
        margin: "0 auto"
      }}
    >
      <div style={{
        textAlign: "center",
        padding: "20px 0"
      }}>
        <h1 style={{
          fontFamily: theme.typography.fontFamily.display,
          fontSize: "28px",
          color: theme.colors.secondary,
          margin: "0 0 8px 0"
        }}>
          OrderEase <span style={{ color: theme.colors.primary }}>Scanner</span>
        </h1>
        <p style={{
          color: theme.colors.text.secondary,
          fontSize: theme.typography.sizes.sm,
          margin: 0
        }}>
          Scan the QR code at your table to view the menu
        </p>
      </div>
      
      <div style={{ width: "100%", borderRadius: theme.borderRadius.lg, overflow: "hidden" }}>
        {/* Html5QrcodeScanner will be rendered inside this div */}
        <div id={qrScannerDivId} style={{ width: "100%" }}></div>
      </div>
      
      {/* Manual entry form */}
      <div style={{ 
        width: "100%", 
        background: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: "20px",
        boxShadow: theme.shadows.sm
      }}>
        <h3 style={{ 
          margin: "0 0 10px 0", 
          fontSize: theme.typography.sizes.md, 
          color: theme.colors.text.primary 
        }}>
          Or enter QR code manually
        </h3>
        <form onSubmit={handleManualSubmit} style={{ display: "flex", gap: "10px" }}>
          <input 
            type="text" 
            value={manualQrCode}
            onChange={(e) => setManualQrCode(e.target.value)}
            placeholder="Enter QR code"
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.border}`,
              fontSize: theme.typography.sizes.sm
            }}
          />
          <motion.button 
            type="submit"
            whileTap={{ scale: 0.95 }}
            disabled={loading}
            style={{
              backgroundColor: theme.colors.primary,
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: theme.borderRadius.md,
              fontWeight: theme.typography.fontWeights.semibold,
              cursor: loading ? "wait" : "pointer"
            }}
          >
            {loading ? "Loading..." : "Submit"}
          </motion.button>
        </form>
      </div>
      
      {/* Test mode button */}
      <div style={{ 
        width: "100%", 
        background: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: "20px",
        boxShadow: theme.shadows.sm,
        marginTop: "10px"
      }}>
        <h3 style={{ 
          margin: "0 0 10px 0", 
          fontSize: theme.typography.sizes.md, 
          color: theme.colors.text.primary 
        }}>
          Testing Mode
        </h3>
        <p style={{
          fontSize: theme.typography.sizes.sm,
          color: theme.colors.text.secondary,
          margin: "0 0 10px 0"
        }}>
          For development purposes only. Load sample restaurant data.
        </p>
        <motion.button 
          onClick={handleLoadDemoData}
          whileTap={{ scale: 0.95 }}
          disabled={loading}
          style={{
            backgroundColor: theme.colors.secondary,
            color: "white",
            border: "none",
            padding: "10px 20px",
            width: "100%",
            borderRadius: theme.borderRadius.md,
            fontWeight: theme.typography.fontWeights.semibold,
            cursor: loading ? "wait" : "pointer"
          }}
        >
          {loading ? "Loading..." : "Load Test Restaurant Data"}
        </motion.button>
      </div>
      
      {/* Error message */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            width: "100%",
            backgroundColor: "#FEE2E2",
            color: "#B91C1C",
            padding: "12px",
            borderRadius: theme.borderRadius.md,
            textAlign: "center",
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.fontWeights.medium
          }}
        >
          {error}
        </motion.div>
      )}
    </motion.div>
  );
};

export default QRCodeScanner;