// Premium design tokens for OrderEase
export const theme = {
  colors: {
    // Rich primary color palette with elegant red tones
    primary: "#E03151", // Refined crimson red (was #FF4757)
    primaryDark: "#C41E3A", // Deeper crimson for emphasis
    primaryLight: "#F26D85", // Soft rose for subtle accents
    primaryGradient: "linear-gradient(135deg, #E03151 0%, #C41E3A 100%)",
    
    // Sophisticated secondary colors
    secondary: "#1E293B", // Deep navy blue (was #2E3A59)
    secondaryLight: "#334155", 
    secondaryDark: "#0F172A",
    secondaryGradient: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
    
    // Refined accent colors
    accent: "#E5A643", // Warm gold (was #FFBD59)
    accentDark: "#D4982A", 
    accentLight: "#F0C069",
    accentGradient: "linear-gradient(135deg, #E5A643 0%, #D4982A 100%)",
    
    // Status colors with richer tones
    success: "#10B981", // Emerald green (was #2ED573)
    successLight: "#34D399",
    successDark: "#059669",
    
    danger: "#EF4444", // Red (was #FF4757)
    dangerLight: "#F87171",
    dangerDark: "#DC2626",
    
    warning: "#F59E0B", // Amber (was #FFA502)
    warningLight: "#FBBF24",
    warningDark: "#D97706",
    
    info: "#3B82F6", // Royal blue (was #70A1FF)
    infoLight: "#60A5FA",
    infoDark: "#2563EB",

    // Sophisticated neutrals
    background: "#F8FAFC", // Light gray-blue background (slightly refined)
    backgroundAlt: "#F1F5F9", // Alternative background
    card: "#FFFFFF", // Card background
    cardElevated: "#FFFFFF",
    
    // Glass morphism effects
    glass: "rgba(255, 255, 255, 0.8)",
    glassDark: "rgba(15, 23, 42, 0.7)",
    
    // Text hierarchy
    text: {
      primary: "#1E293B", // Rich navy (was #2E3A59)
      secondary: "#64748B", // Refined medium slate (was #747D8C)
      muted: "#94A3B8", // Soft slate for tertiary text (was #A4B0BE)
      light: "#FFFFFF", // White text
      accent: "#E03151", // Accent text (matching primary)
    },
    
    // Refined borders and dividers
    border: "#E2E8F0", // Subtle border (was #E9EDF5)
    borderDark: "#CBD5E1",
    divider: "rgba(203, 213, 225, 0.5)",
    
    // Enhanced shadow colors
    shadow: {
      light: "rgba(15, 23, 42, 0.06)",
      medium: "rgba(15, 23, 42, 0.1)",
      dark: "rgba(15, 23, 42, 0.15)",
      colored: "rgba(224, 49, 81, 0.15)", // Shadow with primary color tint
    },
  },
  
  typography: {
    fontFamily: {
      primary: "'Inter', 'Outfit', sans-serif", // Modern, premium font
      display: "'Plus Jakarta Sans', 'Clash Display', sans-serif", // More distinctive for headers
      mono: "'JetBrains Mono', monospace", // For code and technical elements
    },
    fontWeights: {
      regular: 400,
      medium: 500, 
      semibold: 600,
      bold: 700,
      black: 900,
    },
    sizes: {
      xs: "0.75rem", // 12px
      sm: "0.875rem", // 14px
      md: "1rem", // 16px
      lg: "1.125rem", // 18px
      xl: "1.25rem", // 20px
      "2xl": "1.5rem", // 24px
      "3xl": "1.875rem", // 30px
      "4xl": "2.25rem", // 36px
      "5xl": "3rem", // 48px
      "6xl": "3.75rem", // 60px
    },
    letterSpacing: {
      tighter: "-0.05em",
      tight: "-0.025em",
      normal: "0",
      wide: "0.025em",
      wider: "0.05em",
      widest: "0.1em",
    },
    lineHeights: {
      none: "1",
      tight: "1.25",
      snug: "1.375",
      normal: "1.5",
      relaxed: "1.625",
      loose: "2",
    },
  },
  
  spacing: {
    xxs: "0.125rem", // 2px
    xs: "0.25rem", // 4px
    sm: "0.5rem", // 8px 
    md: "1rem", // 16px
    lg: "1.5rem", // 24px
    xl: "2rem", // 32px
    "2xl": "2.5rem", // 40px
    "3xl": "3rem", // 48px
    "4xl": "4rem", // 64px
    "5xl": "6rem", // 96px
  },
  
  borderRadius: {
    none: "0",
    xs: "0.25rem", // 4px
    sm: "0.5rem", // 8px
    md: "0.75rem", // 12px
    lg: "1rem", // 16px
    xl: "1.5rem", // 24px
    "2xl": "2rem", // 32px
    pill: "9999px",
    full: "50%",
  },
  
  shadows: {
    // Enhanced shadow system with more depth variations
    none: "none",
    inner: "inset 0 2px 4px 0 rgba(15, 23, 42, 0.05)",
    sm: "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
    md: "0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)",
    lg: "0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.05)",
    xl: "0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 10px 10px -5px rgba(15, 23, 42, 0.04)",
    "2xl": "0 25px 50px -12px rgba(15, 23, 42, 0.15)",
    // Colored shadows for emphasis
    primary: "0 8px 16px -4px rgba(224, 49, 81, 0.2)",
    success: "0 8px 16px -4px rgba(16, 185, 129, 0.2)",
    // Premium card effect with subtle dual-layered shadow
    card: "0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 20px rgba(15, 23, 42, 0.08)",
    // Floating effect for important elements
    float: "0 12px 28px rgba(15, 23, 42, 0.12), 0 2px 4px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.02)",
  },
  
  transitions: {
    fast: "0.15s cubic-bezier(0.4, 0, 0.2, 1)",
    medium: "0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "0.5s cubic-bezier(0.4, 0, 0.2, 1)",
    bounce: "0.5s cubic-bezier(0.34, 1.56, 0.64, 1)", // Premium bouncy effect
  },
  
  // New premium design features
  opacity: {
    0: "0",
    25: "0.25",
    50: "0.5",
    75: "0.75",
    100: "1",
  },
  
  // Z-index scale
  zIndex: {
    0: "0",
    10: "10", 
    20: "20",
    30: "30",
    40: "40",
    50: "50",
    auto: "auto",
    modal: "100",
    tooltip: "90",
    dropdown: "80",
  },
  
  // Glass effect properties
  glass: {
    background: "rgba(255, 255, 255, 0.7)",
    backgroundDark: "rgba(15, 23, 42, 0.75)",
    blur: "backdrop-filter: blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.125)",
  },
  
  // Premium layout aids
  container: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
};