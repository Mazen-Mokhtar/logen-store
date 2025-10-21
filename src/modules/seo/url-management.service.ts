import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

export interface IRedirectRule {
  from: string;
  to: string;
  type: 301 | 302 | 307 | 308;
  condition?: 'exact' | 'prefix' | 'regex';
  enabled: boolean;
  priority: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUrlNormalizationOptions {
  enforceTrailingSlash?: boolean;
  removeTrailingSlash?: boolean;
  enforceLowercase?: boolean;
  removeIndexHtml?: boolean;
  removeWww?: boolean;
  enforceHttps?: boolean;
  removeQueryParams?: string[];
  sortQueryParams?: boolean;
}

export interface IUrlSecurityOptions {
  allowedProtocols: string[];
  blockedPaths: string[];
  maxUrlLength: number;
  allowedFileExtensions: string[];
  sanitizeSpecialChars: boolean;
  preventDirectoryTraversal: boolean;
}

@Injectable()
export class UrlManagementService {
  private readonly logger = new Logger(UrlManagementService.name);
  private redirectRules = new Map<string, IRedirectRule>();
  private normalizationOptions: IUrlNormalizationOptions;
  private securityOptions: IUrlSecurityOptions;
  private readonly enableCaching: boolean;

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {
    this.enableCaching = this.configService.get<boolean>('SEO_URL_CACHE_ENABLED', true);
    
    // Initialize normalization options
    this.normalizationOptions = {
      enforceTrailingSlash: this.configService.get<boolean>('SEO_ENFORCE_TRAILING_SLASH', false),
      removeTrailingSlash: this.configService.get<boolean>('SEO_REMOVE_TRAILING_SLASH', true),
      enforceLowercase: this.configService.get<boolean>('SEO_ENFORCE_LOWERCASE', true),
      removeIndexHtml: this.configService.get<boolean>('SEO_REMOVE_INDEX_HTML', true),
      removeWww: this.configService.get<boolean>('SEO_REMOVE_WWW', false),
      enforceHttps: this.configService.get<boolean>('SEO_ENFORCE_HTTPS', true),
      removeQueryParams: this.configService.get<string[]>('SEO_REMOVE_QUERY_PARAMS', ['utm_source', 'utm_medium', 'utm_campaign']),
      sortQueryParams: this.configService.get<boolean>('SEO_SORT_QUERY_PARAMS', true),
    };

    // Initialize security options
    this.securityOptions = {
      allowedProtocols: this.configService.get<string[]>('SEO_ALLOWED_PROTOCOLS', ['http', 'https']),
      blockedPaths: this.configService.get<string[]>('SEO_BLOCKED_PATHS', ['/admin', '/api/internal', '/.env']),
      maxUrlLength: this.configService.get<number>('SEO_MAX_URL_LENGTH', 2048),
      allowedFileExtensions: this.configService.get<string[]>('SEO_ALLOWED_EXTENSIONS', ['.html', '.htm', '.php', '.asp', '.aspx', '.jsp']),
      sanitizeSpecialChars: this.configService.get<boolean>('SEO_SANITIZE_SPECIAL_CHARS', true),
      preventDirectoryTraversal: this.configService.get<boolean>('SEO_PREVENT_DIRECTORY_TRAVERSAL', true),
    };

    this.initializeDefaultRedirects();
    this.logger.log('URL Management Service initialized');
  }

  /**
   * Initialize default redirect rules
   */
  private initializeDefaultRedirects(): void {
    // Common redirect patterns
    const defaultRules: Omit<IRedirectRule, 'createdAt' | 'updatedAt'>[] = [
      {
        from: '/home',
        to: '/',
        type: 301,
        condition: 'exact',
        enabled: true,
        priority: 100,
        description: 'Redirect /home to homepage',
      },
      {
        from: '/index.html',
        to: '/',
        type: 301,
        condition: 'exact',
        enabled: true,
        priority: 100,
        description: 'Remove index.html from homepage',
      },
      {
        from: '/index.php',
        to: '/',
        type: 301,
        condition: 'exact',
        enabled: true,
        priority: 100,
        description: 'Remove index.php from homepage',
      },
    ];

    defaultRules.forEach(rule => {
      this.addRedirectRule({
        ...rule,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  }

  /**
   * Add a redirect rule
   */
  addRedirectRule(rule: IRedirectRule): void {
    this.redirectRules.set(rule.from, rule);
    
    // Invalidate cache for this URL pattern
    if (this.enableCaching) {
      this.cacheService.invalidateByTag(`url:${rule.from}`);
    }
    
    this.logger.debug(`Added redirect rule: ${rule.from} -> ${rule.to} (${rule.type})`);
  }

  /**
   * Remove a redirect rule
   */
  removeRedirectRule(from: string): boolean {
    const removed = this.redirectRules.delete(from);
    
    if (removed && this.enableCaching) {
      this.cacheService.invalidateByTag(`url:${from}`);
    }
    
    return removed;
  }

  /**
   * Get all redirect rules
   */
  getRedirectRules(): IRedirectRule[] {
    return Array.from(this.redirectRules.values())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if URL needs redirect and return redirect info
   */
  checkRedirect(url: string): { redirect: boolean; to?: string; type?: number; rule?: IRedirectRule } {
    const cacheKey = `redirect:${url}`;
    
    if (this.enableCaching) {
      const cached = this.cacheService.get(cacheKey);
      if (cached) {
        return cached as { redirect: boolean; to?: string; type?: number; rule?: IRedirectRule };
      }
    }

    // Check normalization first
    const normalizedUrl = this.normalizeUrl(url);
    if (normalizedUrl !== url) {
      const result = {
        redirect: true,
        to: normalizedUrl,
        type: 301,
        rule: {
          from: url,
          to: normalizedUrl,
          type: 301 as const,
          condition: 'normalization' as any,
          enabled: true,
          priority: 1000,
          description: 'URL normalization redirect',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      
      if (this.enableCaching) {
        this.cacheService.set(cacheKey, result, 3600000, [`url:${url}`]); // 1 hour cache
      }
      
      return result;
    }

    // Check explicit redirect rules
    const sortedRules = Array.from(this.redirectRules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.matchesRule(url, rule)) {
        const result = {
          redirect: true,
          to: rule.to,
          type: rule.type,
          rule,
        };
        
        if (this.enableCaching) {
          this.cacheService.set(cacheKey, result, 3600000, [`url:${url}`]);
        }
        
        return result;
      }
    }

    const result = { redirect: false };
    
    if (this.enableCaching) {
      this.cacheService.set(cacheKey, result, 3600000, [`url:${url}`]);
    }
    
    return result;
  }

  /**
   * Normalize URL according to configured rules
   */
  normalizeUrl(url: string): string {
    let normalized = url;

    try {
      const urlObj = new URL(url, 'https://example.com');
      
      // Enforce HTTPS
      if (this.normalizationOptions.enforceHttps && urlObj.protocol === 'http:') {
        urlObj.protocol = 'https:';
      }

      // Remove www
      if (this.normalizationOptions.removeWww && urlObj.hostname.startsWith('www.')) {
        urlObj.hostname = urlObj.hostname.substring(4);
      }

      // Enforce lowercase
      if (this.normalizationOptions.enforceLowercase) {
        urlObj.pathname = urlObj.pathname.toLowerCase();
      }

      // Remove index.html
      if (this.normalizationOptions.removeIndexHtml) {
        urlObj.pathname = urlObj.pathname.replace(/\/index\.(html?|php|asp|aspx|jsp)$/i, '/');
      }

      // Handle trailing slash
      if (this.normalizationOptions.removeTrailingSlash && urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
        urlObj.pathname = urlObj.pathname.slice(0, -1);
      } else if (this.normalizationOptions.enforceTrailingSlash && !urlObj.pathname.endsWith('/') && !this.hasFileExtension(urlObj.pathname)) {
        urlObj.pathname += '/';
      }

      // Handle query parameters
      if (this.normalizationOptions.removeQueryParams && this.normalizationOptions.removeQueryParams.length > 0) {
        this.normalizationOptions.removeQueryParams.forEach(param => {
          urlObj.searchParams.delete(param);
        });
      }

      // Sort query parameters
      if (this.normalizationOptions.sortQueryParams) {
        const sortedParams = new URLSearchParams();
        Array.from(urlObj.searchParams.keys())
          .sort()
          .forEach(key => {
            urlObj.searchParams.getAll(key).forEach(value => {
              sortedParams.append(key, value);
            });
          });
        urlObj.search = sortedParams.toString();
      }

      normalized = urlObj.toString();
      
      // If we started with a relative URL, return relative
      if (!url.startsWith('http')) {
        normalized = urlObj.pathname + urlObj.search + urlObj.hash;
      }

    } catch (error) {
      this.logger.warn(`Failed to normalize URL: ${url}`, error);
      return url;
    }

    return normalized;
  }

  /**
   * Validate URL for security issues
   */
  validateUrl(url: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    try {
      // Check URL length
      if (url.length > this.securityOptions.maxUrlLength) {
        issues.push(`URL exceeds maximum length of ${this.securityOptions.maxUrlLength} characters`);
      }

      // Parse URL
      const urlObj = new URL(url, 'https://example.com');

      // Check protocol
      if (!this.securityOptions.allowedProtocols.includes(urlObj.protocol.slice(0, -1))) {
        issues.push(`Protocol ${urlObj.protocol} is not allowed`);
      }

      // Check for blocked paths
      const pathname = urlObj.pathname.toLowerCase();
      for (const blockedPath of this.securityOptions.blockedPaths) {
        if (pathname.startsWith(blockedPath.toLowerCase())) {
          issues.push(`Path ${pathname} is blocked`);
        }
      }

      // Check for directory traversal
      if (this.securityOptions.preventDirectoryTraversal) {
        if (pathname.includes('../') || pathname.includes('..\\') || pathname.includes('%2e%2e')) {
          issues.push('Directory traversal attempt detected');
        }
      }

      // Check file extension if applicable
      const hasExtension = this.hasFileExtension(pathname);
      if (hasExtension) {
        const extension = pathname.substring(pathname.lastIndexOf('.'));
        if (!this.securityOptions.allowedFileExtensions.includes(extension.toLowerCase())) {
          issues.push(`File extension ${extension} is not allowed`);
        }
      }

      // Sanitize special characters
      if (this.securityOptions.sanitizeSpecialChars) {
        const dangerousChars = /<|>|"|'|&|javascript:|data:|vbscript:/i;
        if (dangerousChars.test(url)) {
          issues.push('URL contains potentially dangerous characters');
        }
      }

    } catch (error) {
      issues.push('Invalid URL format');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Sanitize URL by removing/encoding dangerous characters
   */
  sanitizeUrl(url: string): string {
    let sanitized = url;

    // Remove dangerous protocols
    sanitized = sanitized.replace(/^(javascript|data|vbscript):/i, '');

    // Encode special characters
    sanitized = sanitized
      .replace(/</g, '%3C')
      .replace(/>/g, '%3E')
      .replace(/"/g, '%22')
      .replace(/'/g, '%27');

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    return sanitized;
  }

  /**
   * Generate canonical URL with proper normalization
   */
  getCanonicalUrl(path: string, baseUrl?: string): string {
    const base = baseUrl || this.configService.get<string>('SITE_URL', 'https://example.com');
    const fullUrl = new URL(path, base).toString();
    return this.normalizeUrl(fullUrl);
  }

  /**
   * Generate alternate URLs for different locales
   */
  generateAlternateUrls(path: string, locales: string[], baseUrl?: string): Array<{ locale: string; url: string }> {
    const base = baseUrl || this.configService.get<string>('SITE_URL', 'https://example.com');
    
    return locales.map(locale => ({
      locale,
      url: this.getCanonicalUrl(`/${locale}${path}`, base),
    }));
  }

  /**
   * Bulk import redirect rules
   */
  importRedirectRules(rules: Omit<IRedirectRule, 'createdAt' | 'updatedAt'>[]): { imported: number; errors: string[] } {
    let imported = 0;
    const errors: string[] = [];

    for (const rule of rules) {
      try {
        this.addRedirectRule({
          ...rule,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        imported++;
      } catch (error) {
        errors.push(`Failed to import rule ${rule.from} -> ${rule.to}: ${error.message}`);
      }
    }

    this.logger.log(`Imported ${imported} redirect rules with ${errors.length} errors`);
    return { imported, errors };
  }

  /**
   * Export redirect rules
   */
  exportRedirectRules(): IRedirectRule[] {
    return this.getRedirectRules();
  }

  /**
   * Get URL management statistics
   */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    disabledRules: number;
    rulesByType: Record<number, number>;
    normalizationOptions: IUrlNormalizationOptions;
    securityOptions: IUrlSecurityOptions;
  } {
    const rules = Array.from(this.redirectRules.values());
    const enabledRules = rules.filter(r => r.enabled);
    const rulesByType = rules.reduce((acc, rule) => {
      acc[rule.type] = (acc[rule.type] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      totalRules: rules.length,
      enabledRules: enabledRules.length,
      disabledRules: rules.length - enabledRules.length,
      rulesByType,
      normalizationOptions: { ...this.normalizationOptions },
      securityOptions: { ...this.securityOptions },
    };
  }

  // Private helper methods

  private matchesRule(url: string, rule: IRedirectRule): boolean {
    switch (rule.condition) {
      case 'exact':
        return url === rule.from;
      case 'prefix':
        return url.startsWith(rule.from);
      case 'regex':
        try {
          const regex = new RegExp(rule.from);
          return regex.test(url);
        } catch {
          return false;
        }
      default:
        return url === rule.from;
    }
  }

  private hasFileExtension(path: string): boolean {
    const lastSegment = path.split('/').pop() || '';
    return lastSegment.includes('.') && !lastSegment.endsWith('.');
  }
}