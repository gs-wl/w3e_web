// Validation utilities for common data types

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone number validation (international format)
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// URL validation
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Ethereum address validation
export const isValidEthereumAddress = (address: string): boolean => {
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethAddressRegex.test(address);
};

// Bitcoin address validation (basic)
export const isValidBitcoinAddress = (address: string): boolean => {
  // Basic validation for Bitcoin addresses
  const btcRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
  return btcRegex.test(address);
};

// UUID validation
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Credit card validation (Luhn algorithm)
export const isValidCreditCard = (cardNumber: string): boolean => {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return false;
  }
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

// Password strength validation
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;
  
  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password should be at least 8 characters long');
  }
  
  if (password.length >= 12) {
    score += 1;
  }
  
  // Character variety
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add lowercase letters');
  }
  
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add uppercase letters');
  }
  
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add numbers');
  }
  
  if (/[^\w\s]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add special characters');
  }
  
  // Common patterns
  if (/123456|password|qwerty/i.test(password)) {
    score -= 2;
    feedback.push('Avoid common patterns');
  }
  
  return {
    isValid: score >= 4,
    score: Math.max(0, score),
    feedback,
  };
};

// Date validation
export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

// Age validation
export const isValidAge = (birthDate: string, minAge: number = 18): boolean => {
  if (!isValidDate(birthDate)) return false;
  
  const today = new Date();
  const birth = new Date(birthDate);
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1 >= minAge;
  }
  
  return age >= minAge;
};

// IP address validation
export const isValidIPAddress = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

// Domain validation
export const isValidDomain = (domain: string): boolean => {
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(com|org|net|edu|gov|mil|int|co|io|ai|app|dev|tech|info|biz|name|pro|museum|[a-zA-Z]{2})$/i;
  return domainRegex.test(domain);
};

// Social Security Number validation (US format)
export const isValidSSN = (ssn: string): boolean => {
  const cleanSSN = ssn.replace(/\D/g, '');
  const ssnRegex = /^(?!666|000|9\d{2})\d{3}(?!00)\d{2}(?!0{4})\d{4}$/;
  return ssnRegex.test(cleanSSN);
};

// Tax ID validation (EIN format)
export const isValidEIN = (ein: string): boolean => {
  const cleanEIN = ein.replace(/\D/g, '');
  const einRegex = /^\d{9}$/;
  return einRegex.test(cleanEIN);
};

// File extension validation
export const isValidFileExtension = (filename: string, allowedExtensions: string[]): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedExtensions.includes(extension) : false;
};

// MIME type validation
export const isValidMimeType = (mimeType: string, allowedTypes: string[]): boolean => {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return mimeType.startsWith(type.slice(0, -1));
    }
    return mimeType === type;
  });
};

// File size validation
export const isValidFileSize = (size: number, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return size <= maxSizeInBytes;
};

// JSON validation
export const isValidJSON = (jsonString: string): boolean => {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
};

// Base64 validation
export const isValidBase64 = (str: string): boolean => {
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(str) && str.length % 4 === 0;
};

// Hex string validation
export const isValidHex = (str: string): boolean => {
  const hexRegex = /^[0-9a-fA-F]+$/;
  return hexRegex.test(str);
};

// Coordinate validation (latitude, longitude)
export const isValidCoordinates = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

// Postal code validation (US ZIP code)
export const isValidZipCode = (zipCode: string): boolean => {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zipCode);
};

// International postal code validation
export const isValidPostalCode = (postalCode: string, country: string): boolean => {
  const patterns: Record<string, RegExp> = {
    US: /^\d{5}(-\d{4})?$/,
    CA: /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/,
    UK: /^[A-Za-z]{1,2}\d[A-Za-z\d]? \d[A-Za-z]{2}$/,
    DE: /^\d{5}$/,
    FR: /^\d{5}$/,
    JP: /^\d{3}-\d{4}$/,
    AU: /^\d{4}$/,
  };
  
  const pattern = patterns[country.toUpperCase()];
  return pattern ? pattern.test(postalCode) : true; // Default to true for unknown countries
};

// Color validation (hex, rgb, rgba)
export const isValidColor = (color: string): boolean => {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const rgbRegex = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
  const rgbaRegex = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0|1|0?\.\d+)\s*\)$/;
  
  return hexRegex.test(color) || rgbRegex.test(color) || rgbaRegex.test(color);
};

// Slug validation (URL-friendly string)
export const isValidSlug = (slug: string): boolean => {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
};

// Username validation
export const isValidUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

// Sanitization utilities
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>"'&]/g, (match) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return entities[match] || match;
    })
    .trim();
};

// Remove HTML tags
export const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

// Normalize whitespace
export const normalizeWhitespace = (str: string): string => {
  return str.replace(/\s+/g, ' ').trim();
};

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Comprehensive validation function
export const validateField = (
  value: any,
  rules: {
    required?: boolean;
    type?: 'string' | 'number' | 'email' | 'url' | 'phone' | 'date';
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean | string;
  }
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required check
  if (rules.required && (value === null || value === undefined || value === '')) {
    errors.push('This field is required');
    return { isValid: false, errors, warnings };
  }
  
  // Skip other validations if value is empty and not required
  if (!rules.required && (value === null || value === undefined || value === '')) {
    return { isValid: true, errors, warnings };
  }
  
  // Type validation
  if (rules.type) {
    switch (rules.type) {
      case 'email':
        if (!isValidEmail(value)) errors.push('Invalid email format');
        break;
      case 'url':
        if (!isValidUrl(value)) errors.push('Invalid URL format');
        break;
      case 'phone':
        if (!isValidPhoneNumber(value)) errors.push('Invalid phone number format');
        break;
      case 'date':
        if (!isValidDate(value)) errors.push('Invalid date format');
        break;
      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          errors.push('Must be a valid number');
        }
        break;
      case 'string':
        if (typeof value !== 'string') errors.push('Must be a string');
        break;
    }
  }
  
  // Length validation for strings
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`Must be at least ${rules.minLength} characters long`);
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`Must not exceed ${rules.maxLength} characters`);
    }
  }
  
  // Numeric range validation
  if (typeof value === 'number' || !isNaN(Number(value))) {
    const numValue = Number(value);
    if (rules.min !== undefined && numValue < rules.min) {
      errors.push(`Must be at least ${rules.min}`);
    }
    if (rules.max !== undefined && numValue > rules.max) {
      errors.push(`Must not exceed ${rules.max}`);
    }
  }
  
  // Pattern validation
  if (rules.pattern && typeof value === 'string') {
    if (!rules.pattern.test(value)) {
      errors.push('Invalid format');
    }
  }
  
  // Custom validation
  if (rules.custom) {
    const result = rules.custom(value);
    if (typeof result === 'string') {
      errors.push(result);
    } else if (!result) {
      errors.push('Custom validation failed');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

export default {
  isValidEmail,
  isValidPhoneNumber,
  isValidUrl,
  isValidEthereumAddress,
  isValidBitcoinAddress,
  isValidUUID,
  isValidCreditCard,
  validatePasswordStrength,
  isValidDate,
  isValidAge,
  isValidIPAddress,
  isValidDomain,
  isValidSSN,
  isValidEIN,
  isValidFileExtension,
  isValidMimeType,
  isValidFileSize,
  isValidJSON,
  isValidBase64,
  isValidHex,
  isValidCoordinates,
  isValidZipCode,
  isValidPostalCode,
  isValidColor,
  isValidSlug,
  isValidUsername,
  sanitizeInput,
  stripHtml,
  normalizeWhitespace,
  validateField,
};