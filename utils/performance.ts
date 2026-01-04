// Web Vitals Performance Monitoring Utility

/**
 * Core Web Vitals Metrics
 * - LCP (Largest Contentful Paint): Loading performance
 * - FID (First Input Delay): Interactivity
 * - CLS (Cumulative Layout Shift): Visual stability
 * - FCP (First Contentful Paint): Perceived load speed
 * - TTFB (Time to First Byte): Server response time
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface WebVitals {
  LCP?: PerformanceMetric;
  FID?: PerformanceMetric;
  CLS?: PerformanceMetric;
  FCP?: PerformanceMetric;
  TTFB?: PerformanceMetric;
  INP?: PerformanceMetric; // Interaction to Next Paint (new metric)
}

/**
 * Rating thresholds based on Web Vitals standards
 */
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },       // ms
  FID: { good: 100, poor: 300 },         // ms
  CLS: { good: 0.1, poor: 0.25 },        // score
  FCP: { good: 1800, poor: 3000 },       // ms
  TTFB: { good: 800, poor: 1800 },       // ms
  INP: { good: 200, poor: 500 },         // ms
} as const;

/**
 * Get rating for a metric value
 */
function getRating(
  name: keyof typeof THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Performance Observer for Web Vitals
 */
class PerformanceMonitor {
  private metrics: WebVitals = {};
  private observers: PerformanceObserver[] = [];
  private callbacks: Array<(metric: PerformanceMetric) => void> = [];

  constructor() {
    if (typeof window === 'undefined') return;
    this.initObservers();
  }

  /**
   * Initialize performance observers
   */
  private initObservers() {
    // Largest Contentful Paint (LCP)
    this.observeLCP();

    // First Input Delay (FID)
    this.observeFID();

    // Cumulative Layout Shift (CLS)
    this.observeCLS();

    // First Contentful Paint (FCP)
    this.observeFCP();

    // Time to First Byte (TTFB)
    this.observeTTFB();

    // Interaction to Next Paint (INP)
    this.observeINP();
  }

  /**
   * Observe Largest Contentful Paint
   */
  private observeLCP() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };

        const value = lastEntry.renderTime || lastEntry.loadTime || 0;
        const metric: PerformanceMetric = {
          name: 'LCP',
          value,
          rating: getRating('LCP', value),
          timestamp: Date.now(),
        };

        this.metrics.LCP = metric;
        this.notifyCallbacks(metric);
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.push(observer);
    } catch (error) {
      console.warn('LCP observer not supported:', error);
    }
  }

  /**
   * Observe First Input Delay
   */
  private observeFID() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0] as PerformanceEntry & { processingStart?: number };

        const value = firstEntry.processingStart ? firstEntry.processingStart - firstEntry.startTime : 0;
        const metric: PerformanceMetric = {
          name: 'FID',
          value,
          rating: getRating('FID', value),
          timestamp: Date.now(),
        };

        this.metrics.FID = metric;
        this.notifyCallbacks(metric);
      });

      observer.observe({ type: 'first-input', buffered: true });
      this.observers.push(observer);
    } catch (error) {
      console.warn('FID observer not supported:', error);
    }
  }

  /**
   * Observe Cumulative Layout Shift
   */
  private observeCLS() {
    try {
      let clsValue = 0;
      let clsEntries: PerformanceEntry[] = [];

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        for (const entry of entries) {
          const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };

          // Only count layout shifts without recent user input
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value || 0;
            clsEntries.push(entry);
          }
        }

        const metric: PerformanceMetric = {
          name: 'CLS',
          value: clsValue,
          rating: getRating('CLS', clsValue),
          timestamp: Date.now(),
        };

        this.metrics.CLS = metric;
        this.notifyCallbacks(metric);
      });

      observer.observe({ type: 'layout-shift', buffered: true });
      this.observers.push(observer);
    } catch (error) {
      console.warn('CLS observer not supported:', error);
    }
  }

  /**
   * Observe First Contentful Paint
   */
  private observeFCP() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint');

        if (fcpEntry) {
          const value = fcpEntry.startTime;
          const metric: PerformanceMetric = {
            name: 'FCP',
            value,
            rating: getRating('FCP', value),
            timestamp: Date.now(),
          };

          this.metrics.FCP = metric;
          this.notifyCallbacks(metric);
        }
      });

      observer.observe({ type: 'paint', buffered: true });
      this.observers.push(observer);
    } catch (error) {
      console.warn('FCP observer not supported:', error);
    }
  }

  /**
   * Observe Time to First Byte
   */
  private observeTTFB() {
    try {
      if ('navigation' in performance && 'getEntriesByType' in performance) {
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (navEntry) {
          const value = navEntry.responseStart - navEntry.requestStart;
          const metric: PerformanceMetric = {
            name: 'TTFB',
            value,
            rating: getRating('TTFB', value),
            timestamp: Date.now(),
          };

          this.metrics.TTFB = metric;
          this.notifyCallbacks(metric);
        }
      }
    } catch (error) {
      console.warn('TTFB measurement not supported:', error);
    }
  }

  /**
   * Observe Interaction to Next Paint (INP)
   */
  private observeINP() {
    try {
      let longestInteraction = 0;

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        for (const entry of entries) {
          const eventEntry = entry as PerformanceEntry & { processingStart?: number; processingEnd?: number };

          if (eventEntry.processingStart && eventEntry.processingEnd) {
            const interactionTime = eventEntry.processingEnd - eventEntry.startTime;
            longestInteraction = Math.max(longestInteraction, interactionTime);
          }
        }

        const metric: PerformanceMetric = {
          name: 'INP',
          value: longestInteraction,
          rating: getRating('INP', longestInteraction),
          timestamp: Date.now(),
        };

        this.metrics.INP = metric;
        this.notifyCallbacks(metric);
      });

      observer.observe({ type: 'event', buffered: true, durationThreshold: 0 });
      this.observers.push(observer);
    } catch (error) {
      console.warn('INP observer not supported:', error);
    }
  }

  /**
   * Subscribe to metric updates
   */
  public onMetric(callback: (metric: PerformanceMetric) => void) {
    this.callbacks.push(callback);
  }

  /**
   * Notify all callbacks of a new metric
   */
  private notifyCallbacks(metric: PerformanceMetric) {
    this.callbacks.forEach((callback) => {
      try {
        callback(metric);
      } catch (error) {
        console.error('Error in performance callback:', error);
      }
    });
  }

  /**
   * Get all collected metrics
   */
  public getMetrics(): WebVitals {
    return { ...this.metrics };
  }

  /**
   * Get a specific metric
   */
  public getMetric(name: keyof WebVitals): PerformanceMetric | undefined {
    return this.metrics[name];
  }

  /**
   * Log all metrics to console
   */
  public logMetrics() {
    console.group('📊 Web Vitals Performance');
    Object.entries(this.metrics).forEach(([name, metric]) => {
      const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
      console.log(`${emoji} ${name}: ${metric.value.toFixed(2)}ms (${metric.rating})`);
    });
    console.groupEnd();
  }

  /**
   * Send metrics to analytics endpoint
   */
  public async sendToAnalytics(endpoint: string) {
    try {
      const metrics = this.getMetrics();
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.error('Failed to send metrics to analytics:', error);
    }
  }

  /**
   * Cleanup observers
   */
  public disconnect() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.callbacks = [];
  }
}

/**
 * Singleton instance
 */
let performanceMonitor: PerformanceMonitor | null = null;

/**
 * Get or create performance monitor instance
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

/**
 * Hook for React components
 */
export function usePerformanceMonitor() {
  const monitor = getPerformanceMonitor();

  return {
    metrics: monitor.getMetrics(),
    getMetric: (name: keyof WebVitals) => monitor.getMetric(name),
    logMetrics: () => monitor.logMetrics(),
    sendToAnalytics: (endpoint: string) => monitor.sendToAnalytics(endpoint),
  };
}

/**
 * Initialize performance monitoring
 * Call this in your app entry point
 */
export function initPerformanceMonitoring(options?: {
  logToConsole?: boolean;
  sendToAnalytics?: string;
}) {
  const monitor = getPerformanceMonitor();

  if (options?.logToConsole) {
    // Log metrics when page is about to unload
    window.addEventListener('beforeunload', () => {
      monitor.logMetrics();
    });
  }

  if (options?.sendToAnalytics) {
    // Send metrics on visibility change (when user navigates away)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        monitor.sendToAnalytics(options.sendToAnalytics!);
      }
    });
  }

  return monitor;
}

/**
 * Measure custom performance marks
 */
export function measurePerformance(name: string, startMark?: string, endMark?: string) {
  try {
    if (startMark && endMark) {
      performance.measure(name, startMark, endMark);
    } else {
      performance.mark(name);
    }

    const entries = performance.getEntriesByName(name);
    const lastEntry = entries[entries.length - 1];

    return lastEntry ? lastEntry.duration || lastEntry.startTime : 0;
  } catch (error) {
    console.warn(`Performance measurement failed for ${name}:`, error);
    return 0;
  }
}

/**
 * Clear performance marks and measures
 */
export function clearPerformanceMarks(name?: string) {
  if (name) {
    performance.clearMarks(name);
    performance.clearMeasures(name);
  } else {
    performance.clearMarks();
    performance.clearMeasures();
  }
}
