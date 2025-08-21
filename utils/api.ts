// API utilities for HTTP requests and response handling

import { errorTracking } from '../config/monitoring';
import logger from '../config/logger';

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp: string;
    requestId?: string;
  };
}

// Request configuration
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: 'no-cache' | 'reload' | 'force-cache' | 'only-if-cached';
  credentials?: 'include' | 'omit' | 'same-origin';
}

// Error types
export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Base API client class
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number;

  constructor(
    baseUrl: string = '',
    defaultHeaders: Record<string, string> = {},
    defaultTimeout: number = 30000
  ) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    };
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Make HTTP request
   */
  async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = 3,
      retryDelay = 1000,
      cache = 'no-cache',
      credentials = 'same-origin',
    } = config;

    const url = this.buildUrl(endpoint);
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    // Add authentication token if available
    const token = this.getAuthToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }

    const requestConfig: RequestInit = {
      method,
      headers: requestHeaders,
      cache,
      credentials,
    };

    // Add body for non-GET requests
    if (body && method !== 'GET') {
      if (body instanceof FormData) {
        requestConfig.body = body;
        // Remove Content-Type header for FormData (browser will set it)
        delete requestHeaders['Content-Type'];
      } else {
        requestConfig.body = JSON.stringify(body);
      }
    }

    return this.executeRequest<T>(url, requestConfig, retries, retryDelay, timeout);
  }

  /**
   * Execute request with retry logic
   */
  private async executeRequest<T>(
    url: string,
    config: RequestInit,
    retries: number,
    retryDelay: number,
    timeout: number
  ): Promise<ApiResponse<T>> {
    let lastError: Error;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...config,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        return await this.handleResponse<T>(response);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx)
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          throw error;
        }

        // Log retry attempt
        if (attempt < retries) {
          logger.warn(`Request failed, retrying (${attempt}/${retries})`, {
            url,
            error: lastError.message,
            attempt,
          });

          // Wait before retry with exponential backoff
          await this.delay(retryDelay * Math.pow(2, attempt - 1));
        }
      }
    }

    // All retries failed
    errorTracking.captureException(lastError!, {
      context: 'api-request-failed',
      url,
      retries,
    });

    throw lastError!;
  }

  /**
   * Handle response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    let data: any;
    try {
      data = isJson ? await response.json() : await response.text();
    } catch (error) {
      throw new ApiError(
        'Failed to parse response',
        response.status,
        'PARSE_ERROR',
        { contentType }
      );
    }

    if (!response.ok) {
      const errorMessage = data?.error?.message || data?.message || `HTTP ${response.status}`;
      const errorCode = data?.error?.code || data?.code;
      const errorDetails = data?.error?.details || data?.details;

      throw new ApiError(errorMessage, response.status, errorCode, errorDetails);
    }

    // Return standardized response format
    if (data && typeof data === 'object' && 'success' in data) {
      return data as ApiResponse<T>;
    }

    return {
      success: true,
      data: data as T,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: response.headers.get('x-request-id') || undefined,
      },
    };
  }

  /**
   * Build full URL
   */
  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    return `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }

  /**
   * Get authentication token
   */
  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    }
    return null;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Convenience methods
  async get<T = any>(endpoint: string, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  async put<T = any>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  async patch<T = any>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }

  async delete<T = any>(endpoint: string, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

// Default API client instance
export const apiClient = new ApiClient(
  process.env.NEXT_PUBLIC_API_BASE_URL || '/api'
);

// Specialized API clients
export const createAuthenticatedClient = (token: string): ApiClient => {
  return new ApiClient(
    process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
    { Authorization: `Bearer ${token}` }
  );
};

export const createExternalClient = (baseUrl: string, apiKey?: string): ApiClient => {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  return new ApiClient(baseUrl, headers);
};

// Response helpers
export const createSuccessResponse = <T>(
  data: T,
  meta?: ApiResponse<T>['meta']
): ApiResponse<T> => ({
  success: true,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    ...meta,
  },
});

export const createErrorResponse = (
  message: string,
  code?: string,
  details?: any
): ApiResponse => ({
  success: false,
  error: {
    message,
    code,
    details,
  },
  meta: {
    timestamp: new Date().toISOString(),
  },
});

// Pagination helpers
export const createPaginatedResponse = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): ApiResponse<T[]> => ({
  success: true,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  },
});

// Request interceptors
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor<T = any> = (response: ApiResponse<T>) => ApiResponse<T> | Promise<ApiResponse<T>>;

// Enhanced API client with interceptors
export class EnhancedApiClient extends ApiClient {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  async request<T = any>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    // Apply request interceptors
    let processedConfig = config;
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }

    // Make request
    let response = await super.request<T>(endpoint, processedConfig);

    // Apply response interceptors
    for (const interceptor of this.responseInterceptors) {
      response = await interceptor(response);
    }

    return response;
  }
}

// File upload utilities
export const uploadFile = async (
  file: File,
  endpoint: string,
  onProgress?: (progress: number) => void
): Promise<ApiResponse> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          resolve(createSuccessResponse(xhr.responseText));
        }
      } else {
        reject(new ApiError(`Upload failed: ${xhr.statusText}`, xhr.status));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new ApiError('Upload failed', 0));
    });

    xhr.open('POST', endpoint);
    
    // Add auth token if available
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.send(formData);
  });
};

// WebSocket utilities
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Function[]> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.emit('message', data);
            if (data.type) {
              this.emit(data.type, data);
            }
          } catch {
            this.emit('message', event.data);
          }
        };

        this.ws.onclose = () => {
          this.emit('disconnected');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          this.emit('error', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      await new Promise(resolve => setTimeout(resolve, this.reconnectDelay * this.reconnectAttempts));
      try {
        await this.connect();
      } catch {
        // Reconnection failed, will try again
      }
    }
  }
}

export default apiClient;