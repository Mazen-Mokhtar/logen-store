import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SeoService } from '../seo.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SeoRedirectMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SeoRedirectMiddleware.name);
  private readonly enableRedirects: boolean;

  constructor(
    private seoService: SeoService,
    private configService: ConfigService,
  ) {
    this.enableRedirects = this.configService.get<boolean>('SEO_ENABLE_REDIRECTS', true);
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    this.logger.log(`Processing request: ${req.method} ${req.path}`);
    
    // Skip if redirects are disabled
    if (!this.enableRedirects) {
      this.logger.log('Redirects disabled, skipping');
      return next();
    }

    // Skip for non-GET requests
    if (req.method !== 'GET') {
      this.logger.log(`Skipping non-GET request: ${req.method}`);
      return next();
    }

    // Skip for API routes and static files
    if (this.shouldSkipRoute(req.path)) {
      this.logger.log(`Skipping route: ${req.path}`);
      return next();
    }

    this.logger.log(`Checking redirects for: ${req.path}`);

    try {
      const redirectUrl = await this.determineRedirect(req);
      
      if (redirectUrl) {
        this.logger.log(`Redirecting ${req.path} to ${redirectUrl.to} (${redirectUrl.statusCode})`);
        
        // Set appropriate headers
        res.setHeader('Location', redirectUrl.to);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache redirects for 1 year
        
        // Add redirect reason in development
        if (this.configService.get<string>('NODE_ENV') !== 'production' && redirectUrl.reason) {
          res.setHeader('X-Redirect-Reason', redirectUrl.reason);
        }

        res.status(redirectUrl.statusCode).end();
        return;
      }

      // Check for common SEO redirects
      const seoRedirect = this.checkSeoRedirects(req);
      if (seoRedirect) {
        this.logger.log(`SEO redirect: ${req.path} to ${seoRedirect.to} (${seoRedirect.statusCode})`);
        
        res.setHeader('Location', seoRedirect.to);
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        
        res.status(seoRedirect.statusCode).end();
        return;
      }

    } catch (error) {
      this.logger.error('Error in SEO redirect middleware', error);
    }

    next();
  }

  /**
   * Determine if request should be redirected
   */
  private async determineRedirect(req: Request): Promise<{
    to: string;
    statusCode: number;
    reason?: string;
  } | null> {
    const fullUrl = req.path + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
    
    // Check custom redirect rules
    const redirectRule = this.seoService.checkRedirect(fullUrl);
    if (redirectRule) {
      return {
        to: redirectRule.to,
        statusCode: redirectRule.statusCode,
        reason: redirectRule.reason,
      };
    }

    // Check path-only redirects
    const pathRedirectRule = this.seoService.checkRedirect(req.path);
    if (pathRedirectRule) {
      // Preserve query parameters
      const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
      return {
        to: pathRedirectRule.to + queryString,
        statusCode: pathRedirectRule.statusCode,
        reason: pathRedirectRule.reason,
      };
    }

    return null;
  }

  /**
   * Check for common SEO redirects
   */
  private checkSeoRedirects(req: Request): {
    to: string;
    statusCode: number;
    reason: string;
  } | null {
    const path = req.path;
    const query = req.query;
    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');

    // Remove trailing slash (except for root)
    if (path.length > 1 && path.endsWith('/')) {
      const newPath = path.slice(0, -1);
      const queryString = Object.keys(query).length > 0 ? '?' + new URLSearchParams(query as any).toString() : '';
      
      return {
        to: baseUrl + newPath + queryString,
        statusCode: 301,
        reason: 'Remove trailing slash',
      };
    }

    // Add trailing slash to directories (if configured)
    const addTrailingSlash = this.configService.get<boolean>('SEO_ADD_TRAILING_SLASH', false);
    if (addTrailingSlash && this.isDirectoryPath(path) && !path.endsWith('/')) {
      const queryString = Object.keys(query).length > 0 ? '?' + new URLSearchParams(query as any).toString() : '';
      
      return {
        to: baseUrl + path + '/' + queryString,
        statusCode: 301,
        reason: 'Add trailing slash to directory',
      };
    }

    // Lowercase URLs
    if (path !== path.toLowerCase()) {
      const queryString = Object.keys(query).length > 0 ? '?' + new URLSearchParams(query as any).toString() : '';
      
      return {
        to: baseUrl + path.toLowerCase() + queryString,
        statusCode: 301,
        reason: 'Convert to lowercase',
      };
    }

    // Remove index files
    const indexFiles = ['/index.html', '/index.php', '/index.htm', '/default.html', '/default.htm'];
    for (const indexFile of indexFiles) {
      if (path.endsWith(indexFile)) {
        const newPath = path.replace(indexFile, '') || '/';
        const queryString = Object.keys(query).length > 0 ? '?' + new URLSearchParams(query as any).toString() : '';
        
        return {
          to: baseUrl + newPath + queryString,
          statusCode: 301,
          reason: 'Remove index file',
        };
      }
    }

    // Remove .html extension
    if (path.endsWith('.html') && path !== '/sitemap.html') {
      const newPath = path.replace(/\.html$/, '');
      const queryString = Object.keys(query).length > 0 ? '?' + new URLSearchParams(query as any).toString() : '';
      
      return {
        to: baseUrl + newPath + queryString,
        statusCode: 301,
        reason: 'Remove .html extension',
      };
    }

    // Redirect old product URLs
    const oldProductMatch = path.match(/^\/products\/(\d+)$/);
    if (oldProductMatch) {
      const productId = oldProductMatch[1];
      const queryString = Object.keys(query).length > 0 ? '?' + new URLSearchParams(query as any).toString() : '';
      
      return {
        to: `${baseUrl}/product/${productId}${queryString}`,
        statusCode: 301,
        reason: 'Redirect old product URL format',
      };
    }

    // Redirect old category URLs
    const oldCategoryMatch = path.match(/^\/categories\/(\d+)$/);
    if (oldCategoryMatch) {
      const categoryId = oldCategoryMatch[1];
      const queryString = Object.keys(query).length > 0 ? '?' + new URLSearchParams(query as any).toString() : '';
      
      return {
        to: `${baseUrl}/category/${categoryId}${queryString}`,
        statusCode: 301,
        reason: 'Redirect old category URL format',
      };
    }

    // Redirect API endpoints to versioned endpoints
    if (path.startsWith('/api/products')) {
      const queryString = Object.keys(query).length > 0 ? '?' + new URLSearchParams(query as any).toString() : '';
      return {
        to: `/api/v1/products${queryString}`,
        statusCode: 301,
        reason: 'Redirect to versioned API endpoint',
      };
    }

    if (path.startsWith('/api/category')) {
      const queryString = Object.keys(query).length > 0 ? '?' + new URLSearchParams(query as any).toString() : '';
      return {
        to: `/api/v1/category${queryString}`,
        statusCode: 301,
        reason: 'Redirect to versioned API endpoint',
      };
    }

    // Redirect common misspellings or old paths
    const commonRedirects: { [key: string]: string } = {
      '/home': '/',
      '/homepage': '/',
      '/main': '/',
      '/shop': '/products',
      '/store': '/products',
      '/catalogue': '/products',
      '/catalog': '/products',
      '/aboutus': '/about',
      '/about-us': '/about',
      '/contactus': '/contact',
      '/contact-us': '/contact',
      '/privacypolicy': '/privacy',
      '/privacy-policy': '/privacy',
      '/termsofservice': '/terms',
      '/terms-of-service': '/terms',
      '/tos': '/terms',
    };

    if (commonRedirects[path]) {
      const queryString = Object.keys(query).length > 0 ? '?' + new URLSearchParams(query as any).toString() : '';
      
      return {
        to: baseUrl + commonRedirects[path] + queryString,
        statusCode: 301,
        reason: 'Redirect common path variation',
      };
    }

    // Handle double slashes
    if (path.includes('//')) {
      const cleanPath = path.replace(/\/+/g, '/');
      const queryString = Object.keys(query).length > 0 ? '?' + new URLSearchParams(query as any).toString() : '';
      
      return {
        to: baseUrl + cleanPath + queryString,
        statusCode: 301,
        reason: 'Remove double slashes',
      };
    }

    // Handle query parameter redirects
    if (this.hasRedirectableQueryParams(query)) {
      const cleanQuery = this.cleanQueryParams(query);
      const queryString = Object.keys(cleanQuery).length > 0 ? '?' + new URLSearchParams(cleanQuery).toString() : '';
      
      return {
        to: baseUrl + path + queryString,
        statusCode: 301,
        reason: 'Clean query parameters',
      };
    }

    return null;
  }

  /**
   * Check if route should be skipped
   */
  private shouldSkipRoute(path: string): boolean {
    const skipPatterns = [
      '/api/v1/', // Skip versioned API routes
      '/admin/',
      '/auth/',
      '/health',
      '/metrics',
      '/robots.txt',
      '/sitemap',
      '/favicon.ico',
      '/manifest.json',
      '/.well-known/',
      '/static/',
      '/assets/',
      '/public/',
      '/uploads/',
      '/images/',
      '/css/',
      '/js/',
      '/fonts/',
    ];

    return skipPatterns.some(pattern => path.startsWith(pattern));
  }

  /**
   * Check if path represents a directory
   */
  private isDirectoryPath(path: string): boolean {
    // Simple heuristic: paths without file extensions are likely directories
    const lastSegment = path.split('/').pop() || '';
    return !lastSegment.includes('.');
  }

  /**
   * Check if query parameters need cleaning
   */
  private hasRedirectableQueryParams(query: any): boolean {
    const redirectableParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid',
      'fbclid',
      'msclkid',
      '_ga',
      '_gl',
      'ref',
      'referrer',
    ];

    return redirectableParams.some(param => param in query);
  }

  /**
   * Clean query parameters for SEO
   */
  private cleanQueryParams(query: any): any {
    const cleanQuery = { ...query };
    
    // Remove tracking parameters
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid',
      'fbclid',
      'msclkid',
      '_ga',
      '_gl',
      'ref',
      'referrer',
    ];

    trackingParams.forEach(param => {
      delete cleanQuery[param];
    });

    // Remove empty parameters
    Object.keys(cleanQuery).forEach(key => {
      if (cleanQuery[key] === '' || cleanQuery[key] === null || cleanQuery[key] === undefined) {
        delete cleanQuery[key];
      }
    });

    return cleanQuery;
  }
}