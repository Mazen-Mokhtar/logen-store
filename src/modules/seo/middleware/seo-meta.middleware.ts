import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SeoService } from '../seo.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SeoMetaMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SeoMetaMiddleware.name);
  private readonly enableAutoInjection: boolean;

  constructor(
    private seoService: SeoService,
    private configService: ConfigService,
  ) {
    this.enableAutoInjection = this.configService.get<boolean>('SEO_AUTO_INJECT_META', true);
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Skip if auto-injection is disabled
    if (!this.enableAutoInjection) {
      return next();
    }

    // Skip for non-HTML requests
    const acceptHeader = req.headers.accept || '';
    if (!acceptHeader.includes('text/html') && !acceptHeader.includes('*/*')) {
      return next();
    }

    // Skip for API routes, static files, and other non-page routes
    if (this.shouldSkipRoute(req.path)) {
      return next();
    }

    // Store original res.send method
    const originalSend = res.send.bind(res);

    // Override res.send to inject SEO metadata
    res.send = (body: any) => {
      try {
        // Only process HTML responses
        const contentType = res.getHeader('content-type') as string;
        if (!contentType || !contentType.includes('text/html')) {
          return originalSend(body);
        }

        // Only process string responses that look like HTML
        if (typeof body !== 'string' || !body.includes('<html')) {
          return originalSend(body);
        }

        // Inject SEO metadata
        this.injectSeoMetadata(req, body)
          .then((modifiedBody) => {
            originalSend(modifiedBody);
          })
          .catch((error) => {
            this.logger.error('Error injecting SEO metadata', error);
            originalSend(body); // Fallback to original body
          });
      } catch (error) {
        this.logger.error('Error in SEO meta middleware', error);
        originalSend(body); // Fallback to original body
      }
    };

    next();
  }

  /**
   * Inject SEO metadata into HTML response
   */
  private async injectSeoMetadata(req: Request, html: string): Promise<string> {
    try {
      const seoData = await this.determineSeoData(req);
      
      if (!seoData) {
        return html;
      }

      const htmlHead = await this.seoService.generateHtmlHead(
        seoData.type,
        seoData.identifier,
        seoData.customData,
      );

      // Inject into <head> section
      const modifiedHtml = this.injectIntoHead(html, htmlHead);
      
      this.logger.debug(`Injected SEO metadata for ${req.path}`);
      return modifiedHtml;
    } catch (error) {
      this.logger.error(`Error generating SEO data for ${req.path}`, error);
      return html;
    }
  }

  /**
   * Determine SEO data based on request path
   */
  private async determineSeoData(req: Request): Promise<{
    type: 'product' | 'category' | 'homepage' | 'custom';
    identifier?: string;
    customData?: any;
  } | null> {
    const path = req.path;
    const query = req.query;

    // Homepage
    if (path === '/' || path === '/home') {
      return { type: 'homepage' };
    }

    // Product pages
    const productMatch = path.match(/^\/product\/([^\/]+)$/);
    if (productMatch) {
      return {
        type: 'product',
        identifier: productMatch[1],
      };
    }

    // Category pages
    const categoryMatch = path.match(/^\/category\/([^\/]+)$/);
    if (categoryMatch) {
      return {
        type: 'category',
        identifier: categoryMatch[1],
      };
    }

    // Static pages
    const staticPages = [
      '/about',
      '/contact',
      '/privacy',
      '/terms',
      '/shipping',
      '/returns',
      '/faq',
    ];

    if (staticPages.includes(path)) {
      return {
        type: 'custom',
        customData: {
          path,
          title: this.getStaticPageTitle(path),
          description: this.getStaticPageDescription(path),
        },
      };
    }

    // Search pages
    if (path === '/search' && query.q) {
      return {
        type: 'custom',
        customData: {
          path,
          title: `Search Results for "${query.q}"`,
          description: `Find products matching "${query.q}" in our store.`,
        },
      };
    }

    // Collection/listing pages
    if (path === '/products' || path === '/shop') {
      return {
        type: 'custom',
        customData: {
          path,
          title: 'All Products',
          description: 'Browse our complete collection of products.',
        },
      };
    }

    // Blog pages (if applicable)
    const blogMatch = path.match(/^\/blog\/([^\/]+)$/);
    if (blogMatch) {
      return {
        type: 'custom',
        identifier: blogMatch[1],
        customData: {
          path,
          title: `Blog Post: ${blogMatch[1]}`,
          description: `Read our blog post about ${blogMatch[1]}.`,
        },
      };
    }

    // Default for other pages
    if (path !== '/sitemap' && !path.startsWith('/api/') && !path.startsWith('/admin/')) {
      return {
        type: 'custom',
        customData: {
          path,
          title: this.generateTitleFromPath(path),
          description: this.generateDescriptionFromPath(path),
        },
      };
    }

    return null;
  }

  /**
   * Inject HTML head content into the HTML document
   */
  private injectIntoHead(html: string, headContent: string): string {
    // Find the closing </head> tag
    const headCloseIndex = html.indexOf('</head>');
    
    if (headCloseIndex === -1) {
      // If no </head> tag found, try to inject after <head>
      const headOpenIndex = html.indexOf('<head>');
      if (headOpenIndex !== -1) {
        const insertIndex = headOpenIndex + '<head>'.length;
        return html.slice(0, insertIndex) + '\n' + headContent + html.slice(insertIndex);
      }
      
      // If no <head> tag found, inject at the beginning of <html>
      const htmlOpenIndex = html.indexOf('<html');
      if (htmlOpenIndex !== -1) {
        const htmlTagEnd = html.indexOf('>', htmlOpenIndex) + 1;
        return html.slice(0, htmlTagEnd) + '\n<head>\n' + headContent + '\n</head>\n' + html.slice(htmlTagEnd);
      }
      
      // Last resort: prepend to the document
      return headContent + '\n' + html;
    }

    // Inject before </head>
    return html.slice(0, headCloseIndex) + headContent + '\n' + html.slice(headCloseIndex);
  }

  /**
   * Check if route should be skipped
   */
  private shouldSkipRoute(path: string): boolean {
    const skipPatterns = [
      '/api/',
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
   * Get title for static pages
   */
  private getStaticPageTitle(path: string): string {
    const siteName = this.configService.get<string>('SITE_NAME', 'My Store');
    
    const titles: { [key: string]: string } = {
      '/about': `About Us - ${siteName}`,
      '/contact': `Contact Us - ${siteName}`,
      '/privacy': `Privacy Policy - ${siteName}`,
      '/terms': `Terms of Service - ${siteName}`,
      '/shipping': `Shipping Information - ${siteName}`,
      '/returns': `Returns & Refunds - ${siteName}`,
      '/faq': `Frequently Asked Questions - ${siteName}`,
    };

    return titles[path] || `${this.capitalizeWords(path.slice(1))} - ${siteName}`;
  }

  /**
   * Get description for static pages
   */
  private getStaticPageDescription(path: string): string {
    const siteName = this.configService.get<string>('SITE_NAME', 'My Store');
    
    const descriptions: { [key: string]: string } = {
      '/about': `Learn more about ${siteName}, our mission, and our team.`,
      '/contact': `Get in touch with ${siteName}. Find our contact information and reach out to us.`,
      '/privacy': `Read our privacy policy to understand how ${siteName} protects your personal information.`,
      '/terms': `Review the terms of service for using ${siteName}.`,
      '/shipping': `Learn about our shipping options, delivery times, and shipping costs.`,
      '/returns': `Understand our return and refund policy for a hassle-free shopping experience.`,
      '/faq': `Find answers to frequently asked questions about ${siteName} and our services.`,
    };

    return descriptions[path] || `${this.capitalizeWords(path.slice(1))} page on ${siteName}.`;
  }

  /**
   * Generate title from URL path
   */
  private generateTitleFromPath(path: string): string {
    const siteName = this.configService.get<string>('SITE_NAME', 'My Store');
    const pathParts = path.split('/').filter(part => part.length > 0);
    
    if (pathParts.length === 0) {
      return siteName;
    }

    const title = pathParts
      .map(part => this.capitalizeWords(part.replace(/-/g, ' ')))
      .join(' - ');

    return `${title} - ${siteName}`;
  }

  /**
   * Generate description from URL path
   */
  private generateDescriptionFromPath(path: string): string {
    const siteName = this.configService.get<string>('SITE_NAME', 'My Store');
    const pathParts = path.split('/').filter(part => part.length > 0);
    
    if (pathParts.length === 0) {
      return `Welcome to ${siteName}. Discover our products and services.`;
    }

    const lastPart = pathParts[pathParts.length - 1];
    const readablePart = this.capitalizeWords(lastPart.replace(/-/g, ' '));

    return `${readablePart} on ${siteName}. Find what you're looking for.`;
  }

  /**
   * Capitalize words in a string
   */
  private capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  }
}