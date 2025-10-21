# Next.js Integration Guide

This guide provides comprehensive examples for integrating your Next.js application with the enhanced SEO and health check system.

## Table of Contents

1. [Setup and Configuration](#setup-and-configuration)
2. [SEO Integration](#seo-integration)
3. [Health Check Integration](#health-check-integration)
4. [Locale Management](#locale-management)
5. [Sitemap Integration](#sitemap-integration)
6. [API Routes Examples](#api-routes-examples)
7. [TypeScript Definitions](#typescript-definitions)

## Setup and Configuration

### Environment Variables

Create a `.env.local` file in your Next.js project:

```env
# Backend API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3000

# SEO Configuration
NEXT_PUBLIC_SITE_URL=https://yoursite.com
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_SUPPORTED_LOCALES=en,es,fr,de

# Health Check Configuration
NEXT_PUBLIC_HEALTH_CHECK_INTERVAL=30000
```

### API Client Setup

Create an API client for communicating with your backend:

```typescript
// lib/api-client.ts
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
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
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
}

export const apiClient = new ApiClient();
```

## SEO Integration

### SEO Hook for React Components

```typescript
// hooks/useSEO.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '../lib/api-client';

export interface SEOData {
  title: string;
  description: string;
  keywords: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  structuredData?: any;
  hreflangTags?: Array<{
    hreflang: string;
    href: string;
  }>;
}

export interface UseSEOOptions {
  path?: string;
  locale?: string;
  autoGenerate?: boolean;
}

export function useSEO(options: UseSEOOptions = {}) {
  const router = useRouter();
  const [seoData, setSeoData] = useState<SEOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const path = options.path || router.asPath;
  const locale = options.locale || router.locale || 'en';

  useEffect(() => {
    const fetchSEOData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch SEO metadata
        const seoResponse = await apiClient.get('/seo/metadata', {
          path,
          locale,
        });

        // Fetch hreflang tags
        const hreflangResponse = await apiClient.get('/seo/locale/hreflang', {
          url: `${process.env.NEXT_PUBLIC_SITE_URL}${path}`,
        });

        setSeoData({
          ...seoResponse.data,
          hreflangTags: hreflangResponse.data.tags,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to fetch SEO data');
        console.error('SEO fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSEOData();
  }, [path, locale]);

  const updateSEO = async (newSeoData: Partial<SEOData>) => {
    try {
      const response = await apiClient.post('/seo/metadata', {
        path,
        locale,
        ...newSeoData,
      });
      
      setSeoData(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to update SEO data');
      throw err;
    }
  };

  return {
    seoData,
    loading,
    error,
    updateSEO,
  };
}
```

### SEO Head Component

```typescript
// components/SEOHead.tsx
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSEO, SEOData } from '../hooks/useSEO';

interface SEOHeadProps {
  seoData?: Partial<SEOData>;
  path?: string;
  locale?: string;
}

export function SEOHead({ seoData: propSeoData, path, locale }: SEOHeadProps) {
  const router = useRouter();
  const { seoData: fetchedSeoData, loading } = useSEO({ path, locale });
  
  const seoData = propSeoData || fetchedSeoData;
  
  if (loading || !seoData) {
    return (
      <Head>
        <title>Loading...</title>
      </Head>
    );
  }

  const currentUrl = `${process.env.NEXT_PUBLIC_SITE_URL}${router.asPath}`;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{seoData.title}</title>
      <meta name="description" content={seoData.description} />
      {seoData.keywords && (
        <meta name="keywords" content={seoData.keywords.join(', ')} />
      )}
      
      {/* Canonical URL */}
      <link rel="canonical" href={seoData.canonical || currentUrl} />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={seoData.title} />
      <meta property="og:description" content={seoData.description} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:type" content={seoData.ogType || 'website'} />
      {seoData.ogImage && (
        <meta property="og:image" content={seoData.ogImage} />
      )}
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={seoData.twitterCard || 'summary_large_image'} />
      <meta name="twitter:title" content={seoData.title} />
      <meta name="twitter:description" content={seoData.description} />
      {seoData.ogImage && (
        <meta name="twitter:image" content={seoData.ogImage} />
      )}
      
      {/* Hreflang Tags */}
      {seoData.hreflangTags?.map((tag, index) => (
        <link
          key={index}
          rel="alternate"
          hrefLang={tag.hreflang}
          href={tag.href}
        />
      ))}
      
      {/* Structured Data */}
      {seoData.structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(seoData.structuredData),
          }}
        />
      )}
    </Head>
  );
}
```

## Health Check Integration

### Health Check Hook

```typescript
// hooks/useHealthCheck.ts
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../lib/api-client';

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks?: Record<string, any>;
}

export interface HealthMetrics {
  memory: {
    heap: { used: number; total: number; usagePercent: number };
    system: { used: number; total: number; usagePercent: number };
  };
  cpu: {
    usage: Record<string, number>;
    loadAverage: number[];
  };
  application: Record<string, any>;
  database: { readyState: number };
}

export function useHealthCheck(interval: number = 30000) {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthStatus = useCallback(async () => {
    try {
      const response = await apiClient.get<HealthStatus>('/health');
      setHealthStatus(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Health check failed');
      console.error('Health check error:', err);
    }
  }, []);

  const fetchHealthMetrics = useCallback(async () => {
    try {
      const response = await apiClient.get<HealthMetrics>('/health/health-metrics');
      setHealthMetrics(response.data);
    } catch (err: any) {
      console.error('Health metrics error:', err);
    }
  }, []);

  const fetchDetailedHealth = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchHealthStatus(), fetchHealthMetrics()]);
    } finally {
      setLoading(false);
    }
  }, [fetchHealthStatus, fetchHealthMetrics]);

  useEffect(() => {
    fetchDetailedHealth();
    
    const intervalId = setInterval(fetchDetailedHealth, interval);
    
    return () => clearInterval(intervalId);
  }, [fetchDetailedHealth, interval]);

  return {
    healthStatus,
    healthMetrics,
    loading,
    error,
    refetch: fetchDetailedHealth,
  };
}
```

### Health Status Component

```typescript
// components/HealthStatus.tsx
import { useHealthCheck } from '../hooks/useHealthCheck';

interface HealthStatusProps {
  showMetrics?: boolean;
  interval?: number;
}

export function HealthStatus({ showMetrics = false, interval }: HealthStatusProps) {
  const { healthStatus, healthMetrics, loading, error, refetch } = useHealthCheck(interval);

  if (loading) {
    return <div className="health-status loading">Checking system health...</div>;
  }

  if (error) {
    return (
      <div className="health-status error">
        <span>Health check failed: {error}</span>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  if (!healthStatus) {
    return <div className="health-status unknown">Health status unknown</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'warning': return 'orange';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="health-status">
      <div className="status-indicator">
        <span 
          className="status-dot" 
          style={{ backgroundColor: getStatusColor(healthStatus.status) }}
        />
        <span className="status-text">
          System {healthStatus.status} - Uptime: {Math.floor(healthStatus.uptime / 3600)}h
        </span>
      </div>
      
      {showMetrics && healthMetrics && (
        <div className="health-metrics">
          <div className="metric">
            <span>Memory Usage:</span>
            <span>{healthMetrics.memory.heap.usagePercent.toFixed(1)}%</span>
          </div>
          <div className="metric">
            <span>CPU Load:</span>
            <span>{healthMetrics.cpu.loadAverage[0]?.toFixed(2) || 'N/A'}</span>
          </div>
          <div className="metric">
            <span>Database:</span>
            <span>{healthMetrics.database.readyState === 1 ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Locale Management

### Locale Hook

```typescript
// hooks/useLocale.ts
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '../lib/api-client';

export interface LocaleConfig {
  code: string;
  name: string;
  nativeName: string;
  enabled: boolean;
  default: boolean;
  rtl: boolean;
}

export interface LocalizedUrl {
  locale: string;
  url: string;
  hreflang: string;
}

export function useLocale() {
  const router = useRouter();
  const [locales, setLocales] = useState<LocaleConfig[]>([]);
  const [currentLocale, setCurrentLocale] = useState<LocaleConfig | null>(null);
  const [localizedUrls, setLocalizedUrls] = useState<LocalizedUrl[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocaleConfig = useCallback(async () => {
    try {
      const response = await apiClient.get<LocaleConfig[]>('/seo/locale/config');
      setLocales(response.data);
      
      const current = response.data.find(l => l.code === router.locale) || response.data[0];
      setCurrentLocale(current);
    } catch (error) {
      console.error('Failed to fetch locale config:', error);
    }
  }, [router.locale]);

  const fetchLocalizedUrls = useCallback(async () => {
    try {
      const response = await apiClient.get<LocalizedUrl[]>('/seo/locale/urls', {
        basePath: router.asPath.split('?')[0], // Remove query params
      });
      setLocalizedUrls(response.data);
    } catch (error) {
      console.error('Failed to fetch localized URLs:', error);
    }
  }, [router.asPath]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchLocaleConfig(), fetchLocalizedUrls()]);
      setLoading(false);
    };

    fetchData();
  }, [fetchLocaleConfig, fetchLocalizedUrls]);

  const switchLocale = useCallback((localeCode: string) => {
    const targetUrl = localizedUrls.find(url => url.locale === localeCode)?.url;
    if (targetUrl) {
      router.push(targetUrl);
    } else {
      router.push(router.asPath, router.asPath, { locale: localeCode });
    }
  }, [router, localizedUrls]);

  return {
    locales,
    currentLocale,
    localizedUrls,
    loading,
    switchLocale,
  };
}
```

### Language Switcher Component

```typescript
// components/LanguageSwitcher.tsx
import { useState } from 'react';
import { useLocale } from '../hooks/useLocale';

export function LanguageSwitcher() {
  const { locales, currentLocale, loading, switchLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  if (loading || !currentLocale) {
    return <div className="language-switcher loading">Loading...</div>;
  }

  const enabledLocales = locales.filter(locale => locale.enabled);

  return (
    <div className="language-switcher">
      <button
        className="current-locale"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="locale-flag">🌐</span>
        <span className="locale-name">{currentLocale.nativeName}</span>
        <span className="dropdown-arrow">▼</span>
      </button>
      
      {isOpen && (
        <ul className="locale-dropdown" role="listbox">
          {enabledLocales.map((locale) => (
            <li key={locale.code} role="option">
              <button
                className={`locale-option ${locale.code === currentLocale.code ? 'active' : ''}`}
                onClick={() => {
                  switchLocale(locale.code);
                  setIsOpen(false);
                }}
              >
                <span className="locale-native">{locale.nativeName}</span>
                <span className="locale-english">({locale.name})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## API Routes Examples

### SEO API Route

```typescript
// pages/api/seo/[...params].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { apiClient } from '../../../lib/api-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { params } = req.query;
  const path = Array.isArray(params) ? params.join('/') : params;

  try {
    switch (req.method) {
      case 'GET':
        const response = await apiClient.get(`/seo/${path}`, req.query);
        res.status(200).json(response.data);
        break;
        
      case 'POST':
        const postResponse = await apiClient.post(`/seo/${path}`, req.body);
        res.status(200).json(postResponse.data);
        break;
        
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    console.error('SEO API Error:', error);
    res.status(error.response?.status || 500).json({
      error: error.message || 'Internal Server Error',
    });
  }
}
```

### Health Check API Route

```typescript
// pages/api/health/[...params].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { apiClient } from '../../../lib/api-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { params } = req.query;
  const path = Array.isArray(params) ? params.join('/') : params || '';

  try {
    const response = await apiClient.get(`/health/${path}`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('Health API Error:', error);
    res.status(error.response?.status || 500).json({
      error: error.message || 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
}
```

## TypeScript Definitions

```typescript
// types/api.ts
export interface ApiError {
  message: string;
  statusCode: number;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  structuredData?: Record<string, any>;
}

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  details: Record<string, any>;
  timestamp: string;
}
```

## Usage Examples

### Page with SEO Integration

```typescript
// pages/products/[slug].tsx
import { GetServerSideProps } from 'next';
import { SEOHead } from '../../components/SEOHead';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

interface ProductPageProps {
  product: any;
  seoData: any;
}

export default function ProductPage({ product, seoData }: ProductPageProps) {
  return (
    <>
      <SEOHead seoData={seoData} />
      <header>
        <LanguageSwitcher />
      </header>
      <main>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params, locale }) => {
  const { slug } = params!;
  
  try {
    // Fetch product data
    const productResponse = await fetch(`${process.env.API_BASE_URL}/products/${slug}`);
    const product = await productResponse.json();
    
    // Fetch SEO data
    const seoResponse = await fetch(
      `${process.env.API_BASE_URL}/seo/metadata?path=/products/${slug}&locale=${locale}`
    );
    const seoData = await seoResponse.json();
    
    return {
      props: {
        product,
        seoData,
      },
    };
  } catch (error) {
    return {
      notFound: true,
    };
  }
};
```

### Admin Dashboard with Health Monitoring

```typescript
// pages/admin/dashboard.tsx
import { HealthStatus } from '../../components/HealthStatus';
import { useHealthCheck } from '../../hooks/useHealthCheck';

export default function AdminDashboard() {
  const { healthStatus, healthMetrics, loading, error } = useHealthCheck(5000); // Check every 5 seconds

  return (
    <div className="admin-dashboard">
      <h1>System Dashboard</h1>
      
      <section className="health-section">
        <h2>System Health</h2>
        <HealthStatus showMetrics={true} interval={5000} />
        
        {healthMetrics && (
          <div className="detailed-metrics">
            <h3>Detailed Metrics</h3>
            <pre>{JSON.stringify(healthMetrics, null, 2)}</pre>
          </div>
        )}
      </section>
    </div>
  );
}
```

This integration guide provides a complete foundation for connecting your Next.js application with the enhanced SEO and health check system. The examples include proper error handling, TypeScript support, and production-ready patterns.