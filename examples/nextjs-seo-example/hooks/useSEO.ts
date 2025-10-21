import { useEffect, useState, useCallback } from 'react';
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
  enabled?: boolean;
}

export function useSEO(options: UseSEOOptions = {}) {
  const router = useRouter();
  const [seoData, setSeoData] = useState<SEOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const path = options.path || router.asPath;
  const locale = options.locale || router.locale || 'en';
  const enabled = options.enabled !== false;

  const fetchSEOData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch SEO metadata and hreflang tags in parallel
      const [seoResponse, hreflangResponse] = await Promise.allSettled([
        apiClient.getSEOMetadata(path, locale),
        apiClient.getHreflangTags(`${process.env.NEXT_PUBLIC_SITE_URL}${path}`),
      ]);

      let seoMetadata = {};
      let hreflangTags = [];

      // Handle SEO metadata response
      if (seoResponse.status === 'fulfilled') {
        seoMetadata = seoResponse.value.data;
      } else {
        console.warn('Failed to fetch SEO metadata:', seoResponse.reason);
      }

      // Handle hreflang response
      if (hreflangResponse.status === 'fulfilled') {
        hreflangTags = hreflangResponse.value.data.tags || [];
      } else {
        console.warn('Failed to fetch hreflang tags:', hreflangResponse.reason);
      }

      setSeoData({
        ...seoMetadata,
        hreflangTags,
      } as SEOData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch SEO data');
      console.error('SEO fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [path, locale, enabled]);

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

  const generateStructuredData = useCallback((type: string, data: any) => {
    const baseStructuredData = {
      '@context': 'https://schema.org',
      '@type': type,
      ...data,
    };

    setSeoData(prev => ({
      ...prev,
      structuredData: baseStructuredData,
    } as SEOData));

    return baseStructuredData;
  }, []);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchSEOData();
  }, [fetchSEOData]);

  // Refetch when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      fetchSEOData();
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, fetchSEOData]);

  return {
    seoData,
    loading,
    error,
    updateSEO,
    generateStructuredData,
    refetch: fetchSEOData,
  };
}