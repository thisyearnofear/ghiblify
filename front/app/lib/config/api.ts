// Centralized API configuration
interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  headers: Record<string, string>;
}

class ApiConfigManager {
  private config: ApiConfig;

  constructor() {
    this.config = {
      baseUrl: this.getApiUrl(),
      timeout: 30000,
      retries: 3,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };
  }

  private getApiUrl(): string {
    // Environment-based API URL resolution
    if (typeof window === 'undefined') {
      // Server-side
      return process.env.NEXT_PUBLIC_API_URL || 'https://ghiblify.onrender.com';
    }

    // Client-side
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isLocalhost = window.location.hostname === 'localhost';
    
    if (isDevelopment || isLocalhost) {
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    }

    return process.env.NEXT_PUBLIC_API_URL || 'https://ghiblify.onrender.com';
  }

  private getRequestConfig(options?: RequestInit): RequestInit {
    return {
      credentials: 'include',
      mode: 'cors',
      ...options,
      headers: {
        ...this.config.headers,
        ...options?.headers,
        Origin: typeof window !== 'undefined' 
          ? window.location.origin 
          : 'https://ghiblify-it.vercel.app',
      },
    };
  }

  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || `HTTP ${response.status}` };
      }

      throw new Error(
        Array.isArray(errorData.detail) 
          ? errorData.detail[0] 
          : errorData.detail || errorData.error || `Request failed with status ${response.status}`
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }

  private async fetchWithRetry(url: string, options: RequestInit, retries = this.config.retries): Promise<any> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return this.handleResponse(response);
    } catch (error) {
      if (retries > 0 && (
        error instanceof Error && (
          error.name === 'AbortError' ||
          error.message.includes('network') ||
          error.message.includes('fetch')
        )
      )) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }

  // Public API methods
  async get(endpoint: string, options?: RequestInit): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const config = this.getRequestConfig({ ...options, method: 'GET' });
    return this.fetchWithRetry(url, config);
  }

  async post(endpoint: string, data?: any, options?: RequestInit): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const config = this.getRequestConfig({
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.fetchWithRetry(url, config);
  }

  async postForm(endpoint: string, formData: FormData, options?: RequestInit): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const config = this.getRequestConfig({
      ...options,
      method: 'POST',
      body: formData,
      headers: {
        // Remove Content-Type to let browser set boundary for FormData
        ...this.getRequestConfig(options).headers,
        'Content-Type': undefined,
      } as any,
    });
    return this.fetchWithRetry(url, config);
  }

  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  updateConfig(updates: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// Singleton instance
export const apiConfig = new ApiConfigManager();

// Convenience exports
export const api = {
  get: (endpoint: string, options?: RequestInit) => apiConfig.get(endpoint, options),
  post: (endpoint: string, data?: any, options?: RequestInit) => apiConfig.post(endpoint, data, options),
  postForm: (endpoint: string, formData: FormData, options?: RequestInit) => apiConfig.postForm(endpoint, formData, options),
  getBaseUrl: () => apiConfig.getBaseUrl(),
};