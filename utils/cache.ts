import logger from '../config/logger';
import { performance } from '../config/monitoring';

// Cache interfaces
export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  checkPeriod: number;
  enableStats: boolean;
}

export interface CacheItem<T> {
  value: T;
  ttl: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  size: number;
  hitRate: number;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  priority?: number;
}

// Cache error class
export class CacheError extends Error {
  constructor(
    message: string,
    public code: string,
    public operation?: string
  ) {
    super(message);
    this.name = 'CacheError';
  }
}

// Memory cache implementation
export class MemoryCache<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private timers = new Map<string, NodeJS.Timeout>();
  private stats: CacheStats;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 300000, // 5 minutes
      maxSize: 1000,
      checkPeriod: 60000, // 1 minute
      enableStats: true,
      ...config,
    };

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      size: 0,
      hitRate: 0,
    };

    // Start cleanup interval
    if (this.config.checkPeriod > 0) {
      setInterval(() => this.cleanup(), this.config.checkPeriod);
    }
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const timer = performance.startTimer('cache_get');
    
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        this.updateStats('miss');
        return undefined;
      }

      // Check if expired
      if (Date.now() > item.ttl) {
        this.delete(key);
        this.updateStats('miss');
        return undefined;
      }

      // Update access info
      item.accessCount++;
      item.lastAccessed = Date.now();
      
      this.updateStats('hit');
      return item.value;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      throw new CacheError(
        `Failed to get cache item: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CACHE_GET_ERROR',
        'get'
      );
    } finally {
      timer();
    }
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, options: CacheOptions = {}): void {
    const timer = performance.startTimer('cache_set');
    
    try {
      // Check size limit
      if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
        this.evictLRU();
      }

      const ttl = Date.now() + (options.ttl || this.config.defaultTTL);
      const item: CacheItem<T> = {
        value,
        ttl,
        createdAt: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
      };

      // Clear existing timer
      const existingTimer = this.timers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer for expiration
      const timeout = setTimeout(() => {
        this.delete(key);
      }, options.ttl || this.config.defaultTTL);

      this.cache.set(key, item);
      this.timers.set(key, timeout);
      
      this.updateStats('set');
    } catch (error) {
      logger.error('Cache set error', { key, error });
      throw new CacheError(
        `Failed to set cache item: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CACHE_SET_ERROR',
        'set'
      );
    } finally {
      timer();
    }
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const timer = performance.startTimer('cache_delete');
    
    try {
      const existed = this.cache.has(key);
      
      if (existed) {
        this.cache.delete(key);
        
        const timeout = this.timers.get(key);
        if (timeout) {
          clearTimeout(timeout);
          this.timers.delete(key);
        }
        
        this.updateStats('delete');
      }
      
      return existed;
    } catch (error) {
      logger.error('Cache delete error', { key, error });
      throw new CacheError(
        `Failed to delete cache item: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CACHE_DELETE_ERROR',
        'delete'
      );
    } finally {
      timer();
    }
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check if expired
    if (Date.now() > item.ttl) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    try {
      // Clear all timers
      for (const timeout of this.timers.values()) {
        clearTimeout(timeout);
      }
      
      this.cache.clear();
      this.timers.clear();
      
      // Reset stats
      this.stats.size = 0;
    } catch (error) {
      logger.error('Cache clear error', { error });
      throw new CacheError(
        `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CACHE_CLEAR_ERROR',
        'clear'
      );
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalOperations = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: totalOperations > 0 ? this.stats.hits / totalOperations : 0,
    };
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.ttl) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.delete(key);
    }
    
    if (expiredKeys.length > 0) {
      logger.debug('Cache cleanup completed', { expiredCount: expiredKeys.length });
    }
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      this.updateStats('eviction');
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(operation: 'hit' | 'miss' | 'set' | 'delete' | 'eviction'): void {
    if (!this.config.enableStats) return;
    
    switch (operation) {
      case 'hit':
        this.stats.hits++;
        break;
      case 'miss':
        this.stats.misses++;
        break;
      case 'set':
        this.stats.sets++;
        break;
      case 'delete':
        this.stats.deletes++;
        break;
      case 'eviction':
        this.stats.evictions++;
        break;
    }
  }
}

// Cache manager for multiple cache instances
export class CacheManager {
  private caches = new Map<string, MemoryCache>();
  private defaultConfig: CacheConfig;

  constructor(defaultConfig: Partial<CacheConfig> = {}) {
    this.defaultConfig = {
      defaultTTL: 300000,
      maxSize: 1000,
      checkPeriod: 60000,
      enableStats: true,
      ...defaultConfig,
    };
  }

  /**
   * Get or create cache instance
   */
  getCache<T = any>(name: string, config?: Partial<CacheConfig>): MemoryCache<T> {
    if (!this.caches.has(name)) {
      const cacheConfig = { ...this.defaultConfig, ...config };
      this.caches.set(name, new MemoryCache<T>(cacheConfig));
    }
    
    return this.caches.get(name) as MemoryCache<T>;
  }

  /**
   * Remove cache instance
   */
  removeCache(name: string): boolean {
    const cache = this.caches.get(name);
    if (cache) {
      cache.clear();
      this.caches.delete(name);
      return true;
    }
    return false;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * Get stats for all caches
   */
  getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    
    return stats;
  }

  /**
   * Get list of cache names
   */
  getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }
}

// Cache decorators
export function Cacheable(options: CacheOptions & { cacheName?: string; keyGenerator?: (...args: any[]) => string } = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cacheName = options.cacheName || `${target.constructor.name}_${propertyName}`;
    
    descriptor.value = async function (...args: any[]) {
      const cache = cacheManager.getCache(cacheName);
      const key = options.keyGenerator ? options.keyGenerator(...args) : JSON.stringify(args);
      
      // Try to get from cache
      const cached = cache.get(key);
      if (cached !== undefined) {
        return cached;
      }
      
      // Execute method and cache result
      const result = await method.apply(this, args);
      cache.set(key, result, options);
      
      return result;
    };
    
    return descriptor;
  };
}

// Cache utilities
export class CacheUtils {
  /**
   * Generate cache key from object
   */
  static generateKey(prefix: string, data: any): string {
    const hash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
    return `${prefix}:${hash}`;
  }

  /**
   * Create cache key with namespace
   */
  static createNamespacedKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  /**
   * Parse cache key
   */
  static parseKey(key: string): { namespace?: string; key: string } {
    const parts = key.split(':');
    if (parts.length > 1) {
      return {
        namespace: parts[0],
        key: parts.slice(1).join(':'),
      };
    }
    return { key };
  }

  /**
   * Serialize value for caching
   */
  static serialize(value: any): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      throw new CacheError(
        `Failed to serialize value: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SERIALIZATION_ERROR'
      );
    }
  }

  /**
   * Deserialize cached value
   */
  static deserialize<T = any>(value: string): T {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new CacheError(
        `Failed to deserialize value: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DESERIALIZATION_ERROR'
      );
    }
  }
}

// Default cache manager instance
export const cacheManager = new CacheManager();

// Default cache instance
export const defaultCache = cacheManager.getCache('default');

export default CacheUtils;