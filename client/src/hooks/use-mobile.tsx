import { useState, useEffect } from "react";

// Define standard breakpoints
export const breakpoints = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export type Breakpoint = keyof typeof breakpoints | number;

// Enhanced hook that provides more detailed responsive information
export function useResponsive(breakpoint: Breakpoint = 'md') {
  const [state, setState] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    screenWidth: 0,
    breakpointValue: typeof breakpoint === 'number' ? breakpoint : breakpoints[breakpoint],
  });

  useEffect(() => {
    const breakpointValue = typeof breakpoint === 'number' ? breakpoint : breakpoints[breakpoint];
    
    const checkSize = () => {
      const width = window.innerWidth;
      setState({
        isMobile: width < breakpoints.sm,
        isTablet: width >= breakpoints.sm && width < breakpoints.lg,
        isDesktop: width >= breakpoints.lg,
        screenWidth: width,
        breakpointValue,
      });
    };

    // Check on initial load
    checkSize();

    // Check on resize with debouncing for better performance
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkSize, 100);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [breakpoint]);

  return state;
}

// Original hook for backward compatibility
export function useIsMobile(breakpoint: Breakpoint = 'md') {
  const { isMobile } = useResponsive(breakpoint);
  return isMobile;
}

// Alias for consistency - some components use useMobile instead of useIsMobile
export const useMobile = useIsMobile;

// Hook to get current breakpoint name
export function useBreakpoint() {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('md');
  
  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width < breakpoints.xs) return 'xs';
      if (width < breakpoints.sm) return 'sm';
      if (width < breakpoints.md) return 'md';
      if (width < breakpoints.lg) return 'lg';
      if (width < breakpoints.xl) return 'xl';
      return '2xl';
    };
    
    const updateBreakpoint = () => {
      setCurrentBreakpoint(checkBreakpoint());
    };
    
    // Initial check
    updateBreakpoint();
    
    // Add resize listener with debounce
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateBreakpoint, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return currentBreakpoint;
}