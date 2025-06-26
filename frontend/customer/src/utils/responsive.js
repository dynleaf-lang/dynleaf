// Responsive utilities for OrderEase application
// This file provides consistent breakpoints and responsive helpers
import React from 'react';

// Standard breakpoints (in px)
export const breakpoints = {
  xs: 0,      // Extra small devices (phones, 0px and up)
  sm: 576,    // Small devices (phones, 576px and up)
  md: 768,    // Medium devices (tablets, 768px and up)
  lg: 992,    // Large devices (desktops, 992px and up)
  xl: 1200,   // Extra large devices (large desktops, 1200px and up)
  xxl: 1400   // Extra extra large devices (larger desktops, 1400px and up)
};

// Media query strings for use with CSS-in-JS libraries
export const mediaQueries = {
  xs: `@media (min-width: ${breakpoints.xs}px)`,
  sm: `@media (min-width: ${breakpoints.sm}px)`,
  md: `@media (min-width: ${breakpoints.md}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  xxl: `@media (min-width: ${breakpoints.xxl}px)`
};

// Helper hook to check current breakpoint
export const useBreakpoint = () => {
  const [windowWidth, setWindowWidth] = React.useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = React.useState(window.innerHeight);
  
  React.useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isXs: windowWidth >= breakpoints.xs && windowWidth < breakpoints.sm,
    isSm: windowWidth >= breakpoints.sm && windowWidth < breakpoints.md,
    isMd: windowWidth >= breakpoints.md && windowWidth < breakpoints.lg,
    isLg: windowWidth >= breakpoints.lg && windowWidth < breakpoints.xl,
    isXl: windowWidth >= breakpoints.xl && windowWidth < breakpoints.xxl,
    isXxl: windowWidth >= breakpoints.xxl,
    // Convenience helpers
    isMobile: windowWidth < breakpoints.md,
    isTablet: windowWidth >= breakpoints.md && windowWidth < breakpoints.lg,
    isDesktop: windowWidth >= breakpoints.lg,
    isMediumUp: windowWidth >= breakpoints.md, // Helper for md and up screens
    isLargeUp: windowWidth >= breakpoints.lg,  // Helper for lg and up screens
    windowWidth,
    windowHeight,
    // Layout helper
    orientation: windowWidth > windowHeight ? 'landscape' : 'portrait'
  };
};

// Responsive spacing scales (in rem)
export const spacing = {
  xs: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '0.75rem',  // 12px
    lg: '1rem',     // 16px
    xl: '1.5rem',   // 24px
    xxl: '2rem'     // 32px
  },
  sm: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.25rem',  // 20px
    xl: '1.75rem',  // 28px
    xxl: '2.25rem'  // 36px
  },
  md: {
    xs: '0.5rem',   // 8px
    sm: '0.75rem',  // 12px
    md: '1.25rem',  // 20px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    xxl: '2.5rem'   // 40px
  },
  lg: {
    xs: '0.5rem',   // 8px
    sm: '1rem',     // 16px
    md: '1.5rem',   // 24px
    lg: '2rem',     // 32px
    xl: '2.5rem',   // 40px
    xxl: '3rem'     // 48px
  }
};

// Helper for responsive font sizes
export const fontSize = {
  xs: {
    small: '0.75rem',    // 12px
    base: '0.875rem',    // 14px
    large: '1rem',       // 16px
    h1: '1.5rem',        // 24px
    h2: '1.25rem',       // 20px
    h3: '1.125rem',      // 18px
    h4: '1rem',          // 16px
    h5: '0.875rem'       // 14px
  },
  sm: {
    small: '0.75rem',    // 12px
    base: '0.875rem',    // 14px
    large: '1rem',       // 16px
    h1: '1.75rem',       // 28px
    h2: '1.5rem',        // 24px
    h3: '1.25rem',       // 20px
    h4: '1.125rem',      // 18px
    h5: '1rem'           // 16px
  },
  md: {
    small: '0.875rem',   // 14px
    base: '1rem',        // 16px
    large: '1.125rem',   // 18px
    h1: '2rem',          // 32px
    h2: '1.75rem',       // 28px
    h3: '1.5rem',        // 24px
    h4: '1.25rem',       // 20px
    h5: '1.125rem'       // 18px
  },
  lg: {
    small: '0.875rem',   // 14px
    base: '1rem',        // 16px
    large: '1.25rem',    // 20px
    h1: '2.5rem',        // 40px
    h2: '2rem',          // 32px
    h3: '1.75rem',       // 28px
    h4: '1.5rem',        // 24px
    h5: '1.25rem'        // 20px
  }
};

// Container max widths for different breakpoints
export const containerMaxWidth = {
  sm: '540px',
  md: '720px',
  lg: '960px',
  xl: '1140px',
  xxl: '1320px'
};