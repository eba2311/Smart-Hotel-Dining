import { useEffect, useRef } from 'react';

/**
 * Performance monitoring hook for tracking component render times
 * Usage: usePerformanceMonitor('ComponentName')
 */
export function usePerformanceMonitor(componentName) {
  const renderCount = useRef(0);
  const mountTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const now = performance.now();
    const renderTime = now - mountTime.current;

    if (import.meta.env.DEV) {
      console.log(`🚀 ${componentName} render #${renderCount.current} took ${renderTime.toFixed(2)}ms`);
    }

    // Warn about slow renders (> 16ms for 60fps)
    if (renderTime > 16) {
      console.warn(`⚠️ Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }

    mountTime.current = now;
  });

  return {
    renderCount: renderCount.current,
  };
}

/**
 * Memory monitoring hook
 * Usage: useMemoryMonitor()
 */
export function useMemoryMonitor() {
  useEffect(() => {
    if (!window.performance || !window.performance.memory) return;

    const checkMemory = () => {
      const memory = window.performance.memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
      const totalMB = Math.round(memory.totalJSHeapSize / 1048576);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576);

      if (import.meta.env.DEV) {
        console.log(`💾 Memory: ${usedMB}MB / ${totalMB}MB (Limit: ${limitMB}MB)`);
      }

      // Warn if memory usage is high (> 80% of limit)
      if (usedMB / limitMB > 0.8) {
        console.warn(`⚠️ High memory usage: ${usedMB}MB / ${limitMB}MB`);
      }
    };

    const interval = setInterval(checkMemory, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);
}

/**
 * Network monitoring hook
 * Usage: useNetworkMonitor()
 */
export function useNetworkMonitor(callback) {
  useEffect(() => {
    if (!navigator.connection) return;

    const updateNetworkInfo = () => {
      const connection = navigator.connection;
      const info = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };

      if (import.meta.env.DEV) {
        console.log('🌐 Network info:', info);
      }

      callback?.(info);
    };

    connection.addEventListener('change', updateNetworkInfo);
    updateNetworkInfo();

    return () => {
      connection.removeEventListener('change', updateNetworkInfo);
    };
  }, [callback]);
}