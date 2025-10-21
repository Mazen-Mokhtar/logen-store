import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

export interface ILocaleConfig {
  code: string;
  name: string;
  nativeName: string;
  region?: string;
  direction: 'ltr' | 'rtl';
  currency?: string;
  dateFormat?: string;
  numberFormat?: string;
  enabled: boolean;
  isDefault?: boolean;
}

export interface IHreflangTag {
  hreflang: string;
  href: string;
  title?: string;
}

export interface ILocalizedUrl {
  locale: string;
  url: string;
  canonical: boolean;
}

export interface ILocaleDetectionResult {
  detected: string;
  confidence: number;
  source: 'header' | 'cookie' | 'url' | 'default';
  alternatives: string[];
}

@Injectable()
export class LocaleService {
  private readonly logger = new Logger(LocaleService.name);
  private localeConfigs: Map<string, ILocaleConfig> = new Map();
  private defaultLocale: string;

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {
    this.initializeLocales();
  }

  /**
   * Initialize locale configurations
   */
  private initializeLocales(): void {
    const defaultLocales: ILocaleConfig[] = [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        region: 'US',
        direction: 'ltr',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        numberFormat: 'en-US',
        enabled: true,
        isDefault: true,
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        region: 'ES',
        direction: 'ltr',
        currency: 'EUR',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: 'es-ES',
        enabled: true,
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        region: 'FR',
        direction: 'ltr',
        currency: 'EUR',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: 'fr-FR',
        enabled: true,
      },
      {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        region: 'DE',
        direction: 'ltr',
        currency: 'EUR',
        dateFormat: 'DD.MM.YYYY',
        numberFormat: 'de-DE',
        enabled: true,
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        region: 'JP',
        direction: 'ltr',
        currency: 'JPY',
        dateFormat: 'YYYY/MM/DD',
        numberFormat: 'ja-JP',
        enabled: true,
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        region: 'SA',
        direction: 'rtl',
        currency: 'SAR',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: 'ar-SA',
        enabled: true,
      },
    ];

    // Load custom locales from config
    const customLocales = this.configService.get<ILocaleConfig[]>('CUSTOM_LOCALES', []);
    const enabledLocales = this.configService.get<string[]>('ENABLED_LOCALES', ['en']);
    
    // Merge default and custom locales
    const allLocales = [...defaultLocales, ...customLocales];
    
    allLocales.forEach(locale => {
      locale.enabled = enabledLocales.includes(locale.code);
      this.localeConfigs.set(locale.code, locale);
      
      if (locale.isDefault || locale.code === this.configService.get('DEFAULT_LOCALE', 'en')) {
        this.defaultLocale = locale.code;
      }
    });

    this.logger.log(`Initialized ${this.localeConfigs.size} locales, default: ${this.defaultLocale}`);
  }

  /**
   * Get all enabled locales
   */
  getEnabledLocales(): ILocaleConfig[] {
    return Array.from(this.localeConfigs.values()).filter(locale => locale.enabled);
  }

  /**
   * Get locale configuration
   */
  getLocaleConfig(code: string): ILocaleConfig | undefined {
    return this.localeConfigs.get(code);
  }

  /**
   * Get default locale
   */
  getDefaultLocale(): string {
    return this.defaultLocale;
  }

  /**
   * Check if locale is supported
   */
  isLocaleSupported(code: string): boolean {
    const locale = this.localeConfigs.get(code);
    return locale?.enabled || false;
  }

  /**
   * Detect locale from various sources
   */
  detectLocale(
    acceptLanguage?: string,
    cookieLocale?: string,
    urlLocale?: string,
  ): ILocaleDetectionResult {
    const alternatives: string[] = [];
    
    // Priority 1: URL locale
    if (urlLocale && this.isLocaleSupported(urlLocale)) {
      return {
        detected: urlLocale,
        confidence: 1.0,
        source: 'url',
        alternatives: this.getEnabledLocales().map(l => l.code).filter(c => c !== urlLocale),
      };
    }

    // Priority 2: Cookie locale
    if (cookieLocale && this.isLocaleSupported(cookieLocale)) {
      alternatives.push(cookieLocale);
    }

    // Priority 3: Accept-Language header
    if (acceptLanguage) {
      const parsed = this.parseAcceptLanguage(acceptLanguage);
      for (const lang of parsed) {
        if (this.isLocaleSupported(lang.code)) {
          return {
            detected: lang.code,
            confidence: lang.quality,
            source: 'header',
            alternatives: alternatives.filter(a => a !== lang.code),
          };
        }
        alternatives.push(lang.code);
      }
    }

    // Fallback to cookie if available
    if (cookieLocale && this.isLocaleSupported(cookieLocale)) {
      return {
        detected: cookieLocale,
        confidence: 0.8,
        source: 'cookie',
        alternatives: alternatives.filter(a => a !== cookieLocale),
      };
    }

    // Default locale
    return {
      detected: this.defaultLocale,
      confidence: 0.5,
      source: 'default',
      alternatives: this.getEnabledLocales().map(l => l.code).filter(c => c !== this.defaultLocale),
    };
  }

  /**
   * Parse Accept-Language header
   */
  private parseAcceptLanguage(acceptLanguage: string): Array<{ code: string; quality: number }> {
    return acceptLanguage
      .split(',')
      .map(lang => {
        const [code, q] = lang.trim().split(';q=');
        const quality = q ? parseFloat(q) : 1.0;
        const cleanCode = code.split('-')[0].toLowerCase(); // Extract language code
        return { code: cleanCode, quality };
      })
      .sort((a, b) => b.quality - a.quality);
  }

  /**
   * Generate hreflang tags for a URL
   */
  generateHreflangTags(
    currentPath: string,
    currentLocale: string,
    baseUrl?: string,
  ): IHreflangTag[] {
    const cacheKey = `hreflang:${currentPath}:${currentLocale}`;
    const cached = this.cacheService.get<IHreflangTag[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const base = baseUrl || this.configService.get('BASE_URL', 'https://example.com');
    const enabledLocales = this.getEnabledLocales();
    const tags: IHreflangTag[] = [];

    // Generate tags for all enabled locales
    enabledLocales.forEach(locale => {
      const localeConfig = this.getLocaleConfig(locale.code);
      if (!localeConfig) return;

      let href: string;
      if (locale.code === this.defaultLocale) {
        // Default locale doesn't need prefix
        href = `${base}${currentPath}`;
      } else {
        // Add locale prefix
        href = `${base}/${locale.code}${currentPath}`;
      }

      tags.push({
        hreflang: localeConfig.region ? `${locale.code}-${localeConfig.region}` : locale.code,
        href,
        title: localeConfig.nativeName,
      });
    });

    // Add x-default for default locale
    const defaultHref = `${base}${currentPath}`;
    tags.push({
      hreflang: 'x-default',
      href: defaultHref,
      title: 'Default',
    });

    // Cache for 1 hour
    this.cacheService.set(cacheKey, tags, 3600000, ['hreflang', 'locale']);

    this.logger.debug(`Generated ${tags.length} hreflang tags for ${currentPath}`);
    return tags;
  }

  /**
   * Generate localized URLs
   */
  generateLocalizedUrls(path: string, baseUrl?: string): ILocalizedUrl[] {
    const base = baseUrl || this.configService.get('BASE_URL', 'https://example.com');
    const enabledLocales = this.getEnabledLocales();
    const urls: ILocalizedUrl[] = [];

    enabledLocales.forEach(locale => {
      let url: string;
      const isDefault = locale.code === this.defaultLocale;
      
      if (isDefault) {
        url = `${base}${path}`;
      } else {
        url = `${base}/${locale.code}${path}`;
      }

      urls.push({
        locale: locale.code,
        url,
        canonical: isDefault,
      });
    });

    return urls;
  }

  /**
   * Get locale from URL path
   */
  extractLocaleFromPath(path: string): { locale: string; cleanPath: string } {
    const segments = path.split('/').filter(Boolean);
    
    if (segments.length === 0) {
      return { locale: this.defaultLocale, cleanPath: '/' };
    }

    const firstSegment = segments[0];
    if (this.isLocaleSupported(firstSegment)) {
      const cleanPath = '/' + segments.slice(1).join('/');
      return { locale: firstSegment, cleanPath: cleanPath === '/' ? '/' : cleanPath };
    }

    return { locale: this.defaultLocale, cleanPath: path };
  }

  /**
   * Build localized path
   */
  buildLocalizedPath(path: string, locale: string): string {
    if (locale === this.defaultLocale) {
      return path;
    }

    if (path === '/') {
      return `/${locale}`;
    }

    return `/${locale}${path}`;
  }

  /**
   * Get locale statistics
   */
  getLocaleStats(): {
    total: number;
    enabled: number;
    disabled: number;
    default: string;
    rtl: number;
    ltr: number;
  } {
    const all = Array.from(this.localeConfigs.values());
    const enabled = all.filter(l => l.enabled);
    
    return {
      total: all.length,
      enabled: enabled.length,
      disabled: all.length - enabled.length,
      default: this.defaultLocale,
      rtl: enabled.filter(l => l.direction === 'rtl').length,
      ltr: enabled.filter(l => l.direction === 'ltr').length,
    };
  }

  /**
   * Validate locale configuration
   */
  validateLocaleConfig(config: ILocaleConfig): string[] {
    const errors: string[] = [];

    if (!config.code || config.code.length < 2) {
      errors.push('Locale code must be at least 2 characters');
    }

    if (!config.name) {
      errors.push('Locale name is required');
    }

    if (!config.nativeName) {
      errors.push('Native name is required');
    }

    if (!['ltr', 'rtl'].includes(config.direction)) {
      errors.push('Direction must be either "ltr" or "rtl"');
    }

    return errors;
  }

  /**
   * Add or update locale configuration
   */
  updateLocaleConfig(config: ILocaleConfig): boolean {
    const errors = this.validateLocaleConfig(config);
    if (errors.length > 0) {
      this.logger.error(`Invalid locale config for ${config.code}: ${errors.join(', ')}`);
      return false;
    }

    this.localeConfigs.set(config.code, config);
    
    // Clear related cache
    this.cacheService.invalidateByTag('locale');
    this.cacheService.invalidateByTag('hreflang');

    this.logger.log(`Updated locale configuration for ${config.code}`);
    return true;
  }

  /**
   * Remove locale configuration
   */
  removeLocaleConfig(code: string): boolean {
    if (code === this.defaultLocale) {
      this.logger.error(`Cannot remove default locale: ${code}`);
      return false;
    }

    const removed = this.localeConfigs.delete(code);
    if (removed) {
      // Clear related cache
      this.cacheService.invalidateByTag('locale');
      this.cacheService.invalidateByTag('hreflang');
      
      this.logger.log(`Removed locale configuration for ${code}`);
    }

    return removed;
  }
}