// Formatting utilities for consistent data presentation

// Number formatting
export const formatNumber = (
  value: number,
  options: {
    decimals?: number;
    thousandsSeparator?: string;
    decimalSeparator?: string;
    prefix?: string;
    suffix?: string;
  } = {}
): string => {
  const {
    decimals = 2,
    thousandsSeparator = ',',
    decimalSeparator = '.',
    prefix = '',
    suffix = '',
  } = options;

  const fixed = value.toFixed(decimals);
  const [integer, decimal] = fixed.split('.');
  
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
  const formattedNumber = decimal ? `${formattedInteger}${decimalSeparator}${decimal}` : formattedInteger;
  
  return `${prefix}${formattedNumber}${suffix}`;
};

// Currency formatting
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

// Percentage formatting
export const formatPercentage = (
  value: number,
  decimals: number = 2,
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

// Compact number formatting (1K, 1M, 1B)
export const formatCompactNumber = (
  value: number,
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
};

// Crypto currency formatting
export const formatCrypto = (
  amount: number,
  symbol: string,
  decimals: number = 8
): string => {
  const formatted = formatNumber(amount, { decimals });
  return `${formatted} ${symbol}`;
};

// Wei to Ether conversion and formatting
export const formatEther = (weiAmount: string | number): string => {
  const wei = typeof weiAmount === 'string' ? BigInt(weiAmount) : BigInt(Math.floor(weiAmount));
  const ether = Number(wei) / Math.pow(10, 18);
  return formatCrypto(ether, 'ETH', 6);
};

// Gwei formatting
export const formatGwei = (weiAmount: string | number): string => {
  const wei = typeof weiAmount === 'string' ? BigInt(weiAmount) : BigInt(Math.floor(weiAmount));
  const gwei = Number(wei) / Math.pow(10, 9);
  return formatNumber(gwei, { decimals: 2, suffix: ' Gwei' });
};

// Date formatting
export const formatDate = (
  date: Date | string | number,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium',
  locale: string = 'en-US'
): string => {
  const dateObj = new Date(date);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: format,
  }).format(dateObj);
};

// Time formatting
export const formatTime = (
  date: Date | string | number,
  format: 'short' | 'medium' | 'long' = 'short',
  locale: string = 'en-US'
): string => {
  const dateObj = new Date(date);
  return new Intl.DateTimeFormat(locale, {
    timeStyle: format,
  }).format(dateObj);
};

// DateTime formatting
export const formatDateTime = (
  date: Date | string | number,
  dateFormat: 'short' | 'medium' | 'long' | 'full' = 'medium',
  timeFormat: 'short' | 'medium' | 'long' = 'short',
  locale: string = 'en-US'
): string => {
  const dateObj = new Date(date);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: dateFormat,
    timeStyle: timeFormat,
  }).format(dateObj);
};

// Relative time formatting (e.g., "2 hours ago")
export const formatRelativeTime = (
  date: Date | string | number,
  locale: string = 'en-US'
): string => {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);
  
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  
  if (Math.abs(diffInSeconds) < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (Math.abs(diffInSeconds) < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (Math.abs(diffInSeconds) < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else if (Math.abs(diffInSeconds) < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  } else if (Math.abs(diffInSeconds) < 31536000) {
    return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
  }
};

// Duration formatting (e.g., "2h 30m 15s")
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  const parts: string[] = [];
  
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);
  
  return parts.join(' ');
};

// File size formatting
export const formatFileSize = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

// Phone number formatting
export const formatPhoneNumber = (phoneNumber: string, format: 'US' | 'international' = 'US'): string => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (format === 'US' && cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (format === 'US' && cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  } else if (format === 'international') {
    return `+${cleaned}`;
  }
  
  return phoneNumber; // Return original if can't format
};

// Credit card number formatting
export const formatCreditCard = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\D/g, '');
  const groups = cleaned.match(/.{1,4}/g) || [];
  return groups.join(' ').trim();
};

// Social Security Number formatting
export const formatSSN = (ssn: string): string => {
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  }
  return ssn;
};

// Address formatting
export const formatAddress = (address: {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}): string => {
  const parts = [
    address.street,
    address.city,
    address.state && address.zipCode ? `${address.state} ${address.zipCode}` : address.state || address.zipCode,
    address.country,
  ].filter(Boolean);
  
  return parts.join(', ');
};

// Ethereum address formatting (truncated)
export const formatEthereumAddress = (
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string => {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

// Transaction hash formatting
export const formatTxHash = (
  hash: string,
  startChars: number = 8,
  endChars: number = 6
): string => {
  if (hash.length <= startChars + endChars) {
    return hash;
  }
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
};

// Text truncation
export const truncateText = (
  text: string,
  maxLength: number,
  suffix: string = '...'
): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - suffix.length) + suffix;
};

// Word truncation (preserves whole words)
export const truncateWords = (
  text: string,
  maxWords: number,
  suffix: string = '...'
): string => {
  const words = text.split(' ');
  if (words.length <= maxWords) {
    return text;
  }
  return words.slice(0, maxWords).join(' ') + suffix;
};

// Capitalize first letter
export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

// Title case formatting
export const toTitleCase = (text: string): string => {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

// Camel case to title case
export const camelToTitle = (text: string): string => {
  return text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

// Snake case to title case
export const snakeToTitle = (text: string): string => {
  return text
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
};

// Kebab case to title case
export const kebabToTitle = (text: string): string => {
  return text
    .split('-')
    .map(word => capitalize(word))
    .join(' ');
};

// URL slug formatting
export const toSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// HTML entity encoding
export const encodeHtmlEntities = (text: string): string => {
  const entityMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'\/]/g, (char) => entityMap[char]);
};

// HTML entity decoding
export const decodeHtmlEntities = (text: string): string => {
  const entityMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x2F;': '/',
  };
  
  return text.replace(/&[#\w]+;/g, (entity) => entityMap[entity] || entity);
};

// JSON formatting (pretty print)
export const formatJSON = (obj: any, indent: number = 2): string => {
  return JSON.stringify(obj, null, indent);
};

// CSV formatting
export const formatCSV = (data: any[][], delimiter: string = ','): string => {
  return data
    .map(row => 
      row.map(cell => {
        const cellStr = String(cell);
        // Escape quotes and wrap in quotes if contains delimiter, quotes, or newlines
        if (cellStr.includes(delimiter) || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(delimiter)
    )
    .join('\n');
};

// Color formatting
export const formatHexColor = (color: string): string => {
  // Ensure color starts with # and is valid hex
  const cleaned = color.replace('#', '');
  if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(cleaned)) {
    throw new Error('Invalid hex color');
  }
  
  // Convert 3-digit hex to 6-digit
  if (cleaned.length === 3) {
    return `#${cleaned.split('').map(char => char + char).join('')}`;
  }
  
  return `#${cleaned.toUpperCase()}`;
};

// RGB to hex conversion
export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

// Hex to RGB conversion
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
};

export default {
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatCompactNumber,
  formatCrypto,
  formatEther,
  formatGwei,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatDuration,
  formatFileSize,
  formatPhoneNumber,
  formatCreditCard,
  formatSSN,
  formatAddress,
  formatEthereumAddress,
  formatTxHash,
  truncateText,
  truncateWords,
  capitalize,
  toTitleCase,
  camelToTitle,
  snakeToTitle,
  kebabToTitle,
  toSlug,
  encodeHtmlEntities,
  decodeHtmlEntities,
  formatJSON,
  formatCSV,
  formatHexColor,
  rgbToHex,
  hexToRgb,
};