import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': 'v1',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = typeof window !== 'undefined' 
          ? localStorage.getItem('auth_token') 
          : null;
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add request timestamp for debugging
        config.metadata = { startTime: new Date() };
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Calculate request duration
        const endTime = new Date();
        const duration = endTime.getTime() - response.config.metadata?.startTime?.getTime();
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`API Request: ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
        }
        
        return response;
      },
      (error) => {
        const duration = error.config?.metadata?.startTime 
          ? new Date().getTime() - error.config.metadata.startTime.getTime()
          : 0;
          
        console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${duration}ms`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    const response: AxiosResponse<T> = await this.client.get(url, { params });
    return {
      data: response.data,
      status: response.status,
    };
  }

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response: AxiosResponse<T> = await this.client.post(url, data);
    return {
      data: response.data,
      status: response.status,
    };
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response: AxiosResponse<T> = await this.client.put(url, data);
    return {
      data: response.data,
      status: response.status,
    };
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    const response: AxiosResponse<T> = await this.client.delete(url);
    return {
      data: response.data,
      status: response.status,
    };
  }

  // Health check specific methods
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.get('/health');
  }

  async detailedHealthCheck(): Promise<ApiResponse<any>> {
    return this.get('/health/detailed');
  }

  async healthMetrics(): Promise<ApiResponse<any>> {
    return this.get('/health/health-metrics');
  }

  // SEO specific methods
  async getSEOMetadata(path: string, locale?: string): Promise<ApiResponse<any>> {
    return this.get('/seo/metadata', { path, locale });
  }

  async getHreflangTags(url: string): Promise<ApiResponse<any>> {
    return this.get('/seo/locale/hreflang', { url });
  }

  async getLocaleConfig(): Promise<ApiResponse<any>> {
    return this.get('/seo/locale/config');
  }

  async getLocalizedUrls(basePath: string): Promise<ApiResponse<any>> {
    return this.get('/seo/locale/urls', { basePath });
  }
}

export const apiClient = new ApiClient();