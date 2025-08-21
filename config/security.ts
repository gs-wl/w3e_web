import * as crypto from 'crypto';

interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  sessionSecret: string;
  corsOrigins: string[];
  rateLimiting: {
    windowMs: number;
    max: number;
    skipSuccessfulRequests: boolean;
  };
  helmet: {
    contentSecurityPolicy: boolean;
    crossOriginEmbedderPolicy: boolean;
    dnsPrefetchControl: boolean;
    frameguard: boolean;
    hidePoweredBy: boolean;
    hsts: boolean;
    ieNoOpen: boolean;
    noSniff: boolean;
    originAgentCluster: boolean;
    permittedCrossDomainPolicies: boolean;
    referrerPolicy: boolean;
    xssFilter: boolean;
  };
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
  };
}

const getSecurityConfig = (): SecurityConfig => {
  const environment = process.env.NODE_ENV || 'development';
  const envType = environment as 'development' | 'production' | 'test' | 'staging';
  
  const baseConfig: SecurityConfig = {
    jwtSecret: process.env.JWT_SECRET || generateSecureSecret(),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    sessionSecret: process.env.SESSION_SECRET || generateSecureSecret(),
    corsOrigins: getCorsOrigins(envType),
    rateLimiting: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      skipSuccessfulRequests: false,
    },
    helmet: {
      contentSecurityPolicy: true,
      crossOriginEmbedderPolicy: true,
      dnsPrefetchControl: true,
      frameguard: true,
      hidePoweredBy: true,
      hsts: true,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: true,
      referrerPolicy: true,
      xssFilter: true,
    },
    encryption: {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
    },
  };

  switch (envType) {
    case 'production':
      return {
        ...baseConfig,
        bcryptRounds: 14,
        rateLimiting: {
          ...baseConfig.rateLimiting,
          max: 50, // Stricter rate limiting in production
        },
      };
    
    case 'staging':
      return {
        ...baseConfig,
        bcryptRounds: 12,
        rateLimiting: {
          ...baseConfig.rateLimiting,
          max: 200,
        },
      };
    
    case 'test':
      return {
        ...baseConfig,
        bcryptRounds: 4, // Faster for tests
        jwtExpiresIn: '1h',
        helmet: {
          ...baseConfig.helmet,
          contentSecurityPolicy: false, // Disable for testing
        },
      };
    
    default: // development
      return {
        ...baseConfig,
        bcryptRounds: 8, // Faster for development
        helmet: {
          ...baseConfig.helmet,
          contentSecurityPolicy: false, // Disable for development
        },
      };
  }
};

function generateSecureSecret(): string {
  return crypto.randomBytes(64).toString('hex');
}

function getCorsOrigins(environment: string): string[] {
  switch (environment) {
    case 'production':
      return [
        'https://rwa.defi',
        'https://www.rwa.defi',
        'https://app.rwa.defi',
      ];
    
    case 'staging':
      return [
        'https://staging.rwa.defi',
        'https://staging-app.rwa.defi',
      ];
    
    case 'test':
      return ['http://localhost:3000', 'http://127.0.0.1:3000'];
    
    default: // development
      return [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ];
  }
}

// Encryption utilities (simplified for compatibility)
export const encryption = {
  encrypt: (text: string, key: string): { encrypted: string; iv: string } => {
    const config = getSecurityConfig();
    const iv = crypto.randomBytes(config.encryption.ivLength);
    const keyBuffer = crypto.scryptSync(key, 'salt', config.encryption.keyLength);
    const cipher = crypto.createCipher('aes-256-cbc', keyBuffer);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
    };
  },

  decrypt: (encryptedData: { encrypted: string; iv: string }, key: string): string => {
    const config = getSecurityConfig();
    const keyBuffer = crypto.scryptSync(key, 'salt', config.encryption.keyLength);
    const decipher = crypto.createDecipher('aes-256-cbc', keyBuffer);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  },
};

// Password utilities (install bcrypt: npm install bcrypt @types/bcrypt)
export const password = {
  hash: async (plainPassword: string): Promise<string> => {
    try {
      const bcrypt = await import('bcrypt') as any;
      const config = getSecurityConfig();
      return bcrypt.hash(plainPassword, config.bcryptRounds);
    } catch (error) {
      throw new Error('bcrypt module not installed. Run: npm install bcrypt @types/bcrypt');
    }
  },

  verify: async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
    try {
      const bcrypt = await import('bcrypt') as any;
      return bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw new Error('bcrypt module not installed. Run: npm install bcrypt @types/bcrypt');
    }
  },
};

// JWT utilities (install jsonwebtoken: npm install jsonwebtoken @types/jsonwebtoken)
export const jwt = {
  sign: async (payload: object, options?: object): Promise<string> => {
    try {
      const jsonwebtoken = await import('jsonwebtoken') as any;
      const config = getSecurityConfig();
      return jsonwebtoken.sign(payload, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn,
        ...options,
      });
    } catch (error) {
      throw new Error('jsonwebtoken module not installed. Run: npm install jsonwebtoken @types/jsonwebtoken');
    }
  },

  verify: async (token: string): Promise<any> => {
    try {
      const jsonwebtoken = await import('jsonwebtoken') as any;
      const config = getSecurityConfig();
      return jsonwebtoken.verify(token, config.jwtSecret);
    } catch (error) {
      throw new Error('jsonwebtoken module not installed. Run: npm install jsonwebtoken @types/jsonwebtoken');
    }
  },

  decode: async (token: string): Promise<any> => {
    try {
      const jsonwebtoken = await import('jsonwebtoken') as any;
      return jsonwebtoken.decode(token);
    } catch (error) {
      throw new Error('jsonwebtoken module not installed. Run: npm install jsonwebtoken @types/jsonwebtoken');
    }
  },
};

// Input sanitization
export const sanitize = {
  html: (input: string): string => {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  sql: (input: string): string => {
    return input.replace(/[';"\\]/g, '');
  },

  email: (email: string): string => {
    return email.toLowerCase().trim();
  },
};

// Security headers
export const getSecurityHeaders = () => {
  const config = getSecurityConfig();
  
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': config.helmet.contentSecurityPolicy
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-src 'none';"
      : undefined,
  };
};

export default getSecurityConfig;