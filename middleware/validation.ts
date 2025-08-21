import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema, ZodError } from 'zod';
import { errorTracking } from '../config/monitoring';

// Validation middleware options
interface ValidationOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
  sanitize?: boolean;
  stripUnknown?: boolean;
  onError?: (error: ValidationError, request: NextRequest) => NextResponse;
}

// Custom validation error
export class ValidationError extends Error {
  public readonly field: string;
  public readonly code: string;
  public readonly details: any;

  constructor(field: string, code: string, message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
    this.details = details;
  }
}

// Main validation middleware
export const validationMiddleware = (options: ValidationOptions) => {
  const {
    body,
    query,
    params,
    headers,
    sanitize = true,
    stripUnknown = true,
    onError = defaultErrorHandler,
  } = options;

  return async (request: NextRequest): Promise<NextResponse | void> => {
    try {
      const validatedData: any = {};

      // Validate request body
      if (body && request.method !== 'GET' && request.method !== 'HEAD') {
        try {
          const bodyData = await request.json();
          validatedData.body = await validateSchema(body, bodyData, 'body', { stripUnknown });
        } catch (error) {
          if (error instanceof SyntaxError) {
            throw new ValidationError('body', 'INVALID_JSON', 'Invalid JSON in request body');
          }
          throw error;
        }
      }

      // Validate query parameters
      if (query) {
        const queryData = Object.fromEntries(request.nextUrl.searchParams.entries());
        validatedData.query = await validateSchema(query, queryData, 'query', { stripUnknown });
      }

      // Validate URL parameters (if provided)
      if (params) {
        // Extract params from URL (this would need to be implemented based on your routing)
        const paramsData = extractParamsFromUrl(request.nextUrl.pathname);
        validatedData.params = await validateSchema(params, paramsData, 'params', { stripUnknown });
      }

      // Validate headers
      if (headers) {
        const headersData = Object.fromEntries(request.headers.entries());
        validatedData.headers = await validateSchema(headers, headersData, 'headers', { stripUnknown });
      }

      // Sanitize data if requested
      if (sanitize) {
        sanitizeData(validatedData);
      }

      // Attach validated data to request (for use in API handlers)
      const response = NextResponse.next();
      response.headers.set('x-validated-data', JSON.stringify(validatedData));
      
      return response;

    } catch (error) {
      if (error instanceof ValidationError) {
        return onError(error, request);
      }
      
      if (error instanceof ZodError) {
        const validationError = new ValidationError(
          'validation',
          'SCHEMA_VALIDATION_FAILED',
          'Request validation failed',
          error.errors
        );
        return onError(validationError, request);
      }

      // Log unexpected errors
      errorTracking.captureException(error as Error, {
        context: 'validation-middleware',
        url: request.url,
        method: request.method,
      });

      return new NextResponse(
        JSON.stringify({ error: 'Internal validation error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
};

// Validate data against schema
async function validateSchema(
  schema: ZodSchema,
  data: any,
  field: string,
  options: { stripUnknown?: boolean } = {}
): Promise<any> {
  try {
    if (options.stripUnknown && schema instanceof z.ZodObject) {
      return schema.strip().parse(data);
    }
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(
        field,
        'SCHEMA_VALIDATION_FAILED',
        `Validation failed for ${field}`,
        error.errors
      );
    }
    throw error;
  }
}

// Default error handler
function defaultErrorHandler(error: ValidationError, request: NextRequest): NextResponse {
  const status = getStatusCodeForError(error.code);
  
  return new NextResponse(
    JSON.stringify({
      error: error.message,
      field: error.field,
      code: error.code,
      details: error.details,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Get appropriate status code for error
function getStatusCodeForError(code: string): number {
  switch (code) {
    case 'INVALID_JSON':
    case 'SCHEMA_VALIDATION_FAILED':
    case 'REQUIRED_FIELD_MISSING':
    case 'INVALID_FORMAT':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    default:
      return 400;
  }
}

// Extract params from URL (basic implementation)
function extractParamsFromUrl(pathname: string): Record<string, string> {
  // This is a simplified implementation
  // In a real app, you'd use your router's param extraction logic
  const segments = pathname.split('/').filter(Boolean);
  const params: Record<string, string> = {};
  
  // Example: /api/users/[id] -> { id: 'value' }
  // This would need to be implemented based on your routing structure
  
  return params;
}

// Sanitize data to prevent XSS and other attacks
function sanitizeData(data: any): void {
  if (typeof data === 'string') {
    // Basic HTML sanitization
    data = data
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  } else if (Array.isArray(data)) {
    data.forEach(sanitizeData);
  } else if (data && typeof data === 'object') {
    Object.values(data).forEach(sanitizeData);
  }
}

// Common validation schemas
export const commonSchemas = {
  // User schemas
  userRegistration: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    acceptTerms: z.boolean().refine(val => val === true, 'Must accept terms'),
  }),

  userLogin: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
  }),

  userUpdate: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    avatar: z.string().url().optional(),
  }),

  // Asset schemas
  assetCreate: z.object({
    name: z.string().min(1, 'Asset name is required'),
    symbol: z.string().min(1, 'Asset symbol is required'),
    description: z.string().optional(),
    totalSupply: z.number().positive('Total supply must be positive'),
    decimals: z.number().int().min(0).max(18),
    metadata: z.record(z.any()).optional(),
  }),

  // Transaction schemas
  transaction: z.object({
    to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
    amount: z.string().regex(/^\d+(\.\d+)?$/, 'Invalid amount format'),
    gasLimit: z.number().int().positive().optional(),
    gasPrice: z.string().optional(),
  }),

  // Query parameter schemas
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).refine(n => n > 0).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).refine(n => n > 0 && n <= 100).optional(),
    sort: z.enum(['asc', 'desc']).optional(),
    sortBy: z.string().optional(),
  }),

  // ID parameter
  idParam: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),

  // Search query
  searchQuery: z.object({
    q: z.string().min(1, 'Search query is required'),
    category: z.string().optional(),
    tags: z.string().optional(),
  }),

  // File upload
  fileUpload: z.object({
    filename: z.string().min(1, 'Filename is required'),
    contentType: z.string().min(1, 'Content type is required'),
    size: z.number().positive('File size must be positive'),
  }),

  // API key headers
  apiKeyHeaders: z.object({
    'x-api-key': z.string().min(1, 'API key is required'),
    'x-api-version': z.string().optional(),
  }),

  // Wallet connection
  walletConnect: z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
    signature: z.string().min(1, 'Signature is required'),
    message: z.string().min(1, 'Message is required'),
    chainId: z.number().int().positive(),
  }),
};

// Convenience validation functions
export const validateUserRegistration = () => 
  validationMiddleware({ body: commonSchemas.userRegistration });

export const validateUserLogin = () => 
  validationMiddleware({ body: commonSchemas.userLogin });

export const validateUserUpdate = () => 
  validationMiddleware({ body: commonSchemas.userUpdate });

export const validateAssetCreate = () => 
  validationMiddleware({ body: commonSchemas.assetCreate });

export const validateTransaction = () => 
  validationMiddleware({ body: commonSchemas.transaction });

export const validatePagination = () => 
  validationMiddleware({ query: commonSchemas.pagination });

export const validateIdParam = () => 
  validationMiddleware({ params: commonSchemas.idParam });

export const validateSearchQuery = () => 
  validationMiddleware({ query: commonSchemas.searchQuery });

export const validateApiKeyHeaders = () => 
  validationMiddleware({ headers: commonSchemas.apiKeyHeaders });

export const validateWalletConnect = () => 
  validationMiddleware({ body: commonSchemas.walletConnect });

// Utility function to get validated data from request
export function getValidatedData(request: NextRequest): any {
  const validatedDataHeader = request.headers.get('x-validated-data');
  if (validatedDataHeader) {
    try {
      return JSON.parse(validatedDataHeader);
    } catch {
      return {};
    }
  }
  return {};
}

// Custom validation decorators for specific use cases
export const createCustomValidator = (schema: ZodSchema, field: 'body' | 'query' | 'params' | 'headers') => {
  return validationMiddleware({ [field]: schema });
};

export default validationMiddleware;