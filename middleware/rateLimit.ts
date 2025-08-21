import { NextRequest, NextResponse } from 'next/server';
import { cache } from '../config/redis';
import { errorTracking } from '../config/monitoring';

interface RateLimitOptions {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (request: NextRequest) => void;
  whitelist?: string[];
  message?: string;
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
  remaining: number;
}

// Main rate limiting middleware
export const rateLimitMiddleware = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    onLimitReached,
    whitelist = [],
    message = 'Too many requests, please try again later.',
  } = options;

  return async (request: NextRequest): Promise<NextResponse | void> => {
    try {
      const key = keyGenerator(request);
      
      // Check if IP is whitelisted
      const clientIP = getClientIP(request);
      if (whitelist.includes(clientIP)) {
        return NextResponse.next();
      }

      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Get current rate limit info
      const rateLimitInfo = await getRateLimitInfo(key, windowStart, now);
      
      // Check if limit exceeded
      if (rateLimitInfo.count >= maxRequests) {
        if (onLimitReached) {
          onLimitReached(request);
        }
        
        errorTracking.captureMessage(
          `Rate limit exceeded for key: ${key}`,
          'warning',
          { key, count: rateLimitInfo.count, maxRequests }
        );
        
        return new NextResponse(
          JSON.stringify({ 
            error: message,
            retryAfter: Math.ceil((rateLimitInfo.resetTime - now) / 1000)
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': rateLimitInfo.resetTime.toString(),
              'Retry-After': Math.ceil((rateLimitInfo.resetTime - now) / 1000).toString(),
            },
          }
        );
      }

      // Increment counter
      await incrementRateLimit(key, windowStart, now, windowMs);
      
      // Add rate limit headers to response
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', (maxRequests - rateLimitInfo.count - 1).toString());
      response.headers.set('X-RateLimit-Reset', rateLimitInfo.resetTime.toString());
      
      return response;
      
    } catch (error) {
      errorTracking.captureException(error as Error, {
        context: 'rate-limit-middleware',
      });
      
      // On error, allow the request to proceed
      return NextResponse.next();
    }
  };
};

// Default key generator (IP-based)
function defaultKeyGenerator(request: NextRequest): string {
  const ip = getClientIP(request);
  return `rate_limit:${ip}`;
}

// User-based key generator
export function userKeyGenerator(request: NextRequest): string {
  const userId = request.headers.get('x-user-id');
  const ip = getClientIP(request);
  return userId ? `rate_limit:user:${userId}` : `rate_limit:ip:${ip}`;
}

// API key-based generator
export function apiKeyGenerator(request: NextRequest): string {
  const apiKey = request.headers.get('x-api-key');
  const ip = getClientIP(request);
  return apiKey ? `rate_limit:api:${apiKey}` : `rate_limit:ip:${ip}`;
}

// Endpoint-specific generator
export function endpointKeyGenerator(request: NextRequest): string {
  const ip = getClientIP(request);
  const pathname = request.nextUrl.pathname;
  return `rate_limit:${ip}:${pathname}`;
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
}

// Get rate limit info from cache
async function getRateLimitInfo(
  key: string, 
  windowStart: number, 
  now: number
): Promise<RateLimitInfo> {
  try {
    const data = await cache.get<{ count: number; resetTime: number }>(key);
    
    if (!data || data.resetTime <= now) {
      // No data or window expired
      return {
        count: 0,
        resetTime: now + (24 * 60 * 60 * 1000), // Default 24h window
        remaining: 0,
      };
    }
    
    return {
      count: data.count,
      resetTime: data.resetTime,
      remaining: Math.max(0, data.resetTime - now),
    };
  } catch (error) {
    // On cache error, return default values
    return {
      count: 0,
      resetTime: now + (24 * 60 * 60 * 1000),
      remaining: 0,
    };
  }
}

// Increment rate limit counter
async function incrementRateLimit(
  key: string,
  windowStart: number,
  now: number,
  windowMs: number
): Promise<void> {
  try {
    const resetTime = now + windowMs;
    const existing = await cache.get<{ count: number; resetTime: number }>(key);
    
    if (!existing || existing.resetTime <= now) {
      // New window
      await cache.set(key, { count: 1, resetTime }, Math.ceil(windowMs / 1000));
    } else {
      // Increment existing
      await cache.set(
        key, 
        { count: existing.count + 1, resetTime: existing.resetTime },
        Math.ceil((existing.resetTime - now) / 1000)
      );
    }
  } catch (error) {
    // Silently fail on cache errors
    console.error('Rate limit cache error:', error);
  }
}

// Predefined rate limit configurations
export const rateLimitConfigs = {
  // Strict rate limiting for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later.',
  },
  
  // General API rate limiting
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    keyGenerator: userKeyGenerator,
  },
  
  // Public endpoints (more lenient)
  public: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
  },
  
  // File upload endpoints
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    keyGenerator: userKeyGenerator,
    message: 'Upload limit exceeded, please try again later.',
  },
  
  // Password reset endpoints
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset attempts, please try again later.',
  },
  
  // Trading endpoints
  trading: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: userKeyGenerator,
    message: 'Trading rate limit exceeded, please slow down.',
  },
};

// Convenience functions for common rate limits
export const authRateLimit = () => rateLimitMiddleware(rateLimitConfigs.auth);
export const apiRateLimit = () => rateLimitMiddleware(rateLimitConfigs.api);
export const publicRateLimit = () => rateLimitMiddleware(rateLimitConfigs.public);
export const uploadRateLimit = () => rateLimitMiddleware(rateLimitConfigs.upload);
export const passwordResetRateLimit = () => rateLimitMiddleware(rateLimitConfigs.passwordReset);
export const tradingRateLimit = () => rateLimitMiddleware(rateLimitConfigs.trading);

// Burst protection middleware (allows short bursts but limits sustained traffic)
export const burstProtectionMiddleware = (options: {
  burstLimit: number;
  sustainedLimit: number;
  burstWindowMs: number;
  sustainedWindowMs: number;
}) => {
  const { burstLimit, sustainedLimit, burstWindowMs, sustainedWindowMs } = options;
  
  return async (request: NextRequest): Promise<NextResponse | void> => {
    const burstMiddleware = rateLimitMiddleware({
      windowMs: burstWindowMs,
      maxRequests: burstLimit,
      keyGenerator: (req) => `burst:${defaultKeyGenerator(req)}`,
    });
    
    const sustainedMiddleware = rateLimitMiddleware({
      windowMs: sustainedWindowMs,
      maxRequests: sustainedLimit,
      keyGenerator: (req) => `sustained:${defaultKeyGenerator(req)}`,
    });
    
    // Check burst limit first
    const burstResult = await burstMiddleware(request);
    if (burstResult && burstResult.status === 429) {
      return burstResult;
    }
    
    // Then check sustained limit
    const sustainedResult = await sustainedMiddleware(request);
    if (sustainedResult && sustainedResult.status === 429) {
      return sustainedResult;
    }
    
    return NextResponse.next();
  };
};

export default rateLimitMiddleware;