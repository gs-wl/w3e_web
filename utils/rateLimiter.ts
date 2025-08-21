import logger from '../config/logger';
import { performance } from '../config/monitoring';
import { CryptoUtils } from './crypto';

// Rate limiter interfaces
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (identifier: string) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  enableLogging?: boolean;
  message?: string;
  statusCode?: number;
  headers?: boolean;
}

export interface RateLimitInfo {
  totalHits: number;
  totalRequests: number;
  remainingRequests: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  info: RateLimitInfo;
  error?: string;
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitInfo | null>;
  set(key: string, info: RateLimitInfo): Promise<void>;
  increment(key: string): Promise<RateLimitInfo>;
  reset(key: string): Promise<void>;
  cleanup(): Promise<void>;
}

export interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  allowedRequests: number;
  uniqueKeys: number;
  blockRate: number;
}

// Rate limit error class
export class RateLimitError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryAfter?: number,
    public info?: RateLimitInfo
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Memory store for rate limiting
export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitInfo>();
  private timers = new Map<string, NodeJS.Timeout>();

  async get(key: string): Promise<RateLimitInfo | null> {
    const info = this.store.get(key);
    
    if (!info) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > info.resetTime.getTime()) {
      this.store.delete(key);
      const timer = this.timers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(key);
      }
      return null;
    }
    
    return info;
  }

  async set(key: string, info: RateLimitInfo): Promise<void> {
    this.store.set(key, info);
    
    // Set cleanup timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    const timeout = setTimeout(() => {
      this.store.delete(key);
      this.timers.delete(key);
    }, info.resetTime.getTime() - Date.now());
    
    this.timers.set(key, timeout);
  }

  async increment(key: string): Promise<RateLimitInfo> {
    const existing = await this.get(key);
    
    if (existing) {
      existing.totalHits++;
      existing.totalRequests++;
      existing.remainingRequests = Math.max(0, existing.remainingRequests - 1);
      
      if (existing.remainingRequests === 0) {
        existing.retryAfter = Math.ceil((existing.resetTime.getTime() - Date.now()) / 1000);
      }
      
      await this.set(key, existing);
      return existing;
    }
    
    // This shouldn't happen if used correctly
    throw new Error('Cannot increment non-existent rate limit entry');
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, info] of this.store.entries()) {
      if (now > info.resetTime.getTime()) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      await this.reset(key);
    }
  }

  getSize(): number {
    return this.store.size;
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.store.clear();
    this.timers.clear();
  }
}

// Rate limiter class
export class RateLimiter {
  private config: Required<RateLimitConfig>;
  private store: RateLimitStore;
  private stats: RateLimitStats;

  constructor(
    config: RateLimitConfig,
    store: RateLimitStore = new MemoryRateLimitStore()
  ) {
    this.config = {
      keyGenerator: (id: string) => id,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      enableLogging: true,
      message: 'Too many requests',
      statusCode: 429,
      headers: true,
      ...config,
    };
    
    this.store = store;
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      allowedRequests: 0,
      uniqueKeys: 0,
      blockRate: 0,
    };

    // Start cleanup interval
    setInterval(() => {
      this.store.cleanup().catch(error => {
        logger.error('Rate limiter cleanup failed', { error });
      });
    }, 60000); // Cleanup every minute
  }

  /**
   * Check if request is allowed
   */
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const timer = performance.startTimer('rate_limit_check');
    
    try {
      const key = this.config.keyGenerator(identifier);
      const now = Date.now();
      const resetTime = new Date(now + this.config.windowMs);
      
      // Get existing rate limit info
      let info = await this.store.get(key);
      
      if (!info) {
        // First request for this key
        info = {
          totalHits: 1,
          totalRequests: 1,
          remainingRequests: this.config.maxRequests - 1,
          resetTime,
        };
        
        await this.store.set(key, info);
        this.updateStats(true, true);
        
        if (this.config.enableLogging) {
          logger.debug('Rate limit initialized', { key, info });
        }
        
        return {
          allowed: true,
          info,
        };
      }
      
      // Check if limit exceeded
      if (info.remainingRequests <= 0) {
        this.updateStats(false, false);
        
        if (this.config.enableLogging) {
          logger.warn('Rate limit exceeded', { key, info });
        }
        
        return {
          allowed: false,
          info,
          error: this.config.message,
        };
      }
      
      // Increment counter
      info = await this.store.increment(key);
      this.updateStats(true, false);
      
      if (this.config.enableLogging) {
        logger.debug('Rate limit checked', { key, info });
      }
      
      return {
        allowed: true,
        info,
      };
    } catch (error) {
      logger.error('Rate limit check failed', { error, identifier });
      
      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        info: {
          totalHits: 0,
          totalRequests: 0,
          remainingRequests: this.config.maxRequests,
          resetTime: new Date(Date.now() + this.config.windowMs),
        },
        error: 'Rate limiter error',
      };
    } finally {
      timer();
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async resetLimit(identifier: string): Promise<void> {
    try {
      const key = this.config.keyGenerator(identifier);
      await this.store.reset(key);
      
      if (this.config.enableLogging) {
        logger.info('Rate limit reset', { key });
      }
    } catch (error) {
      logger.error('Rate limit reset failed', { error, identifier });
      throw new RateLimitError(
        'Failed to reset rate limit',
        'RESET_ERROR'
      );
    }
  }

  /**
   * Get rate limit info for identifier
   */
  async getLimitInfo(identifier: string): Promise<RateLimitInfo | null> {
    try {
      const key = this.config.keyGenerator(identifier);
      return await this.store.get(key);
    } catch (error) {
      logger.error('Failed to get rate limit info', { error, identifier });
      return null;
    }
  }

  /**
   * Get rate limiter statistics
   */
  getStats(): RateLimitStats {
    return {
      ...this.stats,
      blockRate: this.stats.totalRequests > 0 
        ? this.stats.blockedRequests / this.stats.totalRequests 
        : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      allowedRequests: 0,
      uniqueKeys: 0,
      blockRate: 0,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clear all rate limits
   */
  async clearAll(): Promise<void> {
    try {
      if (this.store instanceof MemoryRateLimitStore) {
        this.store.clear();
      }
      
      this.resetStats();
      
      if (this.config.enableLogging) {
        logger.info('All rate limits cleared');
      }
    } catch (error) {
      logger.error('Failed to clear rate limits', { error });
      throw new RateLimitError(
        'Failed to clear rate limits',
        'CLEAR_ERROR'
      );
    }
  }

  /**
   * Update statistics
   */
  private updateStats(allowed: boolean, isNewKey: boolean): void {
    this.stats.totalRequests++;
    
    if (allowed) {
      this.stats.allowedRequests++;
    } else {
      this.stats.blockedRequests++;
    }
    
    if (isNewKey) {
      this.stats.uniqueKeys++;
    }
  }
}

// Rate limiter middleware factory
export class RateLimiterMiddleware {
  private rateLimiter: RateLimiter;

  constructor(config: RateLimitConfig, store?: RateLimitStore) {
    this.rateLimiter = new RateLimiter(config, store);
  }

  /**
   * Create Express middleware
   */
  createExpressMiddleware() {
    return async (req: any, res: any, next: any) => {
      try {
        // Generate identifier (IP address by default)
        const identifier = req.ip || req.connection.remoteAddress || 'unknown';
        
        // Check rate limit
        const result = await this.rateLimiter.checkLimit(identifier);
        
        // Set headers if enabled
        if (this.rateLimiter['config'].headers) {
          res.set({
            'X-RateLimit-Limit': this.rateLimiter['config'].maxRequests,
            'X-RateLimit-Remaining': result.info.remainingRequests,
            'X-RateLimit-Reset': result.info.resetTime.toISOString(),
          });
          
          if (result.info.retryAfter) {
            res.set('Retry-After', result.info.retryAfter);
          }
        }
        
        if (!result.allowed) {
          return res.status(this.rateLimiter['config'].statusCode).json({
            error: result.error,
            retryAfter: result.info.retryAfter,
          });
        }
        
        next();
      } catch (error) {
        logger.error('Rate limiter middleware error', { error });
        next(); // Fail open
      }
    };
  }

  /**
   * Get rate limiter instance
   */
  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }
}

// Rate limiter utilities
export class RateLimiterUtils {
  /**
   * Create IP-based rate limiter
   */
  static createIPRateLimiter(config: Omit<RateLimitConfig, 'keyGenerator'>): RateLimiter {
    return new RateLimiter({
      ...config,
      keyGenerator: (ip: string) => `ip:${ip}`,
    });
  }

  /**
   * Create user-based rate limiter
   */
  static createUserRateLimiter(config: Omit<RateLimitConfig, 'keyGenerator'>): RateLimiter {
    return new RateLimiter({
      ...config,
      keyGenerator: (userId: string) => `user:${userId}`,
    });
  }

  /**
   * Create API key-based rate limiter
   */
  static createAPIKeyRateLimiter(config: Omit<RateLimitConfig, 'keyGenerator'>): RateLimiter {
    return new RateLimiter({
      ...config,
      keyGenerator: (apiKey: string) => `api:${CryptoUtils.hash(apiKey)}`,
    });
  }

  /**
   * Create endpoint-specific rate limiter
   */
  static createEndpointRateLimiter(
    endpoint: string,
    config: Omit<RateLimitConfig, 'keyGenerator'>
  ): RateLimiter {
    return new RateLimiter({
      ...config,
      keyGenerator: (identifier: string) => `${endpoint}:${identifier}`,
    });
  }

  /**
   * Create sliding window rate limiter
   */
  static createSlidingWindowRateLimiter(
    config: RateLimitConfig,
    store?: RateLimitStore
  ): RateLimiter {
    // This is a simplified implementation
    // In production, you might want a more sophisticated sliding window
    return new RateLimiter(config, store);
  }

  /**
   * Create distributed rate limiter (placeholder)
   */
  static createDistributedRateLimiter(
    config: RateLimitConfig,
    redisClient?: any
  ): RateLimiter {
    // Placeholder for Redis-based distributed rate limiter
    // In production, implement RedisRateLimitStore
    return new RateLimiter(config);
  }

  /**
   * Calculate optimal window size
   */
  static calculateOptimalWindow(
    expectedRequestsPerSecond: number,
    burstTolerance: number = 2
  ): { windowMs: number; maxRequests: number } {
    // Simple calculation - in production, use more sophisticated algorithms
    const windowMs = 60000; // 1 minute
    const maxRequests = Math.ceil(expectedRequestsPerSecond * (windowMs / 1000) * burstTolerance);
    
    return { windowMs, maxRequests };
  }

  /**
   * Create adaptive rate limiter
   */
  static createAdaptiveRateLimiter(
    baseConfig: RateLimitConfig,
    adaptationRules: {
      increaseThreshold: number;
      decreaseThreshold: number;
      maxIncrease: number;
      maxDecrease: number;
    }
  ): RateLimiter {
    // Placeholder for adaptive rate limiting
    // In production, implement logic to adjust limits based on system load
    return new RateLimiter(baseConfig);
  }
}

// Pre-configured rate limiters
export const RateLimitPresets = {
  // Very strict - for sensitive operations
  strict: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many requests, please try again later',
  },

  // Moderate - for general API usage
  moderate: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Rate limit exceeded',
  },

  // Lenient - for public endpoints
  lenient: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    message: 'Rate limit exceeded',
  },

  // Login attempts
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many login attempts, please try again later',
    skipSuccessfulRequests: true,
  },

  // Password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset attempts',
  },

  // File upload
  fileUpload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Too many file uploads',
  },

  // Email sending
  email: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
    message: 'Email rate limit exceeded',
  },
};

export default RateLimiter;