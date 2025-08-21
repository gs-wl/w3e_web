interface MonitoringConfig {
  sentry: {
    dsn: string;
    environment: string;
    tracesSampleRate: number;
    profilesSampleRate: number;
    beforeSend?: (event: any) => any;
  };
  analytics: {
    googleAnalyticsId?: string;
    mixpanelToken?: string;
    enabled: boolean;
  };
  healthCheck: {
    enabled: boolean;
    interval: number;
    timeout: number;
    endpoints: string[];
  };
  metrics: {
    enabled: boolean;
    port: number;
    path: string;
  };
}

const getMonitoringConfig = (): MonitoringConfig => {
  const environment = process.env.NODE_ENV || 'development';
  const envType = environment as 'development' | 'production' | 'test' | 'staging';
  
  const baseConfig: MonitoringConfig = {
    sentry: {
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
      environment: envType,
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1,
      beforeSend: (event: any) => {
        // Filter out sensitive data
        if (event.exception) {
          const exception = event.exception.values[0];
          if (exception.stacktrace) {
            exception.stacktrace.frames = exception.stacktrace.frames.map((frame: any) => {
              // Remove sensitive file paths
              if (frame.filename) {
                frame.filename = frame.filename.replace(/\/Users\/[^/]+/, '/Users/***');
              }
              return frame;
            });
          }
        }
        return event;
      },
    },
    analytics: {
      googleAnalyticsId: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
      mixpanelToken: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
      enabled: envType === 'production',
    },
    healthCheck: {
      enabled: true,
      interval: 30000, // 30 seconds
      timeout: 5000,   // 5 seconds
      endpoints: ['/api/health', '/api/status'],
    },
    metrics: {
      enabled: envType !== 'development',
      port: parseInt(process.env.METRICS_PORT || '9090'),
      path: '/metrics',
    },
  };

  switch (envType) {
    case 'production':
      return {
        ...baseConfig,
        sentry: {
          ...baseConfig.sentry,
          tracesSampleRate: 0.05, // Lower sampling in production
          profilesSampleRate: 0.05,
        },
        healthCheck: {
          ...baseConfig.healthCheck,
          interval: 60000, // 1 minute in production
        },
      };
    
    case 'staging':
      return {
        ...baseConfig,
        sentry: {
          ...baseConfig.sentry,
          tracesSampleRate: 0.2,
          profilesSampleRate: 0.1,
        },
      };
    
    case 'test':
      return {
        ...baseConfig,
        sentry: {
          ...baseConfig.sentry,
          dsn: '', // Disable Sentry in tests
          tracesSampleRate: 0,
          profilesSampleRate: 0,
        },
        analytics: {
          ...baseConfig.analytics,
          enabled: false,
        },
        healthCheck: {
          ...baseConfig.healthCheck,
          enabled: false,
        },
        metrics: {
          ...baseConfig.metrics,
          enabled: false,
        },
      };
    
    default: // development
      return {
        ...baseConfig,
        sentry: {
          ...baseConfig.sentry,
          tracesSampleRate: 1.0, // Full sampling in development
          profilesSampleRate: 1.0,
        },
        analytics: {
          ...baseConfig.analytics,
          enabled: false,
        },
      };
  }
};

// Performance monitoring utilities
export const performance = {
  startTimer: (label: string): (() => number) => {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      console.log(`[PERF] ${label}: ${duration}ms`);
      return duration;
    };
  },

  measureAsync: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const endTimer = performance.startTimer(label);
    try {
      const result = await fn();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      throw error;
    }
  },

  measureSync: <T>(label: string, fn: () => T): T => {
    const endTimer = performance.startTimer(label);
    try {
      const result = fn();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      throw error;
    }
  },
};

// Error tracking utilities
export const errorTracking = {
  captureException: (error: Error, context?: Record<string, any>) => {
    const config = getMonitoringConfig();
    if (config.sentry.dsn) {
      // Sentry integration would go here
      console.error('[ERROR]', error.message, { error, context });
    } else {
      console.error('[ERROR]', error.message, { error, context });
    }
  },

  captureMessage: (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) => {
    const config = getMonitoringConfig();
    if (config.sentry.dsn) {
      // Sentry integration would go here
      console.log(`[${level.toUpperCase()}]`, message, context);
    } else {
      console.log(`[${level.toUpperCase()}]`, message, context);
    }
  },

  addBreadcrumb: (message: string, category: string, data?: Record<string, any>) => {
    const config = getMonitoringConfig();
    if (config.sentry.dsn) {
      // Sentry breadcrumb would go here
      console.debug('[BREADCRUMB]', category, message, data);
    }
  },
};

// Analytics utilities
export const analytics = {
  track: (event: string, properties?: Record<string, any>) => {
    const config = getMonitoringConfig();
    if (!config.analytics.enabled) return;
    
    // Google Analytics tracking
    if (config.analytics.googleAnalyticsId && typeof window !== 'undefined') {
      // gtag implementation would go here
      console.log('[ANALYTICS] GA Event:', event, properties);
    }
    
    // Mixpanel tracking
    if (config.analytics.mixpanelToken && typeof window !== 'undefined') {
      // Mixpanel implementation would go here
      console.log('[ANALYTICS] Mixpanel Event:', event, properties);
    }
  },

  identify: (userId: string, traits?: Record<string, any>) => {
    const config = getMonitoringConfig();
    if (!config.analytics.enabled) return;
    
    console.log('[ANALYTICS] Identify:', userId, traits);
  },

  page: (name: string, properties?: Record<string, any>) => {
    const config = getMonitoringConfig();
    if (!config.analytics.enabled) return;
    
    console.log('[ANALYTICS] Page View:', name, properties);
  },
};

// Health check utilities
export const healthCheck = {
  checkEndpoint: async (url: string, timeout: number = 5000): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  getSystemHealth: async (): Promise<{
    status: 'healthy' | 'unhealthy';
    checks: Record<string, boolean>;
    timestamp: string;
  }> => {
    const config = getMonitoringConfig();
    const checks: Record<string, boolean> = {};
    
    for (const endpoint of config.healthCheck.endpoints) {
      const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${endpoint}`;
      checks[endpoint] = await healthCheck.checkEndpoint(url, config.healthCheck.timeout);
    }
    
    const allHealthy = Object.values(checks).every(Boolean);
    
    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    };
  },
};

export default getMonitoringConfig;