/**
 * API Configuration for Ghiblify
 * 
 * Centralized API client with proper error handling and configuration
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.thisyearnofear.com";

if (!API_URL) {
  console.error("[API] NEXT_PUBLIC_API_URL environment variable is not set");
}

/**
 * Centralized API client
 */
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.defaultOptions = {
      credentials: "include",
      mode: "cors",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...this.defaultOptions,
      ...options,
      headers: {
        ...this.defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Bad request");
        }
        if (response.status === 402) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Insufficient credits");
        }
        if (response.status === 404) {
          throw new Error("Endpoint not found");
        }
        if (response.status >= 500) {
          throw new Error("Server error. Please try again later.");
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle both JSON and text responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        // Handle plain text responses (like nonce endpoint)
        const text = await response.text();
        return text;
      }
    } catch (error) {
      console.error(`[API] Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: "GET" });
  }

  async post(endpoint, data = {}) {
    // Handle both query params and body data
    if (typeof data === 'string' && data.includes('=')) {
      // Query string format (for backwards compatibility)
      const url = `${endpoint}?${data}`;
      return this.request(url, { method: "POST" });
    } else {
      // JSON body format
      return this.request(endpoint, {
        method: "POST",
        body: JSON.stringify(data),
      });
    }
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }
}

// Export singleton instance
export const api = new ApiClient(API_URL);

// Export API_URL for backwards compatibility
export { API_URL };

// Default export for convenience
export default api;
    } catch (error) {
      console.error(`[API] Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: "GET" });
  }

  async post(endpoint, data = {}) {
    // Handle both query params and body data
    if (typeof data === 'string' && data.includes('=')) {
      // Query string format (for backwards compatibility)
      const url = `${endpoint}?${data}`;
      return this.request(url, { method: "POST" });
    } else {
      // JSON body format
      return this.request(endpoint, {
        method: "POST",
        body: JSON.stringify(data),
      });
    }
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }
}

// Export singleton instance
export const api = new ApiClient(API_URL);

// Export API_URL for backwards compatibility
export { API_URL };

// Default export for convenience
export default api;
