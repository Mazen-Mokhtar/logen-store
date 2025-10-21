import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetadataService } from './metadata.service';
import { SitemapService } from './sitemap.service';
import { StructuredDataService } from './structured-data.service';
import { UrlOptimizationService } from './url-optimization.service';
import { CacheService } from './cache.service';
import { ISeoMetadata, IRedirectRule, ISeoConfig } from './interfaces/seo.interface';

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);
  private readonly redirectRules: Map<string, IRedirectRule> = new Map();

  constructor(
    private configService: ConfigService,
    private metadataService: MetadataService,
    private sitemapService: SitemapService,
    private structuredDataService: StructuredDataService,
    private urlOptimizationService: UrlOptimizationService,
    private cacheService: CacheService,
  ) {
    this.initializeRedirectRules();
  }

  /**
   * Get comprehensive SEO data for a page
   */
  async getPageSeoData(
    type: 'product' | 'category' | 'homepage' | 'custom',
    identifier?: string,
    customData?: Partial<ISeoMetadata>,
  ): Promise<{
    metadata: ISeoMetadata;
    structuredData: any;
    canonicalUrl: string;
    breadcrumbs?: Array<{ name: string; url: string }>;
  }> {
    const cacheKey = `seo:page:${type}:${identifier || 'default'}`;
    const cached = this.cacheService.get(cacheKey) as {
      metadata: ISeoMetadata;
      structuredData: any;
      canonicalUrl: string;
      breadcrumbs?: Array<{ name: string; url: string }>;
    } | null;
    
    if (cached) {
      return cached;
    }

    let metadata: ISeoMetadata;
    let structuredData: any;
    let canonicalUrl: string;
    let breadcrumbs: Array<{ name: string; url: string }> | undefined;

    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');

    switch (type) {
      case 'product':
        if (!identifier) throw new Error('Product identifier is required');
        // Create a mock product object for the metadata service
        const product = {
          id: identifier,
          name: identifier.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: `Product description for ${identifier.replace(/-/g, ' ')}`,
          price: 99.99,
          currency: 'USD',
          availability: 'InStock' as const,
          slug: identifier
        };
        metadata = await this.metadataService.generateProductMetadata(product);
        structuredData = await this.structuredDataService.generateProductStructuredData(product);
        canonicalUrl = this.urlOptimizationService.getCanonicalUrl(`/product/${identifier}`);
        breadcrumbs = await this.urlOptimizationService.generateBreadcrumbs(`/product/${identifier}`);
        break;

      case 'category':
        if (!identifier) throw new Error('Category identifier is required');
        // Create a mock category object for the metadata service
        const category = {
          id: identifier,
          name: identifier.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: `Category for ${identifier.replace(/-/g, ' ')}`,
          slug: identifier,
          productCount: 0,
          products: []
        };
        metadata = await this.metadataService.generateCategoryMetadata(category);
        structuredData = await this.structuredDataService.generateCategoryStructuredData(category);
        canonicalUrl = this.urlOptimizationService.getCanonicalUrl(`/category/${identifier}`);
        breadcrumbs = await this.urlOptimizationService.generateBreadcrumbs(`/category/${identifier}`);
        break;

      case 'homepage':
        metadata = await this.metadataService.generateHomepageMetadata();
        structuredData = {
          website: await this.structuredDataService.generateWebsiteStructuredData(),
          organization: await this.structuredDataService.generateOrganizationStructuredData(),
        };
        canonicalUrl = baseUrl;
        break;

      case 'custom':
        if (!customData) throw new Error('Custom data is required for custom pages');
        // Convert customData to the expected format for generatePageMetadata
        const pageData = {
          title: customData.title || 'Custom Page',
          description: customData.description,
          keywords: customData.keywords,
          path: (customData as any).path || '/',
          image: (customData as any).image,
          type: (customData as any).type
        };
        metadata = await this.metadataService.generatePageMetadata(pageData);
        structuredData = customData.structuredData || {};
        canonicalUrl = customData.canonical || `${baseUrl}${pageData.path}`;
        if (pageData.path) {
          breadcrumbs = await this.urlOptimizationService.generateBreadcrumbs(pageData.path);
        }
        break;

      default:
        throw new Error(`Unsupported page type: ${type}`);
    }

    const result = {
      metadata,
      structuredData,
      canonicalUrl,
      breadcrumbs,
    };

    // Cache for 1 hour
    this.cacheService.set(cacheKey, result, 3600000, ['seo', type]);

    this.logger.debug(`Generated SEO data for ${type}:${identifier || 'default'}`);
    return result;
  }

  /**
   * Generate complete HTML head section with SEO tags
   */
  async generateHtmlHead(
    type: 'product' | 'category' | 'homepage' | 'custom',
    identifier?: string,
    customData?: Partial<ISeoMetadata>,
  ): Promise<string> {
    const seoData = await this.getPageSeoData(type, identifier, customData);
    
    let html = '';

    // Basic meta tags
    html += `<title>${seoData.metadata.title}</title>\n`;
    html += `<meta name="description" content="${seoData.metadata.description}">\n`;
    
    if (seoData.metadata.keywords) {
      const keywordsArray = Array.isArray(seoData.metadata.keywords) 
        ? seoData.metadata.keywords 
        : seoData.metadata.keywords.split(',').map(k => k.trim());
      html += `<meta name="keywords" content="${keywordsArray.join(', ')}">\n`;
    }

    // Canonical URL
    html += `<link rel="canonical" href="${seoData.canonicalUrl}">\n`;

    // Open Graph tags
    if (seoData.metadata.openGraph) {
      const og = seoData.metadata.openGraph;
      html += `<meta property="og:title" content="${og.title}">\n`;
      html += `<meta property="og:description" content="${og.description}">\n`;
      html += `<meta property="og:type" content="${og.type}">\n`;
      html += `<meta property="og:url" content="${og.url}">\n`;
      
      if (og.image) {
        html += `<meta property="og:image" content="${og.image}">\n`;
        if (og.imageAlt) {
          html += `<meta property="og:image:alt" content="${og.imageAlt}">\n`;
        }
      }
      
      if (og.siteName) {
        html += `<meta property="og:site_name" content="${og.siteName}">\n`;
      }
    }

    // Twitter Card tags
    if (seoData.metadata.twitterCard) {
      const twitter = seoData.metadata.twitterCard;
      html += `<meta name="twitter:card" content="${twitter.card}">\n`;
      html += `<meta name="twitter:title" content="${twitter.title}">\n`;
      html += `<meta name="twitter:description" content="${twitter.description}">\n`;
      
      if (twitter.image) {
        html += `<meta name="twitter:image" content="${twitter.image}">\n`;
        if (twitter.imageAlt) {
          html += `<meta name="twitter:image:alt" content="${twitter.imageAlt}">\n`;
        }
      }
      
      if (twitter.site) {
        html += `<meta name="twitter:site" content="${twitter.site}">\n`;
      }
      
      if (twitter.creator) {
        html += `<meta name="twitter:creator" content="${twitter.creator}">\n`;
      }
    }

    // Hreflang tags
    if (seoData.metadata.hreflang?.length) {
      seoData.metadata.hreflang.forEach(hreflang => {
        html += `<link rel="alternate" hreflang="${hreflang.hreflang}" href="${hreflang.href}">\n`;
      });
    }

    // Structured data
    if (seoData.structuredData) {
      if (typeof seoData.structuredData === 'object' && !Array.isArray(seoData.structuredData)) {
        // Multiple structured data objects
        Object.values(seoData.structuredData).forEach(data => {
          if (data) {
            html += `<script type="application/ld+json">${JSON.stringify(data, null, 2)}</script>\n`;
          }
        });
      } else {
        // Single structured data object
        html += `<script type="application/ld+json">${JSON.stringify(seoData.structuredData, null, 2)}</script>\n`;
      }
    }

    // Breadcrumb structured data
    if (seoData.breadcrumbs?.length) {
      const breadcrumbSchema = await this.structuredDataService.generateBreadcrumbStructuredData(seoData.breadcrumbs);
      html += `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema, null, 2)}</script>\n`;
    }

    return html;
  }

  /**
   * Check if URL needs redirect
   */
  checkRedirect(url: string): IRedirectRule | null {
    // Check exact match first
    if (this.redirectRules.has(url)) {
      return this.redirectRules.get(url)!;
    }

    // Check pattern matches
    for (const [pattern, rule] of this.redirectRules.entries()) {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        if (regex.test(url)) {
          return rule;
        }
      }
    }

    return null;
  }

  /**
   * Add redirect rule
   */
  addRedirectRule(from: string, to: string, statusCode: number = 301, reason?: string): void {
    const rule: IRedirectRule = {
      from,
      to,
      statusCode,
      permanent: statusCode === 301,
      reason,
      createdAt: new Date(),
    };

    this.redirectRules.set(from, rule);
    this.logger.log(`Added redirect rule: ${from} -> ${to} (${statusCode})`);
  }

  /**
   * Remove redirect rule
   */
  removeRedirectRule(from: string): boolean {
    const removed = this.redirectRules.delete(from);
    if (removed) {
      this.logger.log(`Removed redirect rule: ${from}`);
    }
    return removed;
  }

  /**
   * Get all redirect rules
   */
  getRedirectRules(): IRedirectRule[] {
    return Array.from(this.redirectRules.values());
  }

  /**
   * Validate SEO configuration
   */
  validateSeoConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required environment variables
    const requiredVars = ['SITE_URL', 'SITE_NAME'];
    requiredVars.forEach(varName => {
      if (!this.configService.get(varName)) {
        errors.push(`Missing required environment variable: ${varName}`);
      }
    });

    // Validate SITE_URL format
    const siteUrl = this.configService.get<string>('SITE_URL');
    if (siteUrl && !this.isValidUrl(siteUrl)) {
      errors.push('SITE_URL must be a valid URL');
    }

    // Check cache configuration
    const cacheMaxSize = this.configService.get<number>('SEO_CACHE_MAX_SIZE');
    if (cacheMaxSize && (cacheMaxSize < 1 || cacheMaxSize > 10000)) {
      errors.push('SEO_CACHE_MAX_SIZE must be between 1 and 10000');
    }

    const cacheTtl = this.configService.get<number>('SEO_CACHE_TTL');
    if (cacheTtl && (cacheTtl < 1000 || cacheTtl > 86400000)) {
      errors.push('SEO_CACHE_TTL must be between 1000ms and 24 hours');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get SEO configuration
   */
  getSeoConfig(): ISeoConfig {
    return {
      siteUrl: this.configService.get<string>('SITE_URL', 'https://example.com'),
      siteName: this.configService.get<string>('SITE_NAME', 'My Store'),
      defaultTitle: this.configService.get<string>('DEFAULT_TITLE', 'My Store'),
      defaultDescription: this.configService.get<string>('DEFAULT_DESCRIPTION', 'Welcome to My Store'),
      defaultKeywords: this.configService.get<string>('DEFAULT_KEYWORDS'),
      defaultImage: this.configService.get<string>('DEFAULT_IMAGE'),
      twitterSite: this.configService.get<string>('TWITTER_SITE'),
      facebookAppId: this.configService.get<string>('FACEBOOK_APP_ID'),
      cache: {
        ttl: this.configService.get<number>('SEO_CACHE_TTL', 3600000),
        maxSize: this.configService.get<number>('SEO_CACHE_MAX_SIZE', 1000),
      },
      sitemap: {
        changefreq: this.configService.get<'always' | 'never' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('SITEMAP_CHANGEFREQ', 'weekly'),
        priority: this.configService.get<number>('SITEMAP_PRIORITY', 0.8),
        maxUrls: this.configService.get<number>('SITEMAP_MAX_URLS', 50000),
        maxUrlsPerSitemap: this.configService.get<number>('SITEMAP_MAX_URLS_PER_SITEMAP', 50000),
      },
    };
  }

  /**
   * Warm up critical SEO cache
   */
  async warmUpCache(): Promise<void> {
    this.logger.log('Starting SEO cache warmup...');

    try {
      // Warm up homepage
      await this.getPageSeoData('homepage');

      // Warm up sitemaps
      await this.sitemapService.generateMainSitemap();
      await this.sitemapService.generateCategoriesSitemap();

      // Warm up common structured data
      await this.structuredDataService.generateOrganizationStructuredData();
      await this.structuredDataService.generateWebsiteStructuredData();

      this.logger.log('SEO cache warmup completed successfully');
    } catch (error) {
      this.logger.error('SEO cache warmup failed', error);
    }
  }

  /**
   * Clear all SEO cache
   */
  clearSeoCache(): void {
    this.cacheService.invalidateByTag('seo');
    this.logger.log('Cleared all SEO cache');
  }

  /**
   * Get SEO health status
   */
  async getSeoHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    checks: Array<{ name: string; status: 'pass' | 'fail'; message?: string }>;
    cacheStats: any;
  }> {
    const checks: Array<{ name: string; status: 'pass' | 'fail'; message?: string }> = [];
    let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';

    // Configuration validation
    const configValidation = this.validateSeoConfig();
    checks.push({
      name: 'Configuration',
      status: configValidation.isValid ? 'pass' : 'fail',
      message: configValidation.errors.join(', ') || undefined,
    });

    if (!configValidation.isValid) {
      overallStatus = 'error';
    }

    // Cache health
    const cacheStats = this.cacheService.getStats();
    checks.push({
      name: 'Cache',
      status: 'pass',
      message: `${cacheStats.size} entries, ${cacheStats.hitRate.toFixed(2)}% hit rate`,
    });

    // Test sitemap generation
    try {
      await this.sitemapService.generateMainSitemap();
      checks.push({
        name: 'Sitemap Generation',
        status: 'pass',
      });
    } catch (error) {
      checks.push({
        name: 'Sitemap Generation',
        status: 'fail',
        message: error.message,
      });
      overallStatus = 'error';
    }

    // Test metadata generation
    try {
      await this.metadataService.generateHomepageMetadata();
      checks.push({
        name: 'Metadata Generation',
        status: 'pass',
      });
    } catch (error) {
      checks.push({
        name: 'Metadata Generation',
        status: 'fail',
        message: error.message,
      });
      overallStatus = 'error';
    }

    return {
      status: overallStatus,
      checks,
      cacheStats,
    };
  }

  /**
   * Initialize default redirect rules
   */
  private initializeRedirectRules(): void {
    // Add common redirect patterns
    this.addRedirectRule('/home', '/', 301, 'Redirect home to root');
    this.addRedirectRule('/index.html', '/', 301, 'Remove index.html');
    this.addRedirectRule('/index.php', '/', 301, 'Remove index.php');
    
    // Add trailing slash redirects (these would be handled by middleware)
    // this.addRedirectRule('/products/', '/products', 301, 'Remove trailing slash');
    
    this.logger.debug('Initialized default redirect rules');
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}