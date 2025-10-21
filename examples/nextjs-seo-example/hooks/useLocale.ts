import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '../lib/api-client';

export interface Locale {
  code: string;
  name: string;
  nativeName: string;
  enabled: boolean;
  isDefault: boolean;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  timeFormat: string;
  currency: string;
  flag?: string;
}

export interface LocaleConfig {
  locales: Locale[];
  defaultLocale: string;
  fallbackLocale: string;
  enabledLocales: string[];
}

export interface LocaleUrls {
  [localeCode: string]: {
    [path: string]: string;
  };
}

interface UseLocaleReturn {
  locales: Locale[];
  currentLocale: Locale | null;
  localeConfig: LocaleConfig | null;
  localeUrls: LocaleUrls | null;
  loading: boolean;
  error: string | null;
  switchLocale: (localeCode: string) => Promise<void>;
  getLocalizedUrl: (path: string, localeCode?: string) => string;
  formatDate: (date: Date, localeCode?: string) => string;
  formatCurrency: (amount: number, localeCode?: string) => string;
  isRTL: (localeCode?: string) => boolean;
  refreshLocaleData: () => Promise<void>;
}

export function useLocale(): UseLocaleReturn {
  const router = useRouter();
  const [locales, setLocales] = useState<Locale[]>([]);
  const [localeConfig, setLocaleConfig] = useState<LocaleConfig | null>(null);
  const [localeUrls, setLocaleUrls] = useState<LocaleUrls | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current locale from router
  const currentLocale = locales.find(locale => locale.code === router.locale) || null;

  // Fetch locale configuration
  const fetchLocaleConfig = useCallback(async () => {
    try {
      const config = await apiClient.get<LocaleConfig>('/seo/locale/config');
      setLocaleConfig(config);
      setLocales(config.locales);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch locale config:', err);
      setError('Failed to load locale configuration');
      
      // Fallback to basic configuration
      const fallbackLocales: Locale[] = [
        {
          code: 'en',
          name: 'English',
          nativeName: 'English',
          enabled: true,
          isDefault: true,
          direction: 'ltr',
          dateFormat: 'MM/dd/yyyy',
          timeFormat: '12h',
          currency: 'USD'
        }
      ];
      setLocales(fallbackLocales);
      setLocaleConfig({
        locales: fallbackLocales,
        defaultLocale: 'en',
        fallbackLocale: 'en',
        enabledLocales: ['en']
      });
    }
  }, []);

  // Fetch locale URLs
  const fetchLocaleUrls = useCallback(async () => {
    try {
      const urls = await apiClient.get<LocaleUrls>('/seo/locale/urls');
      setLocaleUrls(urls);
    } catch (err) {
      console.error('Failed to fetch locale URLs:', err);
      // Continue without locale URLs - not critical
    }
  }, []);

  // Initialize locale data
  const refreshLocaleData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchLocaleConfig(),
      fetchLocaleUrls()
    ]);
    setLoading(false);
  }, [fetchLocaleConfig, fetchLocaleUrls]);

  // Switch to a different locale
  const switchLocale = useCallback(async (localeCode: string) => {
    const targetLocale = locales.find(locale => locale.code === localeCode);
    if (!targetLocale || !targetLocale.enabled) {
      console.warn(`Locale ${localeCode} is not available or enabled`);
      return;
    }

    try {
      // Get the current path
      const currentPath = router.asPath;
      
      // Try to get localized URL if available
      let targetPath = currentPath;
      if (localeUrls && localeUrls[localeCode] && localeUrls[localeCode][currentPath]) {
        targetPath = localeUrls[localeCode][currentPath];
      }

      // Navigate to the new locale
      await router.push(targetPath, targetPath, { locale: localeCode });
      
      // Update document direction for RTL languages
      if (typeof document !== 'undefined') {
        document.documentElement.dir = targetLocale.direction;
        document.documentElement.lang = localeCode;
      }
    } catch (err) {
      console.error('Failed to switch locale:', err);
      setError(`Failed to switch to ${targetLocale.name}`);
    }
  }, [locales, localeUrls, router]);

  // Get localized URL for a path
  const getLocalizedUrl = useCallback((path: string, localeCode?: string): string => {
    const targetLocale = localeCode || router.locale || 'en';
    
    // Check if we have a specific localized URL
    if (localeUrls && localeUrls[targetLocale] && localeUrls[targetLocale][path]) {
      return localeUrls[targetLocale][path];
    }
    
    // Return the path with locale prefix if not default locale
    const defaultLocale = localeConfig?.defaultLocale || 'en';
    if (targetLocale === defaultLocale) {
      return path;
    }
    
    return `/${targetLocale}${path}`;
  }, [router.locale, localeUrls, localeConfig]);

  // Format date according to locale
  const formatDate = useCallback((date: Date, localeCode?: string): string => {
    const targetLocale = localeCode || router.locale || 'en';
    const locale = locales.find(l => l.code === targetLocale);
    
    try {
      return new Intl.DateTimeFormat(targetLocale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...(locale?.timeFormat === '24h' ? { hour12: false } : {})
      }).format(date);
    } catch (err) {
      // Fallback to basic formatting
      return date.toLocaleDateString(targetLocale);
    }
  }, [router.locale, locales]);

  // Format currency according to locale
  const formatCurrency = useCallback((amount: number, localeCode?: string): string => {
    const targetLocale = localeCode || router.locale || 'en';
    const locale = locales.find(l => l.code === targetLocale);
    const currency = locale?.currency || 'USD';
    
    try {
      return new Intl.NumberFormat(targetLocale, {
        style: 'currency',
        currency: currency
      }).format(amount);
    } catch (err) {
      // Fallback to basic formatting
      return `${currency} ${amount.toFixed(2)}`;
    }
  }, [router.locale, locales]);

  // Check if locale is RTL
  const isRTL = useCallback((localeCode?: string): boolean => {
    const targetLocale = localeCode || router.locale || 'en';
    const locale = locales.find(l => l.code === targetLocale);
    return locale?.direction === 'rtl';
  }, [router.locale, locales]);

  // Initialize on mount and when router locale changes
  useEffect(() => {
    refreshLocaleData();
  }, [refreshLocaleData]);

  // Update document attributes when locale changes
  useEffect(() => {
    if (currentLocale && typeof document !== 'undefined') {
      document.documentElement.dir = currentLocale.direction;
      document.documentElement.lang = currentLocale.code;
    }
  }, [currentLocale]);

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    locales,
    currentLocale,
    localeConfig,
    localeUrls,
    loading,
    error,
    switchLocale,
    getLocalizedUrl,
    formatDate,
    formatCurrency,
    isRTL,
    refreshLocaleData
  };
}