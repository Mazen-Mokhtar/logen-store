import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  HttpStatus,
  Logger,
  UseGuards,
  Body,
  Delete,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SeoService } from './seo.service';
import { SitemapService } from './sitemap.service';
import { MetadataService } from './metadata.service';
import { StructuredDataService } from './structured-data.service';
import { UrlOptimizationService } from './url-optimization.service';
import { CacheService } from './cache.service';
import { 
  SeoMetadataDto, 
  MetadataQueryDto, 
  EnhancedSeoMetadataDto, 
  LocaleConfigResponseDto, 
  HreflangResponseDto 
} from './dto/seo.dto';
import { UrlManagementService, IRedirectRule } from './url-management.service';
import { LocaleService } from './locale.service';

@ApiTags('SEO')
@Controller('seo')
export class SeoController {
  private readonly logger = new Logger(SeoController.name);

  constructor(
    private seoService: SeoService,
    private sitemapService: SitemapService,
    private structuredDataService: StructuredDataService,
    private metadataService: MetadataService,
    private cacheService: CacheService,
    private urlManagementService: UrlManagementService,
    private localeService: LocaleService,
    private urlOptimizationService: UrlOptimizationService,
  ) {}

  // ==================== NEW FRONTEND SEO API ENDPOINTS ====================

  @Get('metadata')
  @ApiOperation({ 
    summary: 'Get dynamic SEO metadata for any path and locale',
    description: 'Returns comprehensive SEO metadata including meta tags, Open Graph, Twitter Cards, structured data, and hreflang tags for frontend consumption'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns enhanced SEO metadata',
    type: EnhancedSeoMetadataDto
  })
  @ApiQuery({ name: 'path', description: 'Page path (e.g., /products/smartphone, /categories/electronics)', required: true })
  @ApiQuery({ name: 'locale', description: 'Locale code (e.g., en, ar)', required: false })
  @ApiQuery({ name: 'includeStructuredData', description: 'Include JSON-LD structured data', required: false, type: Boolean })
  @ApiQuery({ name: 'includeHreflang', description: 'Include hreflang tags', required: false, type: Boolean })
  async getMetadata(
    @Query('path') path: string,
    @Query('locale') locale?: string,
    @Query('includeStructuredData') includeStructuredData: boolean = true,
    @Query('includeHreflang') includeHreflang: boolean = true,
  ): Promise<EnhancedSeoMetadataDto> {
    try {
      if (!path) {
        throw new BadRequestException('Path parameter is required');
      }

      // Use default locale if not provided
      const targetLocale = locale || this.localeService.getDefaultLocale();
      
      // Validate locale
      if (!this.localeService.isLocaleSupported(targetLocale)) {
        throw new BadRequestException(`Unsupported locale: ${targetLocale}`);
      }

      this.logger.debug(`Generating metadata for path: ${path}, locale: ${targetLocale}`);

      // Determine page type from path
      const pageType = this.determinePageType(path);
      
      // Generate base metadata
      const baseMetadata = await this.generateMetadataForPath(path, targetLocale, pageType);
      
      // Generate structured data if requested
      let structuredData = null;
      if (includeStructuredData) {
        structuredData = await this.generateStructuredDataForPath(path, targetLocale, pageType);
      }

      // Generate hreflang tags if requested
      let hreflangTags: any = null;
      if (includeHreflang) {
        hreflangTags = this.localeService.generateHreflangTags(path, targetLocale);
      }

      // Generate breadcrumbs
      const breadcrumbs = this.generateBreadcrumbs(path, targetLocale);

      const enhancedMetadata: EnhancedSeoMetadataDto = {
        ...baseMetadata,
        path,
        locale: targetLocale,
        pageType,
        lastModified: new Date().toISOString(),
        cacheTtl: 3600, // 1 hour
        structuredData,
        hreflang: hreflangTags,
        breadcrumbs,
      };

      this.logger.debug(`Generated metadata for ${path} in ${targetLocale}`);
      return enhancedMetadata;

    } catch (error) {
      this.logger.error(`Error generating metadata for path: ${path}`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to generate metadata');
    }
  }

  @Get('locale/config')
  @ApiOperation({ 
    summary: 'Get locale configuration',
    description: 'Returns available locales, default locale, and locale-related settings for frontend internationalization'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns locale configuration',
    type: LocaleConfigResponseDto
  })
  async getLocaleConfig(): Promise<LocaleConfigResponseDto> {
    try {
      const enabledLocales = this.localeService.getEnabledLocales();
      const defaultLocale = this.localeService.getDefaultLocale();
      
      const response: LocaleConfigResponseDto = {
        defaultLocale,
        locales: enabledLocales.map(locale => ({
          code: locale.code,
          name: locale.name,
          nativeName: locale.nativeName,
          region: locale.region,
          direction: locale.direction,
          currency: locale.currency,
          dateFormat: locale.dateFormat,
          enabled: locale.enabled,
          isDefault: locale.isDefault,
        })),
        detectionEnabled: true, // From environment config
        hreflangEnabled: true,  // From environment config
      };

      this.logger.debug('Retrieved locale configuration');
      return response;

    } catch (error) {
      this.logger.error('Error retrieving locale configuration', error);
      throw new InternalServerErrorException('Failed to retrieve locale configuration');
    }
  }

  @Get('locale/hreflang')
  @ApiOperation({ 
    summary: 'Get hreflang tags for a URL',
    description: 'Returns hreflang tags for all available locales for the given URL path'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns hreflang tags',
    type: HreflangResponseDto
  })
  @ApiQuery({ name: 'url', description: 'Full URL or path to generate hreflang tags for', required: true })
  @ApiQuery({ name: 'locale', description: 'Current locale', required: false })
  @ApiQuery({ name: 'includeDefault', description: 'Include x-default hreflang tag', required: false, type: Boolean })
  async getHreflangTags(
    @Query('url') url: string,
    @Query('locale') locale?: string,
    @Query('includeDefault') includeDefault: boolean = true,
  ): Promise<HreflangResponseDto> {
    try {
      if (!url) {
        throw new BadRequestException('URL parameter is required');
      }

      const currentLocale = locale || this.localeService.getDefaultLocale();
      
      // Extract path from URL if full URL is provided
      const path = this.extractPathFromUrl(url);
      
      // Generate hreflang tags
      const hreflangTags = this.localeService.generateHreflangTags(path, currentLocale);
      
      // Build full URLs for hreflang tags
      const baseUrl = process.env.SITE_URL || 'https://logenstore.com';
      const enhancedHreflangTags = hreflangTags.map(tag => ({
        hreflang: tag.hreflang,
        href: tag.href.startsWith('http') ? tag.href : `${baseUrl}${tag.href}`,
      }));

      // Add x-default if requested
      if (includeDefault) {
        const defaultLocale = this.localeService.getDefaultLocale();
        const defaultPath = this.localeService.buildLocalizedPath(path, defaultLocale);
        enhancedHreflangTags.push({
          hreflang: 'x-default',
          href: `${baseUrl}${defaultPath}`,
        });
      }

      const response: HreflangResponseDto = {
        currentUrl: url.startsWith('http') ? url : `${baseUrl}${url}`,
        currentLocale,
        hreflangTags: enhancedHreflangTags,
        defaultUrl: includeDefault ? `${baseUrl}${this.localeService.buildLocalizedPath(path, this.localeService.getDefaultLocale())}` : undefined,
      };

      this.logger.debug(`Generated hreflang tags for URL: ${url}`);
      return response;

    } catch (error) {
      this.logger.error(`Error generating hreflang tags for URL: ${url}`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to generate hreflang tags');
    }
  }

  // ==================== HELPER METHODS ====================

  private determinePageType(path: string): string {
    if (path === '/' || path === '') return 'homepage';
    if (path.startsWith('/products/')) return 'product';
    if (path.startsWith('/categories/')) return 'category';
    if (path.startsWith('/blog/')) return 'blog';
    if (path.startsWith('/about')) return 'about';
    if (path.startsWith('/contact')) return 'contact';
    return 'page';
  }

  private async generateMetadataForPath(path: string, locale: string, pageType: string): Promise<SeoMetadataDto> {
    // This would typically fetch data from database based on path and locale
    // For now, we'll generate basic metadata
    
    const siteName = process.env.SITE_NAME || 'Logen Store';
    const siteUrl = process.env.SITE_URL || 'https://logenstore.com';
    
    let title = process.env.DEFAULT_TITLE || siteName;
    let description = process.env.DEFAULT_DESCRIPTION || 'Premium electronics and technology products';
    let keywords = process.env.DEFAULT_KEYWORDS || 'electronics,technology,gadgets';
    
    // Customize based on page type and locale
    switch (pageType) {
      case 'homepage':
        title = locale === 'ar' ? 'متجر لوجن - إلكترونيات وتكنولوجيا متميزة' : `${siteName} - Premium Electronics & Technology`;
        description = locale === 'ar' 
          ? 'اكتشف منتجات إلكترونية وتكنولوجية متميزة في متجر لوجن. جودة مضمونة مع شحن سريع عالمياً'
          : 'Discover premium electronics, gadgets, and technology products at Logen Store. Quality guaranteed with fast shipping worldwide.';
        break;
      case 'product':
        const productSlug = path.split('/').pop();
        title = locale === 'ar' ? `منتج - ${siteName}` : `Product - ${siteName}`;
        description = locale === 'ar' 
          ? `تفاصيل المنتج في ${siteName}. جودة عالية وأسعار تنافسية`
          : `Product details at ${siteName}. High quality and competitive prices`;
        break;
      case 'category':
        const categorySlug = path.split('/').pop();
        title = locale === 'ar' ? `فئة - ${siteName}` : `Category - ${siteName}`;
        description = locale === 'ar' 
          ? `تصفح منتجات الفئة في ${siteName}`
          : `Browse category products at ${siteName}`;
        break;
    }

    const canonical = `${siteUrl}${this.localeService.buildLocalizedPath(path, locale)}`;
    const ogImage = process.env.DEFAULT_IMAGE || `${siteUrl}/images/og-default.jpg`;

    return {
      meta: {
        title,
        description,
        keywords,
        canonical,
        robots: 'index,follow',
      },
      openGraph: {
        title,
        description,
        type: pageType === 'product' ? 'product' : 'website',
        image: ogImage,
        url: canonical,
        siteName,
      },
      twitterCard: {
        card: 'summary_large_image',
        title,
        description,
        image: ogImage,
        site: process.env.TWITTER_SITE || '@logenstore',
      },
    };
  }

  private async generateStructuredDataForPath(path: string, locale: string, pageType: string): Promise<any> {
    const siteUrl = process.env.SITE_URL || 'https://logenstore.com';
    const siteName = process.env.SITE_NAME || 'Logen Store';
    
    switch (pageType) {
      case 'homepage':
        return {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: siteName,
          url: siteUrl,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${siteUrl}/search?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        };
      case 'product':
        return {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: 'Product Name', // Would be fetched from database
          description: 'Product description',
          brand: {
            '@type': 'Brand',
            name: siteName,
          },
          offers: {
            '@type': 'Offer',
            price: '99.99',
            priceCurrency: locale === 'ar' ? 'SAR' : 'USD',
            availability: 'https://schema.org/InStock',
          },
        };
      default:
        return null;
    }
  }

  private generateBreadcrumbs(path: string, locale: string): Array<{ name: string; url: string; position: number }> {
    const segments = path.split('/').filter(segment => segment);
    const breadcrumbs: Array<{ name: string; url: string; position: number }> = [];
    const siteUrl = process.env.SITE_URL || 'https://logenstore.com';
    
    // Add home
    breadcrumbs.push({
      name: locale === 'ar' ? 'الرئيسية' : 'Home',
      url: `${siteUrl}${this.localeService.buildLocalizedPath('/', locale)}`,
      position: 1,
    });

    // Add path segments
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      breadcrumbs.push({
        name: this.formatBreadcrumbName(segment, locale),
        url: `${siteUrl}${this.localeService.buildLocalizedPath(currentPath, locale)}`,
        position: index + 2,
      });
    });

    return breadcrumbs;
  }

  private formatBreadcrumbName(segment: string, locale: string): string {
    // Convert slug to readable name
    const formatted = segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Basic translations for common segments
    if (locale === 'ar') {
      const translations: { [key: string]: string } = {
        'products': 'المنتجات',
        'categories': 'الفئات',
        'about': 'حول',
        'contact': 'اتصل بنا',
        'blog': 'المدونة',
      };
      return translations[segment.toLowerCase()] || formatted;
    }
    
    return formatted;
  }

  private extractPathFromUrl(url: string): string {
    try {
      if (url.startsWith('http')) {
        const urlObj = new URL(url);
        return urlObj.pathname;
      }
      return url.startsWith('/') ? url : `/${url}`;
    } catch {
      return url.startsWith('/') ? url : `/${url}`;
    }
  }

  // ==================== SITEMAP ENDPOINTS ====================

  @Get('robots.txt')
  @ApiOperation({ summary: 'Get robots.txt file' })
  @ApiResponse({ status: 200, description: 'Returns robots.txt content' })
  async getRobotsTxt(@Res() res: Response): Promise<void> {
    try {
      const robotsTxt = await this.sitemapService.generateRobotsTxt();
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      res.status(HttpStatus.OK).send(robotsTxt);
      
      this.logger.debug('Served dynamic robots.txt');
    } catch (error) {
      this.logger.error('Error generating robots.txt', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error generating robots.txt');
    }
  }

  @Get('sitemap.xml')
  @ApiOperation({ summary: 'Get main sitemap XML' })
  @ApiResponse({ status: 200, description: 'Returns main sitemap XML' })
  async getMainSitemap(@Res() res: Response): Promise<void> {
    try {
      const sitemap = await this.sitemapService.generateMainSitemap();
      
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.status(HttpStatus.OK).send(sitemap);
      
      this.logger.debug('Served main sitemap');
    } catch (error) {
      this.logger.error('Error generating main sitemap', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error generating sitemap');
    }
  }

  @Get('sitemap-products.xml')
  @ApiOperation({ summary: 'Get products sitemap XML' })
  @ApiResponse({ status: 200, description: 'Returns products sitemap XML' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
  async getProductsSitemap(
    @Query('page') page: string = '1',
    @Res() res: Response,
  ): Promise<void> {
    try {
      const pageNumber = parseInt(page, 10) || 1;
      const sitemap = await this.sitemapService.generateProductsSitemap(pageNumber);
      
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Cache-Control', 'public, max-age=7200'); // Cache for 2 hours
      res.status(HttpStatus.OK).send(sitemap);
      
      this.logger.debug(`Served products sitemap page ${pageNumber}`);
    } catch (error) {
      this.logger.error('Error generating products sitemap', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error generating sitemap');
    }
  }

  @Get('sitemap-categories.xml')
  @ApiOperation({ summary: 'Get categories sitemap XML' })
  @ApiResponse({ status: 200, description: 'Returns categories sitemap XML' })
  async getCategoriesSitemap(@Res() res: Response): Promise<void> {
    try {
      const sitemap = await this.sitemapService.generateCategoriesSitemap();
      
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Cache-Control', 'public, max-age=14400'); // Cache for 4 hours
      res.status(HttpStatus.OK).send(sitemap);
      
      this.logger.debug('Served categories sitemap');
    } catch (error) {
      this.logger.error('Error generating categories sitemap', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error generating sitemap');
    }
  }

  @Get('sitemap')
  @ApiOperation({ summary: 'Get HTML sitemap for users' })
  @ApiResponse({ status: 200, description: 'Returns HTML sitemap' })
  async getHtmlSitemap(@Res() res: Response): Promise<void> {
    try {
      const htmlSitemap = await this.sitemapService.generateHtmlSitemap();
      
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'public, max-age=14400'); // Cache for 4 hours
      res.status(HttpStatus.OK).send(htmlSitemap);
      
      this.logger.debug('Served HTML sitemap');
    } catch (error) {
      this.logger.error('Error generating HTML sitemap', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error generating HTML sitemap');
    }
  }

  // ==================== METADATA ENDPOINTS ====================

  @Get('metadata/product/:slug')
  @ApiOperation({ summary: 'Get product metadata' })
  @ApiResponse({ status: 200, description: 'Returns product metadata' })
  @ApiParam({ name: 'slug', description: 'Product slug or ID' })
  async getProductMetadata(@Param('slug') slug: string) {
    try {
      // Mock product data - in real implementation, fetch from database
      const mockProduct = {
        id: slug,
        name: `Product ${slug}`,
        description: `Description for product ${slug}`,
        price: 99.99,
        currency: 'USD',
        images: [`/images/products/${slug}.jpg`],
        category: 'Electronics',
        brand: 'Brand Name',
        availability: 'InStock' as const,
        slug: slug,
      };
      
      const metadata = await this.metadataService.generateProductMetadata(mockProduct);
      this.logger.debug(`Generated metadata for product: ${slug}`);
      return metadata;
    } catch (error) {
      this.logger.error(`Error generating product metadata for ${slug}`, error);
      throw error;
    }
  }

  @Get('metadata/category/:slug')
  @ApiOperation({ summary: 'Get category metadata' })
  @ApiResponse({ status: 200, description: 'Returns category metadata' })
  @ApiParam({ name: 'slug', description: 'Category slug or ID' })
  async getCategoryMetadata(@Param('slug') slug: string) {
    try {
      // Create a mock category object for the metadata service
      const category = {
        id: slug,
        name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Category for ${slug.replace(/-/g, ' ')}`,
        slug: slug,
        productCount: 0
      };
      
      const metadata = await this.metadataService.generateCategoryMetadata(category);
      this.logger.debug(`Generated metadata for category: ${slug}`);
      return metadata;
    } catch (error) {
      this.logger.error(`Error generating category metadata for ${slug}`, error);
      throw error;
    }
  }

  @Get('metadata/homepage')
  @ApiOperation({ summary: 'Get homepage metadata' })
  @ApiResponse({ status: 200, description: 'Returns homepage metadata' })
  async getHomepageMetadata() {
    try {
      const metadata = await this.metadataService.generateHomepageMetadata();
      this.logger.debug('Generated homepage metadata');
      return metadata;
    } catch (error) {
      this.logger.error('Error generating homepage metadata', error);
      throw error;
    }
  }

  // ==================== STRUCTURED DATA ENDPOINTS ====================

  @Get('structured-data/product/:slug')
  @ApiOperation({ summary: 'Get product structured data' })
  @ApiResponse({ status: 200, description: 'Returns product JSON-LD structured data' })
  @ApiParam({ name: 'slug', description: 'Product slug or ID' })
  async getProductStructuredData(@Param('slug') slug: string) {
    try {
      // Create a mock product object for the structured data service
      const product = {
        id: slug,
        name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Product description for ${slug.replace(/-/g, ' ')}`,
        price: 99.99,
        currency: 'USD',
        availability: 'InStock' as const,
        sku: slug.toUpperCase(),
        images: [`/images/products/${slug}.jpg`]
      };
      
      const structuredData = await this.structuredDataService.generateProductStructuredData(product);
      this.logger.debug(`Generated structured data for product: ${slug}`);
      return structuredData;
    } catch (error) {
      this.logger.error(`Error generating product structured data for ${slug}`, error);
      throw error;
    }
  }

  @Get('structured-data/category/:slug')
  @ApiOperation({ summary: 'Get category structured data' })
  @ApiResponse({ status: 200, description: 'Returns category JSON-LD structured data' })
  @ApiParam({ name: 'slug', description: 'Category slug or ID' })
  async getCategoryStructuredData(@Param('slug') slug: string) {
    try {
      // Create a mock category object for the structured data service
      const category = {
        name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Category for ${slug.replace(/-/g, ' ')}`,
        products: [
          {
            id: `${slug}-product-1`,
            name: `Sample Product 1 in ${slug.replace(/-/g, ' ')}`,
            url: `/products/${slug}-product-1`,
            image: `/images/products/${slug}-product-1.jpg`
          }
        ]
      };
      
      const structuredData = await this.structuredDataService.generateCategoryStructuredData(category);
      this.logger.debug(`Generated structured data for category: ${slug}`);
      return structuredData;
    } catch (error) {
      this.logger.error(`Error generating category structured data for ${slug}`, error);
      throw error;
    }
  }

  @Get('structured-data/organization')
  @ApiOperation({ summary: 'Get organization structured data' })
  @ApiResponse({ status: 200, description: 'Returns organization JSON-LD structured data' })
  async getOrganizationStructuredData() {
    try {
      const structuredData = await this.structuredDataService.generateOrganizationStructuredData();
      this.logger.debug('Generated organization structured data');
      return structuredData;
    } catch (error) {
      this.logger.error('Error generating organization structured data', error);
      throw error;
    }
  }

  @Get('structured-data/website')
  @ApiOperation({ summary: 'Get website structured data' })
  @ApiResponse({ status: 200, description: 'Returns website JSON-LD structured data' })
  async getWebsiteStructuredData() {
    try {
      const structuredData = await this.structuredDataService.generateWebsiteStructuredData();
      this.logger.debug('Generated website structured data');
      return structuredData;
    } catch (error) {
      this.logger.error('Error generating website structured data', error);
      throw error;
    }
  }

  // ==================== URL OPTIMIZATION ENDPOINTS ====================

  @Get('canonical/*splat')
  @ApiOperation({ summary: 'Get canonical URL for a path' })
  @ApiResponse({ status: 200, description: 'Returns canonical URL' })
  @ApiParam({ name: 'splat', description: 'URL path' })
  async getCanonicalUrl(@Param('splat') path: string) {
    try {
      const canonicalUrl = this.urlOptimizationService.getCanonicalUrl(`/${path}`);
      this.logger.debug(`Generated canonical URL for path: ${path}`);
      return { canonicalUrl };
    } catch (error) {
      this.logger.error(`Error generating canonical URL for ${path}`, error);
      throw error;
    }
  }

  @Get('breadcrumbs/*splat')
  @ApiOperation({ summary: 'Get breadcrumbs for a path' })
  @ApiResponse({ status: 200, description: 'Returns breadcrumb navigation' })
  @ApiParam({ name: 'splat', description: 'URL path' })
  async getBreadcrumbs(@Param('splat') path: string) {
    try {
      const breadcrumbs = await this.urlOptimizationService.generateBreadcrumbs(`/${path}`);
      this.logger.debug(`Generated breadcrumbs for path: ${path}`);
      return { breadcrumbs };
    } catch (error) {
      this.logger.error(`Error generating breadcrumbs for ${path}`, error);
      throw error;
    }
  }

  @Get('slug/generate')
  @ApiOperation({ summary: 'Generate SEO-friendly slug' })
  @ApiResponse({ status: 200, description: 'Returns generated slug' })
  @ApiQuery({ name: 'text', description: 'Text to convert to slug' })
  @ApiQuery({ name: 'type', required: false, description: 'Type of content (product, category, page)' })
  async generateSlug(
    @Query('text') text: string,
    @Query('type') type: 'product' | 'category' | 'page' = 'page',
  ) {
    try {
      let slug: string;
      
      switch (type) {
        case 'product':
          slug = this.urlOptimizationService.generateProductSlug(text, 'generated-id');
          break;
        case 'category':
          slug = this.urlOptimizationService.generateCategorySlug(text, 'generated-id');
          break;
        default:
          slug = this.urlOptimizationService.generatePageSlug(text, 'generated-id');
      }
      
      this.logger.debug(`Generated ${type} slug: ${text} -> ${slug}`);
      return { slug, type, original: text };
    } catch (error) {
      this.logger.error(`Error generating slug for ${text}`, error);
      throw error;
    }
  }

  // ==================== CACHE MANAGEMENT ENDPOINTS ====================

  @Get('cache/stats')
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({ status: 200, description: 'Returns cache statistics' })
  async getCacheStats() {
    try {
      const stats = this.cacheService.getStats();
      this.logger.debug('Retrieved cache statistics');
      return stats;
    } catch (error) {
      this.logger.error('Error retrieving cache statistics', error);
      throw error;
    }
  }

  @Post('cache/clear')
  @ApiOperation({ summary: 'Clear all cache' })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  async clearCache() {
    try {
      this.cacheService.clear();
      this.logger.log('Cache cleared via API');
      return { message: 'Cache cleared successfully', timestamp: new Date().toISOString() };
    } catch (error) {
      this.logger.error('Error clearing cache', error);
      throw error;
    }
  }

  @Post('cache/invalidate/:tag')
  @ApiOperation({ summary: 'Invalidate cache by tag' })
  @ApiResponse({ status: 200, description: 'Cache invalidated successfully' })
  @ApiParam({ name: 'tag', description: 'Cache tag to invalidate' })
  async invalidateCacheByTag(@Param('tag') tag: string) {
    try {
      this.cacheService.invalidateByTag(tag);
      this.logger.log(`Cache invalidated for tag: ${tag}`);
      return { 
        message: `Cache invalidated for tag: ${tag}`, 
        tag,
        timestamp: new Date().toISOString() 
      };
    } catch (error) {
      this.logger.error(`Error invalidating cache for tag ${tag}`, error);
      throw error;
    }
  }

  @Post('cache/warmup')
  @ApiOperation({ summary: 'Warm up critical cache entries' })
  @ApiResponse({ status: 200, description: 'Cache warmup completed' })
  async warmUpCache() {
    try {
      await this.seoService.warmUpCache();
      this.logger.log('Cache warmup completed via API');
      return { message: 'Cache warmup completed', timestamp: new Date().toISOString() };
    } catch (error) {
      this.logger.error('Error during cache warmup', error);
      throw error;
    }
  }

  // ==================== SEO MANAGEMENT ENDPOINTS ====================

  @Get('seo/health')
  @ApiOperation({ summary: 'Get SEO system health status' })
  @ApiResponse({ status: 200, description: 'Returns SEO system health status' })
  async getSeoHealth() {
    try {
      const health = await this.seoService.getSeoHealthStatus();
      this.logger.debug('Retrieved SEO health status');
      return health;
    } catch (error) {
      this.logger.error('Error retrieving SEO health status', error);
      throw error;
    }
  }

  @Get('seo/config')
  @ApiOperation({ summary: 'Get SEO configuration' })
  @ApiResponse({ status: 200, description: 'Returns SEO configuration' })
  async getSeoConfig() {
    try {
      const config = this.seoService.getSeoConfig();
      this.logger.debug('Retrieved SEO configuration');
      return config;
    } catch (error) {
      this.logger.error('Error retrieving SEO configuration', error);
      throw error;
    }
  }

  @Get('seo/redirects')
  @ApiOperation({ summary: 'Get all redirect rules' })
  @ApiResponse({ status: 200, description: 'Returns all redirect rules' })
  async getRedirectRules() {
    try {
      const rules = this.seoService.getRedirectRules();
      this.logger.debug('Retrieved redirect rules');
      return { rules, count: rules.length };
    } catch (error) {
      this.logger.error('Error retrieving redirect rules', error);
      throw error;
    }
  }

  @Post('seo/redirects')
  @ApiOperation({ summary: 'Add redirect rule' })
  @ApiResponse({ status: 201, description: 'Redirect rule added successfully' })
  async addRedirectRule(@Body() body: {
    from: string;
    to: string;
    statusCode?: number;
    reason?: string;
  }) {
    try {
      this.seoService.addRedirectRule(
        body.from,
        body.to,
        body.statusCode || 301,
        body.reason,
      );
      
      this.logger.log(`Added redirect rule: ${body.from} -> ${body.to}`);
      return { 
        message: 'Redirect rule added successfully',
        rule: body,
        timestamp: new Date().toISOString() 
      };
    } catch (error) {
      this.logger.error('Error adding redirect rule', error);
      throw error;
    }
  }

  @Delete('seo/redirects/*splat')
  @ApiOperation({ summary: 'Delete redirect rule' })
  @ApiResponse({ status: 200, description: 'Redirect rule deleted successfully' })
  @ApiParam({ name: 'splat', description: 'Source path to remove redirect from' })
  async deleteRedirect(@Param('splat') from: string) {
    try {
      const removed = this.seoService.removeRedirectRule(`/${from}`);
      
      if (removed) {
        this.logger.log(`Removed redirect rule: ${from}`);
        return { 
          message: 'Redirect rule removed successfully',
          from: `/${from}`,
          timestamp: new Date().toISOString() 
        };
      } else {
        return { 
          message: 'Redirect rule not found',
          from: `/${from}`,
          timestamp: new Date().toISOString() 
        };
      }
    } catch (error) {
      this.logger.error(`Error removing redirect rule for ${from}`, error);
      throw error;
    }
  }

  // ==================== COMPLETE SEO DATA ENDPOINT ====================

  @Get(['seo/page/:type/:identifier', 'seo/page/:type'])
  @ApiOperation({ summary: 'Get complete SEO data for a page' })
  @ApiResponse({ status: 200, description: 'Returns complete SEO data including metadata, structured data, and canonical URL' })
  @ApiParam({ name: 'type', description: 'Page type (product, category, homepage, custom)' })
  @ApiParam({ name: 'identifier', required: false, description: 'Page identifier (slug, ID, etc.)' })
  async getPageSeoData(
    @Param('type') type: 'product' | 'category' | 'homepage' | 'custom',
    @Param('identifier') identifier?: string,
    @Body() customData?: Partial<SeoMetadataDto>,
  ) {
    try {
      const seoData = await this.seoService.getPageSeoData(type, identifier, customData);
      this.logger.debug(`Generated complete SEO data for ${type}:${identifier || 'default'}`);
      return seoData;
    } catch (error) {
      this.logger.error(`Error generating SEO data for ${type}:${identifier}`, error);
      throw error;
    }
  }

  @Get(['seo/html-head/:type/:identifier', 'seo/html-head/:type'])
  @ApiOperation({ summary: 'Get complete HTML head section with SEO tags' })
  @ApiResponse({ status: 200, description: 'Returns HTML head section with all SEO tags' })
  @ApiParam({ name: 'type', description: 'Page type (product, category, homepage, custom)' })
  @ApiParam({ name: 'identifier', required: false, description: 'Page identifier (slug, ID, etc.)' })
  async getHtmlHead(
    @Param('type') type: 'product' | 'category' | 'homepage' | 'custom',
    @Param('identifier') identifier?: string,
    @Body() customData?: Partial<SeoMetadataDto>,
    @Res() res?: Response,
  ) {
    try {
      const htmlHead = await this.seoService.generateHtmlHead(type, identifier, customData);
      
      if (res) {
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.status(HttpStatus.OK).send(htmlHead);
      } else {
        return { htmlHead };
      }
      
      this.logger.debug(`Generated HTML head for ${type}:${identifier || 'default'}`);
    } catch (error) {
      this.logger.error(`Error generating HTML head for ${type}:${identifier}`, error);
      throw error;
    }
  }

  /**
   * Check if URL needs redirect
   */
  @Get('redirect-check')
  checkRedirect(@Query('url') url: string) {
    if (!url) {
      throw new BadRequestException('URL parameter is required');
    }

    try {
      const result = this.urlManagementService.checkRedirect(url);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to check redirect', error);
      throw new InternalServerErrorException('Failed to check redirect');
    }
  }

  /**
   * Normalize URL
   */
  @Get('normalize-url')
  normalizeUrl(@Query('url') url: string) {
    if (!url) {
      throw new BadRequestException('URL parameter is required');
    }

    try {
      const normalized = this.urlManagementService.normalizeUrl(url);
      return {
        success: true,
        data: {
          original: url,
          normalized,
          changed: url !== normalized,
        },
      };
    } catch (error) {
      this.logger.error('Failed to normalize URL', error);
      throw new InternalServerErrorException('Failed to normalize URL');
    }
  }

  /**
   * Validate URL for security issues
   */
  @Get('validate-url')
  validateUrl(@Query('url') url: string) {
    if (!url) {
      throw new BadRequestException('URL parameter is required');
    }

    try {
      const validation = this.urlManagementService.validateUrl(url);
      return {
        success: true,
        data: validation,
      };
    } catch (error) {
      this.logger.error('Failed to validate URL', error);
      throw new InternalServerErrorException('Failed to validate URL');
    }
  }







  /**
   * Bulk import redirect rules
   */
  @Post('redirects/import')
  importRedirectRules(@Body() rules: Omit<IRedirectRule, 'createdAt' | 'updatedAt'>[]) {
    try {
      const result = this.urlManagementService.importRedirectRules(rules);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to import redirect rules', error);
      throw new InternalServerErrorException('Failed to import redirect rules');
    }
  }

  /**
   * Export redirect rules
   */
  @Get('redirects/export')
  exportRedirectRules() {
    try {
      const rules = this.urlManagementService.exportRedirectRules();
      return {
        success: true,
        data: rules,
      };
    } catch (error) {
      this.logger.error('Failed to export redirect rules', error);
      throw new InternalServerErrorException('Failed to export redirect rules');
    }
  }

  /**
   * Get URL management statistics
   */
  @Get('url-stats')
  getUrlStats() {
    try {
      const stats = this.urlManagementService.getStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error('Failed to get URL stats', error);
      throw new InternalServerErrorException('Failed to get URL stats');
    }
  }



  // ... existing code ...

  /**
   * Detect locale from request
   */
  @Get('locale/detect')
  async detectLocale(
    @Query('url') url?: string,
    @Query('cookie') cookie?: string,
    @Query('acceptLanguage') acceptLanguage?: string,
  ) {
    try {
      const result = this.localeService.detectLocale(
        acceptLanguage,
        cookie,
        url,
      );
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to detect locale', error.stack);
      throw new InternalServerErrorException('Failed to detect locale');
    }
  }



  /**
   * Generate localized URLs
   */
  @Get('locale/urls')
  async generateLocalizedUrls(
    @Query('basePath') basePath: string,
    @Query('includeDefault') includeDefault?: boolean,
  ) {
    if (!basePath) {
      throw new BadRequestException('Base path is required');
    }

    try {
      const urls = this.localeService.generateLocalizedUrls(
        basePath,
        includeDefault ? 'https://example.com' : undefined,
      );
      
      return {
        success: true,
        data: {
          urls,
          count: urls.length,
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate localized URLs', error.stack);
      throw new InternalServerErrorException('Failed to generate localized URLs');
    }
  }

  /**
   * Get locale statistics
   */
  @Get('locale/stats')
  async getLocaleStats() {
    try {
      const stats = this.localeService.getLocaleStats();
      
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error('Failed to get locale statistics', error.stack);
      throw new InternalServerErrorException('Failed to get locale statistics');
    }
  }

  /**
   * Update locale configuration
   */
  @Post('locale/config')
  async updateLocaleConfig(@Body() config: any) {
    try {
      await this.localeService.updateLocaleConfig(config);
      
      return {
        success: true,
        message: 'Locale configuration updated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to update locale configuration', error.stack);
      throw new InternalServerErrorException('Failed to update locale configuration');
    }
  }

  /**
   * Remove locale configuration
   */
  @Delete('locale/config/:locale')
  async removeLocaleConfig(@Param('locale') locale: string) {
    try {
      await this.localeService.removeLocaleConfig(locale);
      
      return {
        success: true,
        message: 'Locale configuration removed successfully',
      };
    } catch (error) {
      this.logger.error('Failed to remove locale configuration', error.stack);
      throw new InternalServerErrorException('Failed to remove locale configuration');
    }
  }
}