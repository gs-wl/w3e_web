import * as crypto from 'crypto';

// Encryption utilities
export class CryptoUtils {
  private static readonly algorithm = 'aes-256-gcm';
  private static readonly keyLength = 32;
  private static readonly ivLength = 16;
  private static readonly tagLength = 16;

  /**
   * Generate a random key
   */
  static generateKey(): string {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }

  /**
   * Generate a random IV
   */
  static generateIV(): Buffer {
    return crypto.randomBytes(this.ivLength);
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  static encrypt(data: string, key?: string): { encrypted: string; iv: string; tag: string } {
    try {
      const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
      const iv = this.generateIV();
      const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: '', // Placeholder for compatibility
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  static decrypt(encryptedData: string, iv: string, tag: string, key?: string): string {
    try {
      const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
      const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Hash data using SHA-256
   */
  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Hash data using SHA-512
   */
  static hashSHA512(data: string): string {
    return crypto.createHash('sha512').update(data).digest('hex');
  }

  /**
   * Generate HMAC
   */
  static generateHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC
   */
  static verifyHMAC(data: string, secret: string, expectedHmac: string): boolean {
    const computedHmac = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(Buffer.from(computedHmac), Buffer.from(expectedHmac));
  }

  /**
   * Generate a secure random string
   */
  static generateRandomString(length: number = 32): string {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }

  /**
   * Generate a secure random number
   */
  static generateRandomNumber(min: number = 0, max: number = 1000000): number {
    const range = max - min;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const randomBytes = crypto.randomBytes(bytesNeeded);
    const randomValue = randomBytes.readUIntBE(0, bytesNeeded);
    return min + (randomValue % range);
  }

  /**
   * Generate UUID v4
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate a secure token
   */
  static generateToken(length: number = 64): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Derive key using PBKDF2
   */
  static deriveKey(password: string, salt: string, iterations: number = 100000): string {
    return crypto.pbkdf2Sync(password, salt, iterations, this.keyLength, 'sha256').toString('hex');
  }

  /**
   * Generate salt for password hashing
   */
  static generateSalt(length: number = 16): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Constant-time string comparison
   */
  static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  /**
   * Generate a cryptographically secure random integer
   */
  static secureRandomInt(min: number, max: number): number {
    const range = max - min + 1;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const maxValidValue = Math.floor(256 ** bytesNeeded / range) * range - 1;
    
    let randomValue: number;
    do {
      const randomBytes = crypto.randomBytes(bytesNeeded);
      randomValue = 0;
      for (let i = 0; i < bytesNeeded; i++) {
        randomValue = randomValue * 256 + randomBytes[i];
      }
    } while (randomValue > maxValidValue);
    
    return min + (randomValue % range);
  }

  /**
   * Encrypt object to JSON string
   */
  static encryptObject(obj: Record<string, unknown>, key?: string): string {
    const jsonString = JSON.stringify(obj);
    const encrypted = this.encrypt(jsonString, key);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt JSON string to object
   */
  static decryptObject<T = unknown>(encryptedString: string, key?: string): T {
    const encryptedData = JSON.parse(encryptedString);
    const decryptedString = this.decrypt(
      encryptedData.encrypted,
      encryptedData.iv,
      encryptedData.tag,
      key
    );
    return JSON.parse(decryptedString);
  }
}

// Password utilities
export class PasswordUtils {
  private static readonly minLength = 8;
  private static readonly maxLength = 128;

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
    if (password.length < this.minLength) {
      errors.push(`Password must be at least ${this.minLength} characters long`);
    } else if (password.length >= 12) {
      score += 2;
    } else {
      score += 1;
    }

    if (password.length > this.maxLength) {
      errors.push(`Password must not exceed ${this.maxLength} characters`);
    }

    // Character variety checks
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

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else {
      score += 2;
    }

    // Common patterns check
    if (/123456|password|qwerty|abc123/i.test(password)) {
      errors.push('Password contains common patterns');
      score -= 2;
    }

    // Repetitive characters
    if (/(..).*\1/.test(password)) {
      score -= 1;
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.max(0, Math.min(10, score)),
    };
  }

  /**
   * Generate a secure password
   */
  static generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = lowercase + uppercase + numbers + symbols;

    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[CryptoUtils.secureRandomInt(0, lowercase.length - 1)];
    password += uppercase[CryptoUtils.secureRandomInt(0, uppercase.length - 1)];
    password += numbers[CryptoUtils.secureRandomInt(0, numbers.length - 1)];
    password += symbols[CryptoUtils.secureRandomInt(0, symbols.length - 1)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[CryptoUtils.secureRandomInt(0, allChars.length - 1)];
    }

    // Shuffle the password
    return password.split('').sort(() => CryptoUtils.secureRandomInt(0, 1) - 0.5).join('');
  }

  /**
   * Check if password has been compromised (basic implementation)
   */
  static async isPasswordCompromised(password: string): Promise<boolean> {
    // This is a basic implementation
    // In production, you might want to use HaveIBeenPwned API
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }
}

// Key derivation utilities
export class KeyDerivation {
  /**
   * Derive encryption key from password using PBKDF2
   */
  static deriveKeyFromPassword(
    password: string,
    salt: string,
    iterations: number = 100000,
    keyLength: number = 32
  ): Buffer {
    return crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha256');
  }

  /**
   * Derive multiple keys from a master key using HKDF
   */
  static deriveKeys(
    masterKey: Buffer,
    salt: Buffer,
    info: string,
    keyLength: number = 32
  ): Buffer {
    // Simplified HKDF implementation
    const prk = crypto.createHmac('sha256', salt).update(masterKey).digest();
    const okm = crypto.createHmac('sha256', prk).update(Buffer.from(info)).digest();
    return okm.slice(0, keyLength);
  }
}

export default CryptoUtils;