import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { errorTracking, performance } from '../config/monitoring';
import logger from '../config/logger';

// Error types
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  DATABASE = 'DATABASE_ERROR',
  NETWORK = 'NETWORK_ERROR',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC_ERROR',
}

// Custom application error
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;
  public readonly requestId?: string;

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error response interface
interface ErrorResponse {
  error: {
    type: string;
    message: string;
    code?: string;
    details?: any;
    requestId?: string;
    timestamp: string;
  };
}

// Error handler middleware
export const errorHandlerMiddleware = () => {
  return async (request: NextRequest, error?: Error): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      // If no error provided, this is just a wrapper
      if (!error) {
        return NextResponse.next();
      }

      // Log the error
      await logError(error, request, requestId);

      // Track error metrics
      trackErrorMetrics(error, request);

      // Generate error response
      const errorResponse = generateErrorResponse(error, requestId);

      // Track performance
      const duration = Date.now() - startTime;
      performance.measureSync(
        `API ${request.method} ${request.nextUrl.pathname}`,
        () => duration
      );

      return errorResponse;

    } catch (handlerError) {
      // If error handler itself fails, return a basic error response
      logger.error('Error handler failed', {
        originalError: error?.message,
        handlerError: handlerError,
        requestId,
        url: request.url,
      });

      return new NextResponse(
        JSON.stringify({
          error: {
            type: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            requestId,
            timestamp: new Date().toISOString(),
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
};

// Log error with appropriate level and context
async function logError(error: Error, request: NextRequest, requestId: string): Promise<void> {
  const errorContext = {
    requestId,
    url: request.url,
    method: request.method,
    userAgent: request.headers.get('user-agent'),
    ip: getClientIP(request),
    timestamp: new Date().toISOString(),
  };

  if (error instanceof AppError) {
    const logLevel = getLogLevelForError(error);
    logger[logLevel](`${error.type}: ${error.message}`, {
      ...errorContext,
      type: error.type,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      context: error.context,
      stack: error.stack,
    });
  } else if (error instanceof ZodError) {
    logger.warn('Validation error', {
      ...errorContext,
      validationErrors: error.errors,
    });
  } else {
    logger.error('Unhandled error', {
      ...errorContext,
      error: error.message,
      stack: error.stack,
    });
  }
}

// Track error metrics
function trackErrorMetrics(error: Error, request: NextRequest): void {
  try {
    if (error instanceof AppError) {
      errorTracking.captureException(error, {
        tags: {
          errorType: error.type,
          statusCode: error.statusCode.toString(),
          isOperational: error.isOperational.toString(),
        },
        extra: {
          context: error.context,
          url: request.url,
          method: request.method,
        },
      });
    } else {
      errorTracking.captureException(error, {
        tags: {
          errorType: 'UNHANDLED',
        },
        extra: {
          url: request.url,
          method: request.method,
        },
      });
    }
  } catch (trackingError) {
    logger.error('Failed to track error metrics', { trackingError });
  }
}

// Generate error response
function generateErrorResponse(error: Error, requestId: string): NextResponse {
  let errorResponse: ErrorResponse;
  let statusCode: number;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorResponse = {
      error: {
        type: error.type,
        message: error.isOperational ? error.message : 'An internal error occurred',
        requestId,
        timestamp: error.timestamp.toISOString(),
        ...(error.isOperational && error.context && { details: error.context }),
      },
    };
  } else if (error instanceof ZodError) {
    statusCode = 400;
    errorResponse = {
      error: {
        type: ErrorType.VALIDATION,
        message: 'Validation failed',
        details: error.errors,
        requestId,
        timestamp: new Date().toISOString(),
      },
    };
  } else {
    statusCode = 500;
    errorResponse = {
      error: {
        type: ErrorType.INTERNAL,
        message: 'An unexpected error occurred',
        requestId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  return new NextResponse(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
    },
  });
}

// Get log level based on error type
function getLogLevelForError(error: AppError): 'error' | 'warn' | 'info' {
  if (!error.isOperational || error.statusCode >= 500) {
    return 'error';
  }
  if (error.statusCode >= 400) {
    return 'warn';
  }
  return 'info';
}

// Get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Predefined error creators
export const createValidationError = (message: string, details?: any) => 
  new AppError(ErrorType.VALIDATION, message, 400, true, details);

export const createAuthenticationError = (message: string = 'Authentication required') => 
  new AppError(ErrorType.AUTHENTICATION, message, 401, true);

export const createAuthorizationError = (message: string = 'Insufficient permissions') => 
  new AppError(ErrorType.AUTHORIZATION, message, 403, true);

export const createNotFoundError = (resource: string = 'Resource') => 
  new AppError(ErrorType.NOT_FOUND, `${resource} not found`, 404, true);

export const createRateLimitError = (message: string = 'Rate limit exceeded') => 
  new AppError(ErrorType.RATE_LIMIT, message, 429, true);

export const createInternalError = (message: string = 'Internal server error', context?: any) => 
  new AppError(ErrorType.INTERNAL, message, 500, false, context);

export const createExternalApiError = (service: string, message?: string) => 
  new AppError(
    ErrorType.EXTERNAL_API, 
    message || `External service ${service} is unavailable`, 
    502, 
    true,
    { service }
  );

export const createDatabaseError = (operation: string, details?: any) => 
  new AppError(
    ErrorType.DATABASE, 
    `Database operation failed: ${operation}`, 
    500, 
    false,
    { operation, details }
  );

export const createNetworkError = (message: string = 'Network error occurred') => 
  new AppError(ErrorType.NETWORK, message, 503, true);

export const createBusinessLogicError = (message: string, context?: any) => 
  new AppError(ErrorType.BUSINESS_LOGIC, message, 400, true, context);

// Error boundary for async operations
export const asyncErrorHandler = <T extends any[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      // Convert unknown errors to AppError
      throw createInternalError(
        'An unexpected error occurred',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  };
};

// Global error handler for unhandled promise rejections
export const setupGlobalErrorHandlers = () => {
  if (typeof process !== 'undefined') {
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        promise: promise.toString(),
      });
      
      errorTracking.captureException(
        reason instanceof Error ? reason : new Error(String(reason)),
        { tags: { type: 'unhandledRejection' } }
      );
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
      });
      
      errorTracking.captureException(error, {
        tags: { type: 'uncaughtException' }
      });
      
      // Graceful shutdown
      process.exit(1);
    });
  }
};

// Error recovery utilities
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  
  throw lastError!;
};

export default errorHandlerMiddleware;