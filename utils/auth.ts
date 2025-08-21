// Authentication utilities for JWT, password management, and session handling

import { authLogger } from '../config/logger';
import { performance, errorTracking } from '../config/monitoring';
import { CryptoUtils, PasswordUtils as CryptoPasswordUtils } from './crypto';

// Authentication types
export interface User {
  id: string;
  email: string;
  username?: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface JWTPayload {
  sub: string; // user ID
  email: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  jti: string; // JWT ID
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface PasswordResetRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface SessionData {
  userId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

// Authentication errors
export class AuthError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// JWT utilities
class JWTUtils {
  private secretKey: string;
  private issuer: string;
  private audience: string;
  private accessTokenExpiry: number;
  private refreshTokenExpiry: number;

  constructor(config: {
    secretKey: string;
    issuer: string;
    audience: string;
    accessTokenExpiry?: number;
    refreshTokenExpiry?: number;
  }) {
    this.secretKey = config.secretKey;
    this.issuer = config.issuer;
    this.audience = config.audience;
    this.accessTokenExpiry = config.accessTokenExpiry || 3600; // 1 hour
    this.refreshTokenExpiry = config.refreshTokenExpiry || 604800; // 7 days
  }

  /**
   * Generate JWT token
   */
  generateToken(
    payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud' | 'jti'>,
    expiresIn?: number
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const expiry = expiresIn || this.accessTokenExpiry;
    
    const fullPayload: JWTPayload = {
      ...payload,
      iat: now,
      exp: now + expiry,
      iss: this.issuer,
      aud: this.audience,
      jti: CryptoUtils.generateRandomString(16),
    };

    // In a real implementation, you would use a proper JWT library
    // This is a simplified version for demonstration
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(fullPayload));
    const signature = this.sign(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): JWTPayload {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new AuthError('Invalid token format', 'INVALID_TOKEN_FORMAT');
      }

      const [encodedHeader, encodedPayload, signature] = parts;
      const expectedSignature = this.sign(`${encodedHeader}.${encodedPayload}`);

      if (signature !== expectedSignature) {
        throw new AuthError('Invalid token signature', 'INVALID_SIGNATURE');
      }

      const payload: JWTPayload = JSON.parse(this.base64UrlDecode(encodedPayload));

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new AuthError('Token expired', 'TOKEN_EXPIRED');
      }

      // Check issuer and audience
      if (payload.iss !== this.issuer || payload.aud !== this.audience) {
        throw new AuthError('Invalid token claims', 'INVALID_CLAIMS');
      }

      return payload;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Token verification failed', 'VERIFICATION_FAILED');
    }
  }

  /**
   * Generate access and refresh tokens
   */
  generateTokenPair(user: User): AuthTokens {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    };

    const accessToken = this.generateToken(payload, this.accessTokenExpiry);
    const refreshToken = this.generateToken(
      payload,
      this.refreshTokenExpiry
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiry,
      tokenType: 'Bearer',
    };
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken: string): string {
    const payload = this.verifyToken(refreshToken);
    
    // Additional validation for refresh tokens would go here

    const newPayload = {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
    };

    return this.generateToken(newPayload, this.accessTokenExpiry);
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Base64 URL encode
   */
  private base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Base64 URL decode
   */
  private base64UrlDecode(str: string): string {
    str += '='.repeat((4 - str.length % 4) % 4);
    return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
  }

  /**
   * Sign data with secret key
   */
  private sign(data: string): string {
    // In a real implementation, you would use HMAC-SHA256
    // This is a simplified version
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(data)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

// Password utilities
class AuthPasswordUtils {
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 128;
  private static readonly SALT_ROUNDS = 12;

  /**
   * Validate password strength
   */
  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
    score: number;
  } {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
    } else if (password.length >= this.MIN_LENGTH) {
      score += 1;
    }

    if (password.length > this.MAX_LENGTH) {
      errors.push(`Password must not exceed ${this.MAX_LENGTH} characters`);
    }

    // Character type checks
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 1;
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else {
      score += 1;
    }

    // Common patterns check
    if (/123456|password|qwerty|abc123/i.test(password)) {
      errors.push('Password contains common patterns');
      score -= 1;
    }

    // Repeated characters check
    if (/(..).*\1/.test(password)) {
      score -= 0.5;
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.max(0, Math.min(5, score)),
    };
  }

  /**
   * Hash password with salt
   */
  static async hashPassword(password: string): Promise<string> {
    const validation = AuthPasswordUtils.validatePassword(password);
    if (!validation.isValid) {
      throw new AuthError(
        `Password validation failed: ${validation.errors.join(', ')}`,
        'INVALID_PASSWORD',
        400
      );
    }

    const salt = CryptoUtils.generateSalt(16);
    return CryptoUtils.deriveKey(password, salt);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    // This is a simplified verification - in production you'd store salt separately
    try {
      const salt = CryptoUtils.generateSalt();
      const derivedKey = CryptoUtils.deriveKey(password, salt);
      return CryptoUtils.constantTimeCompare(derivedKey, hash);
    } catch {
      return false;
    }
  }

  /**
   * Generate secure password
   */
  static generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = lowercase + uppercase + numbers + symbols;

    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

// Session management
class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();
  private maxSessionsPerUser: number;
  private sessionTimeout: number;

  constructor(maxSessionsPerUser: number = 5, sessionTimeout: number = 86400000) { // 24 hours
    this.maxSessionsPerUser = maxSessionsPerUser;
    this.sessionTimeout = sessionTimeout;
    
    // Clean up expired sessions every hour
    setInterval(() => this.cleanupExpiredSessions(), 3600000);
  }

  /**
   * Create new session
   */
  createSession(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): SessionData {
    const sessionId = CryptoUtils.generateRandomString(32);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTimeout);

    const session: SessionData = {
      userId,
      sessionId,
      ipAddress,
      userAgent,
      createdAt: now,
      expiresAt,
      isActive: true,
    };

    // Limit sessions per user
    this.limitUserSessions(userId);

    // Store session
    this.sessions.set(sessionId, session);
    
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    authLogger.info('Session created', {
      userId,
      sessionId,
      ipAddress,
    });

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date() || !session.isActive) {
      this.destroySession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update session activity
   */
  updateSessionActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return false;
    }

    // Extend session expiry
    session.expiresAt = new Date(Date.now() + this.sessionTimeout);
    return true;
  }

  /**
   * Destroy session
   */
  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    // Remove from user sessions
    const userSessionSet = this.userSessions.get(session.userId);
    if (userSessionSet) {
      userSessionSet.delete(sessionId);
      if (userSessionSet.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    // Remove session
    this.sessions.delete(sessionId);

    authLogger.info('Session destroyed', {
      userId: session.userId,
      sessionId,
    });

    return true;
  }

  /**
   * Destroy all sessions for a user
   */
  destroyUserSessions(userId: string): number {
    const userSessionSet = this.userSessions.get(userId);
    
    if (!userSessionSet) {
      return 0;
    }

    let destroyedCount = 0;
    Array.from(userSessionSet).forEach(sessionId => {
      if (this.sessions.delete(sessionId)) {
        destroyedCount++;
      }
    });

    this.userSessions.delete(userId);

    authLogger.info('All user sessions destroyed', {
      userId,
      destroyedCount,
    });

    return destroyedCount;
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): SessionData[] {
    const userSessionSet = this.userSessions.get(userId);
    
    if (!userSessionSet) {
      return [];
    }

    const sessions: SessionData[] = [];
    Array.from(userSessionSet).forEach(sessionId => {
      const session = this.sessions.get(sessionId);
      if (session && session.isActive && session.expiresAt > new Date()) {
        sessions.push(session);
      }
    });

    return sessions;
  }

  /**
   * Limit sessions per user
   */
  private limitUserSessions(userId: string): void {
    const userSessionSet = this.userSessions.get(userId);
    
    if (!userSessionSet || userSessionSet.size < this.maxSessionsPerUser) {
      return;
    }

    // Find oldest session and remove it
    let oldestSession: SessionData | null = null;
    let oldestSessionId: string | null = null;

    Array.from(userSessionSet).forEach(sessionId => {
      const session = this.sessions.get(sessionId);
      if (session && (!oldestSession || session.createdAt < oldestSession.createdAt)) {
        oldestSession = session;
        oldestSessionId = sessionId;
      }
    });

    if (oldestSessionId) {
      this.destroySession(oldestSessionId);
    }
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    Array.from(this.sessions.entries()).forEach(([sessionId, session]) => {
      if (session.expiresAt < now || !session.isActive) {
        this.destroySession(sessionId);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      authLogger.info('Expired sessions cleaned up', { cleanedCount });
    }
  }

  /**
   * Get session statistics
   */
  getStats() {
    return {
      totalSessions: this.sessions.size,
      activeUsers: this.userSessions.size,
      maxSessionsPerUser: this.maxSessionsPerUser,
      sessionTimeout: this.sessionTimeout,
    };
  }
}

// Two-factor authentication utilities
class TwoFactorAuth {
  /**
   * Generate TOTP secret
   */
  static generateSecret(): string {
    return CryptoUtils.generateRandomString(32);
  }

  /**
   * Generate QR code URL for TOTP setup
   */
  static generateQRCodeUrl(
    secret: string,
    email: string,
    issuer: string = 'RWA Platform'
  ): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedEmail = encodeURIComponent(email);
    const encodedSecret = encodeURIComponent(secret);
    
    return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${encodedSecret}&issuer=${encodedIssuer}`;
  }

  /**
   * Verify TOTP code
   */
  static verifyTOTP(secret: string, token: string, window: number = 1): boolean {
    // This is a simplified implementation
    // In a real implementation, you would use a proper TOTP library
    const timeStep = Math.floor(Date.now() / 1000 / 30);
    
    for (let i = -window; i <= window; i++) {
      const expectedToken = this.generateTOTP(secret, timeStep + i);
      if (expectedToken === token) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate backup codes
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const code = CryptoUtils.generateRandomString(8).toUpperCase();
      // Format as XXXX-XXXX
      const formattedCode = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
      codes.push(formattedCode);
    }
    
    return codes;
  }

  /**
   * Generate TOTP token (simplified)
   */
  private static generateTOTP(secret: string, timeStep: number): string {
    // This is a very simplified implementation
    // In a real implementation, you would use proper HMAC-based OTP
    const hash = require('crypto')
      .createHmac('sha1', secret)
      .update(timeStep.toString())
      .digest('hex');
    
    const offset = parseInt(hash.slice(-1), 16);
    const code = parseInt(hash.slice(offset * 2, offset * 2 + 8), 16) % 1000000;
    
    return code.toString().padStart(6, '0');
  }
}

// Authentication service
class AuthService {
  private jwtUtils: JWTUtils;
  private sessionManager: SessionManager;
  private passwordUtils: AuthPasswordUtils;

  constructor(
    jwtConfig: {
      secretKey: string;
      issuer: string;
      audience: string;
      accessTokenExpiry?: number;
      refreshTokenExpiry?: number;
    },
    sessionConfig?: {
      maxSessionsPerUser?: number;
      sessionTimeout?: number;
    }
  ) {
    this.jwtUtils = new JWTUtils(jwtConfig);
    this.sessionManager = new SessionManager(
      sessionConfig?.maxSessionsPerUser,
      sessionConfig?.sessionTimeout
    );
    this.passwordUtils = new AuthPasswordUtils();
  }

  /**
   * Authenticate user with credentials
   */
  async authenticate(
    credentials: LoginCredentials,
    ipAddress: string,
    userAgent: string
  ): Promise<{ user: User; tokens: AuthTokens; session: SessionData }> {
    const timer = performance.startTimer('user-authentication');
    
    try {
      authLogger.info('Authentication attempt', {
        email: credentials.email,
        ipAddress,
      });

      // This would typically validate against a database
      // For demonstration, we'll use a mock user
      const user = await this.validateCredentials(credentials);
      
      if (!user.isActive) {
        throw new AuthError('Account is deactivated', 'ACCOUNT_DEACTIVATED', 403);
      }

      if (!user.emailVerified) {
        throw new AuthError('Email not verified', 'EMAIL_NOT_VERIFIED', 403);
      }

      // Check 2FA if enabled
      if (user.twoFactorEnabled && !credentials.twoFactorCode) {
        throw new AuthError('Two-factor authentication required', 'TWO_FACTOR_REQUIRED', 403);
      }

      if (user.twoFactorEnabled && credentials.twoFactorCode) {
        // Verify 2FA code (this would use the user's secret)
        const isValid = TwoFactorAuth.verifyTOTP('user-secret', credentials.twoFactorCode);
        if (!isValid) {
          throw new AuthError('Invalid two-factor code', 'INVALID_TWO_FACTOR', 401);
        }
      }

      // Generate tokens
      const tokens = this.jwtUtils.generateTokenPair(user);
      
      // Create session
      const session = this.sessionManager.createSession(user.id, ipAddress, userAgent);

      const duration = timer();
      authLogger.info('Authentication successful', {
        userId: user.id,
        email: user.email,
        duration,
        ipAddress,
      });

      return { user, tokens, session };
    } catch (error) {
      const duration = timer();
      authLogger.error('Authentication failed', error instanceof Error ? error : new Error(String(error)), {
        email: credentials.email,
        duration,
        ipAddress,
      });
      
      errorTracking.captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'authentication-failed',
        email: credentials.email,
        ipAddress,
      });
      
      throw error;
    }
  }

  /**
   * Validate user credentials (mock implementation)
   */
  private async validateCredentials(credentials: LoginCredentials): Promise<User> {
    // This would typically query a database
    // Mock implementation for demonstration
    if (credentials.email === 'admin@example.com' && credentials.password === 'password123') {
      return {
        id: '1',
        email: credentials.email,
        username: 'admin',
        role: 'admin',
        permissions: ['read', 'write', 'delete'],
        isActive: true,
        emailVerified: true,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    
    throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload {
    return this.jwtUtils.verifyToken(token);
  }

  /**
   * Refresh access token
   */
  refreshToken(refreshToken: string): string {
    return this.jwtUtils.refreshAccessToken(refreshToken);
  }

  /**
   * Logout user
   */
  logout(sessionId: string): boolean {
    return this.sessionManager.destroySession(sessionId);
  }

  /**
   * Logout all sessions for user
   */
  logoutAll(userId: string): number {
    return this.sessionManager.destroyUserSessions(userId);
  }
}

// Export default auth service instance
const authService = new AuthService({
  secretKey: process.env.JWT_SECRET || 'default-secret-key',
  issuer: process.env.JWT_ISSUER || 'rwa-platform',
  audience: process.env.JWT_AUDIENCE || 'rwa-users',
});

export default authService;
export { JWTUtils, AuthPasswordUtils, SessionManager, TwoFactorAuth, AuthService };