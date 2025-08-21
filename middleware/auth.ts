import { NextRequest, NextResponse } from 'next/server';
import { jwt } from '../config/security';
import { errorTracking } from '../config/monitoring';

interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    role: string;
    walletAddress?: string;
  };
}

export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
  skipPaths?: string[];
}

// JWT Authentication Middleware
export const authMiddleware = (options: AuthMiddlewareOptions = {}) => {
  return async (request: NextRequest): Promise<NextResponse | void> => {
    const { required = true, roles = [], skipPaths = [] } = options;
    
    // Skip authentication for certain paths
    const pathname = request.nextUrl.pathname;
    if (skipPaths.some(path => pathname.startsWith(path))) {
      return NextResponse.next();
    }

    try {
      // Extract token from Authorization header or cookies
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ') 
        ? authHeader.substring(7)
        : request.cookies.get('auth-token')?.value;

      if (!token) {
        if (required) {
          return new NextResponse(
            JSON.stringify({ error: 'Authentication required' }),
            { 
              status: 401, 
              headers: { 'Content-Type': 'application/json' } 
            }
          );
        }
        return NextResponse.next();
      }

      // Verify JWT token
      const payload = await jwt.verify(token);
      
      if (!payload || !payload.sub) {
        return new NextResponse(
          JSON.stringify({ error: 'Invalid token' }),
          { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }

      // Check role-based access
      if (roles.length > 0 && !roles.includes(payload.role)) {
        return new NextResponse(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { 
            status: 403, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }

      // Add user info to request headers for downstream handlers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.sub);
      requestHeaders.set('x-user-email', payload.email || '');
      requestHeaders.set('x-user-role', payload.role || 'user');
      if (payload.walletAddress) {
        requestHeaders.set('x-wallet-address', payload.walletAddress);
      }

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

    } catch (error) {
      errorTracking.captureException(error as Error, {
        context: 'auth-middleware',
        path: pathname,
      });

      return new NextResponse(
        JSON.stringify({ error: 'Authentication failed' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  };
};

// Admin-only middleware
export const adminMiddleware = () => {
  return authMiddleware({
    required: true,
    roles: ['admin', 'super_admin'],
  });
};

// API Key Authentication Middleware
export const apiKeyMiddleware = (validApiKeys: string[] = []) => {
  return async (request: NextRequest): Promise<NextResponse | void> => {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return new NextResponse(
        JSON.stringify({ error: 'API key required' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    const envApiKeys = process.env.API_KEYS?.split(',') || [];
    const allValidKeys = [...validApiKeys, ...envApiKeys];
    
    if (!allValidKeys.includes(apiKey)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid API key' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    return NextResponse.next();
  };
};

// Wallet Authentication Middleware (for Web3 authentication)
export const walletAuthMiddleware = () => {
  return async (request: NextRequest): Promise<NextResponse | void> => {
    try {
      const walletAddress = request.headers.get('x-wallet-address');
      const signature = request.headers.get('x-wallet-signature');
      const message = request.headers.get('x-wallet-message');
      
      if (!walletAddress || !signature || !message) {
        return new NextResponse(
          JSON.stringify({ error: 'Wallet authentication required' }),
          { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }

      // Here you would verify the wallet signature
      // This is a placeholder - implement actual signature verification
      const isValidSignature = await verifyWalletSignature(walletAddress, message, signature);
      
      if (!isValidSignature) {
        return new NextResponse(
          JSON.stringify({ error: 'Invalid wallet signature' }),
          { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }

      // Add wallet info to request headers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-authenticated-wallet', walletAddress);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

    } catch (error) {
      errorTracking.captureException(error as Error, {
        context: 'wallet-auth-middleware',
      });

      return new NextResponse(
        JSON.stringify({ error: 'Wallet authentication failed' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  };
};

// Placeholder for wallet signature verification
// In a real implementation, you would use a library like ethers.js
async function verifyWalletSignature(
  address: string, 
  message: string, 
  signature: string
): Promise<boolean> {
  // Placeholder implementation
  // In production, use ethers.js or similar:
  // const recoveredAddress = ethers.utils.verifyMessage(message, signature);
  // return recoveredAddress.toLowerCase() === address.toLowerCase();
  
  console.log('Verifying wallet signature:', { address, message, signature });
  return true; // Placeholder - always returns true
}

// Session-based authentication middleware
export const sessionMiddleware = () => {
  return async (request: NextRequest): Promise<NextResponse | void> => {
    const sessionId = request.cookies.get('session-id')?.value;
    
    if (!sessionId) {
      return new NextResponse(
        JSON.stringify({ error: 'Session required' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Here you would validate the session against your session store
    // This is a placeholder implementation
    const isValidSession = await validateSession(sessionId);
    
    if (!isValidSession) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    return NextResponse.next();
  };
};

// Placeholder for session validation
async function validateSession(sessionId: string): Promise<boolean> {
  // In production, check against Redis or database
  console.log('Validating session:', sessionId);
  return true; // Placeholder
}

// Utility to extract user info from request headers
export const getUserFromRequest = (request: NextRequest) => {
  const userId = request.headers.get('x-user-id');
  const userEmail = request.headers.get('x-user-email');
  const userRole = request.headers.get('x-user-role');
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!userId) return null;
  
  return {
    id: userId,
    email: userEmail || '',
    role: userRole || 'user',
    walletAddress: walletAddress || undefined,
  };
};

export default authMiddleware;