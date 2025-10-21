import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { ISitemapUrl, ISitemap, IImageSitemapUrl, IVideoSitemapUrl } from './interfaces/seo.interface';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

@Injectable()
export class SitemapService {
  private readonly logger = new Logger(SitemapService.name);
  private readonly maxUrlsPerSitemap: number;

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {
    this.maxUrlsPerSitemap = this.configService.get<number>('SITEMAP_MAX_URLS', 50000);
  }

  /**
   * Generate main sitemap index with support for large sites
   */
  async generateSitemapIndex(): Promise<string> {
    const cacheKey = 'sitemap:index';
    const cached = this.cacheService.get<string>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');
    const lastmod = new Date().toISOString();
    const totalProducts = await this.getTotalProductCount();
    const totalCategories = await this.getTotalCategoryCount();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Main sitemap
    xml += '  <sitemap>\n';
    xml += `    <loc>${baseUrl}/sitemap.xml</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += '  </sitemap>\n';

    // Categories sitemap
    xml += '  <sitemap>\n';
    xml += `    <loc>${baseUrl}/sitemap-categories.xml</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += '  </sitemap>\n';

    // Product sitemaps (paginated if needed)
    const productsPerSitemap = this.maxUrlsPerSitemap;
    const totalProductPages = Math.ceil(totalProducts / productsPerSitemap);

    for (let page = 1; page <= totalProductPages; page++) {
      xml += '  <sitemap>\n';
      if (totalProductPages === 1) {
        xml += `    <loc>${baseUrl}/sitemap-products.xml</loc>\n`;
      } else {
        xml += `    <loc>${baseUrl}/sitemap-products-${page}.xml</loc>\n`;
      }
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '  </sitemap>\n';
    }

    // Image sitemap (if images exist)
    const hasImages = await this.hasProductImages();
    if (hasImages) {
      xml += '  <sitemap>\n';
      xml += `    <loc>${baseUrl}/sitemap-images.xml</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '  </sitemap>\n';
    }

    // Video sitemap (if videos exist)
    const hasVideos = await this.hasProductVideos();
    if (hasVideos) {
      xml += '  <sitemap>\n';
      xml += `    <loc>${baseUrl}/sitemap-videos.xml</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '  </sitemap>\n';
    }

    // Locale-specific sitemaps
    const supportedLocales = this.configService.get<string[]>('ENABLED_LOCALES', []);
    for (const locale of supportedLocales) {
      xml += '  <sitemap>\n';
      xml += `    <loc>${baseUrl}/sitemap-${locale}.xml</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '  </sitemap>\n';
    }

    xml += '</sitemapindex>';

    // Cache for 1 hour
    this.cacheService.set(cacheKey, xml, 3600000, ['sitemap']);
    
    this.logger.debug('Generated sitemap index');
    return xml;
  }

  /**
   * Generate main sitemap with static pages
   */
  async generateMainSitemap(): Promise<string> {
    const cacheKey = 'sitemap:main';
    const cached = this.cacheService.get<string>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');
    const staticPages = this.getStaticPages();

    const urls: ISitemapUrl[] = staticPages.map(page => ({
      loc: `${baseUrl}${page.path}`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: (page.changefreq || 'weekly') as 'always' | 'never' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly',
      priority: page.priority || 0.8,
    }));

    const xml = this.generateSitemapXml(urls);

    // Cache for 6 hours
    this.cacheService.set(cacheKey, xml, 21600000, ['sitemap']);
    
    this.logger.debug(`Generated main sitemap with ${urls.length} URLs`);
    return xml;
  }

  /**
   * Generate products sitemap
   */
  async generateProductsSitemap(page: number = 1): Promise<string> {
    const cacheKey = `sitemap:products:${page}`;
    const cached = this.cacheService.get<string>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // In a real implementation, you would fetch products from database
    const products = await this.getProducts(page);
    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');

    const urls: ISitemapUrl[] = products.map(product => ({
      loc: `${baseUrl}/product/${product.slug || product.id}`,
      lastmod: product.updatedAt ? new Date(product.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: 0.9,
    }));

    const xml = this.generateSitemapXml(urls);

    // Cache for 2 hours
    this.cacheService.set(cacheKey, xml, 7200000, ['sitemap', 'products']);
    
    this.logger.debug(`Generated products sitemap page ${page} with ${urls.length} URLs`);
    return xml;
  }

  /**
   * Generate categories sitemap
   */
  async generateCategoriesSitemap(): Promise<string> {
    const cacheKey = 'sitemap:categories';
    const cached = this.cacheService.get<string>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // In a real implementation, you would fetch categories from database
    const categories = await this.getCategories();
    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');

    const urls: ISitemapUrl[] = categories.map(category => ({
      loc: `${baseUrl}/category/${category.slug || category.id}`,
      lastmod: category.updatedAt ? new Date(category.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: 0.8,
    }));

    const xml = this.generateSitemapXml(urls);

    // Cache for 4 hours
    this.cacheService.set(cacheKey, xml, 14400000, ['sitemap', 'categories']);
    
    this.logger.debug(`Generated categories sitemap with ${urls.length} URLs`);
    return xml;
  }

  /**
   * Generate image sitemap
   */
  async generateImageSitemap(): Promise<string> {
    const cacheKey = 'sitemap:images';
    const cached = this.cacheService.get<string>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');
    const products = await this.getProductsWithImages();

    const urls: ISitemapUrl[] = products.map(product => ({
      loc: `${baseUrl}/product/${product.slug || product.id}`,
      lastmod: product.updatedAt ? new Date(product.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: 0.9,
      images: product.images?.map(image => ({
        loc: image.url,
        caption: image.caption,
        title: image.title,
        license: image.license,
      })) || [],
    }));

    const xml = this.generateImageSitemapXml(urls);

    // Cache for 2 hours
    this.cacheService.set(cacheKey, xml, 7200000, ['sitemap', 'images']);
    
    this.logger.debug(`Generated image sitemap with ${urls.length} URLs`);
    return xml;
  }

  /**
   * Generate video sitemap
   */
  async generateVideoSitemap(): Promise<string> {
    const cacheKey = 'sitemap:videos';
    const cached = this.cacheService.get<string>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');
    const products = await this.getProductsWithVideos();

    const urls: ISitemapUrl[] = products.map(product => ({
      loc: `${baseUrl}/product/${product.slug || product.id}`,
      lastmod: product.updatedAt ? new Date(product.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: 0.9,
      videos: product.videos?.map(video => ({
        thumbnailLoc: video.thumbnailUrl,
        title: video.title,
        description: video.description,
        contentLoc: video.contentUrl,
        duration: video.duration,
        publicationDate: video.publicationDate,
        familyFriendly: video.familyFriendly !== false,
        rating: video.rating,
        viewCount: video.viewCount,
      })) || [],
    }));

    const xml = this.generateVideoSitemapXml(urls);

    // Cache for 2 hours
    this.cacheService.set(cacheKey, xml, 7200000, ['sitemap', 'videos']);
    
    this.logger.debug(`Generated video sitemap with ${urls.length} URLs`);
    return xml;
  }

  /**
   * Generate locale-specific sitemap
   */
  async generateLocaleSitemap(locale: string): Promise<string> {
    const cacheKey = `sitemap:locale:${locale}`;
    const cached = this.cacheService.get<string>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');
    const staticPages = this.getStaticPages();
    const products = await this.getProducts(1, 1000);
    const categories = await this.getCategories();

    const urls: ISitemapUrl[] = [
      // Static pages with locale
      ...staticPages.map(page => ({
        loc: `${baseUrl}/${locale}${page.path === '/' ? '' : page.path}`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: (page.changefreq || 'weekly') as 'always' | 'never' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly',
        priority: page.priority || 0.8,
      } as ISitemapUrl)),
      // Products with locale
      ...products.map(product => ({
        loc: `${baseUrl}/${locale}/product/${product.slug || product.id}`,
        lastmod: product.updatedAt ? new Date(product.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        changefreq: 'daily' as const,
        priority: 0.9,
      } as ISitemapUrl)),
      // Categories with locale
      ...categories.map(category => ({
        loc: `${baseUrl}/${locale}/category/${category.slug || category.id}`,
        lastmod: category.updatedAt ? new Date(category.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        changefreq: 'weekly' as const,
        priority: 0.8,
      } as ISitemapUrl)),
    ];

    const xml = this.generateSitemapXml(urls);

    // Cache for 4 hours
    this.cacheService.set(cacheKey, xml, 14400000, ['sitemap', 'locale', locale]);
    
    this.logger.debug(`Generated ${locale} sitemap with ${urls.length} URLs`);
    return xml;
  }

  /**
   * Generate compressed sitemap
   */
  async generateCompressedSitemap(type: 'main' | 'products' | 'categories' | 'images' | 'videos', page?: number): Promise<Buffer> {
    let xml: string;
    
    switch (type) {
      case 'main':
        xml = await this.generateMainSitemap();
        break;
      case 'products':
        xml = await this.generateProductsSitemap(page);
        break;
      case 'categories':
        xml = await this.generateCategoriesSitemap();
        break;
      case 'images':
        xml = await this.generateImageSitemap();
        break;
      case 'videos':
        xml = await this.generateVideoSitemap();
        break;
      default:
        throw new Error(`Unknown sitemap type: ${type}`);
    }

    const compressed = await gzip(xml);
    this.logger.debug(`Generated compressed ${type} sitemap (${xml.length} -> ${compressed.length} bytes)`);
    return compressed;
  }

  /**
   * Generate HTML sitemap for users
   */
  async generateHtmlSitemap(): Promise<string> {
    const cacheKey = 'sitemap:html';
    const cached = this.cacheService.get<string>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');
    const siteName = this.configService.get<string>('SITE_NAME', 'My Store');
    
    // Get all URLs
    const staticPages = this.getStaticPages();
    const categories = await this.getCategories();
    const recentProducts = await this.getProducts(1, 50); // Get first 50 products

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sitemap - ${siteName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1, h2 { color: #333; }
        ul { list-style-type: none; padding: 0; }
        li { margin: 5px 0; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .section { margin: 30px 0; }
        .url-count { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <h1>Sitemap - ${siteName}</h1>
    <p>This page contains links to all the important pages on our website.</p>
`;

    // Static pages section
    html += `
    <div class="section">
        <h2>Main Pages</h2>
        <ul>
`;
    staticPages.forEach(page => {
      html += `            <li><a href="${baseUrl}${page.path}">${page.title}</a></li>\n`;
    });
    html += `        </ul>
    </div>
`;

    // Categories section
    if (categories.length > 0) {
      html += `
    <div class="section">
        <h2>Categories <span class="url-count">(${categories.length} categories)</span></h2>
        <ul>
`;
      categories.forEach(category => {
        html += `            <li><a href="${baseUrl}/category/${category.slug || category.id}">${category.name}</a></li>\n`;
      });
      html += `        </ul>
    </div>
`;
    }

    // Recent products section
    if (recentProducts.length > 0) {
      html += `
    <div class="section">
        <h2>Recent Products <span class="url-count">(showing ${recentProducts.length} recent products)</span></h2>
        <ul>
`;
      recentProducts.forEach(product => {
        html += `            <li><a href="${baseUrl}/product/${product.slug || product.id}">${product.name}</a></li>\n`;
      });
      html += `        </ul>
        <p><a href="${baseUrl}/products">View all products</a></p>
    </div>
`;
    }

    html += `
    <div class="section">
        <h2>XML Sitemaps</h2>
        <ul>
            <li><a href="${baseUrl}/sitemap.xml">Main Sitemap (XML)</a></li>
            <li><a href="${baseUrl}/sitemap-products.xml">Products Sitemap (XML)</a></li>
            <li><a href="${baseUrl}/sitemap-categories.xml">Categories Sitemap (XML)</a></li>
        </ul>
    </div>

    <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; color: #666;">
        <p>Last updated: ${new Date().toLocaleDateString()}</p>
    </footer>
</body>
</html>`;

    // Cache for 4 hours
    this.cacheService.set(cacheKey, html, 14400000, ['sitemap']);
    
    this.logger.debug('Generated HTML sitemap');
    return html;
  }

  /**
   * Generate robots.txt content with dynamic sitemap links
   */
  async generateRobotsTxt(): Promise<string> {
    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');
    const environment = this.configService.get<string>('NODE_ENV', 'development');
    const isProduction = environment === 'production';
    const isStaging = environment === 'staging';
    const allowIndexing = this.configService.get<boolean>('ALLOW_INDEXING', isProduction);
    
    // Get dynamic sitemap information
    const totalProducts = await this.getTotalProductCount();
    const totalCategories = await this.getTotalCategoryCount();
    const hasImages = await this.hasProductImages();
    const hasVideos = await this.hasProductVideos();
    const supportedLocales = this.configService.get<string[]>('ENABLED_LOCALES', []);
    
    let robotsTxt = '';

    if (allowIndexing) {
      // Production/allowed indexing robots.txt
      robotsTxt = `# Robots.txt for ${baseUrl}
# Environment: ${environment}
# Generated: ${new Date().toISOString()}

User-agent: *
Allow: /

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml`;

      // Add product sitemaps (paginated if needed)
      const productsPerSitemap = this.maxUrlsPerSitemap;
      const totalProductPages = Math.ceil(totalProducts / productsPerSitemap);
      
      if (totalProductPages === 1) {
        robotsTxt += `\nSitemap: ${baseUrl}/sitemap-products.xml`;
      } else {
        for (let page = 1; page <= totalProductPages; page++) {
          robotsTxt += `\nSitemap: ${baseUrl}/sitemap-products-${page}.xml`;
        }
      }

      // Add categories sitemap
      robotsTxt += `\nSitemap: ${baseUrl}/sitemap-categories.xml`;

      // Add image sitemap if images exist
      if (hasImages) {
        robotsTxt += `\nSitemap: ${baseUrl}/sitemap-images.xml`;
      }

      // Add video sitemap if videos exist
      if (hasVideos) {
        robotsTxt += `\nSitemap: ${baseUrl}/sitemap-videos.xml`;
      }

      // Add locale-specific sitemaps
      for (const locale of supportedLocales) {
        robotsTxt += `\nSitemap: ${baseUrl}/sitemap-${locale}.xml`;
      }

      robotsTxt += `

# Crawl delay
Crawl-delay: 1

# Disallow admin and API endpoints
Disallow: /admin/
Disallow: /api/
Disallow: /auth/
Disallow: /checkout/
Disallow: /cart/
Disallow: /user/
Disallow: /account/

# Disallow search and filter URLs with parameters
Disallow: /*?*sort=
Disallow: /*?*filter=
Disallow: /*?*page=
Disallow: /*?*utm_
Disallow: /*?*ref=
Disallow: /*?*fbclid=
Disallow: /*?*gclid=

# Disallow duplicate content
Disallow: /print/
Disallow: /mobile/
Disallow: /*?print=1

# Allow specific bots with custom rules
User-agent: Googlebot
Allow: /
Crawl-delay: 0.5

User-agent: Bingbot
Allow: /
Crawl-delay: 1

User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: WhatsApp
Allow: /

# Block problematic bots
User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /`;

      // Add staging-specific rules
      if (isStaging) {
        robotsTxt += `

# Staging environment - limited indexing
User-agent: *
Disallow: /admin/
Disallow: /test/
Disallow: /staging/`;
      }

    } else {
      // Development/no indexing robots.txt
      robotsTxt = `# Robots.txt for ${baseUrl}
# Environment: ${environment}
# Generated: ${new Date().toISOString()}

User-agent: *
Disallow: /

# This is a ${environment} environment
# Indexing is disabled for this site
# Contact: webmaster@${baseUrl.replace('https://', '').replace('http://', '')}`;
    }

    this.logger.debug(`Generated dynamic robots.txt for ${environment} environment`);
    return robotsTxt;
  }

  /**
   * Invalidate sitemap cache
   */
  invalidateSitemapCache(): void {
    this.cacheService.invalidateByTag('sitemap');
    this.logger.log('Invalidated sitemap cache');
  }

  /**
   * Get total product count for pagination
   */
  private async getTotalProductCount(): Promise<number> {
    // Mock implementation - replace with actual database query
    return 150000; // Simulate large product catalog
  }

  /**
   * Get total category count
   */
  private async getTotalCategoryCount(): Promise<number> {
    // Mock implementation - replace with actual database query
    return 50;
  }

  /**
   * Check if products have images
   */
  private async hasProductImages(): Promise<boolean> {
    // Mock implementation - replace with actual database query
    return true;
  }

  /**
   * Check if products have videos
   */
  private async hasProductVideos(): Promise<boolean> {
    // Mock implementation - replace with actual database query
    return true;
  }

  /**
   * Get products with images
   */
  private async getProductsWithImages(): Promise<Array<{
    id: string;
    name: string;
    slug?: string;
    updatedAt?: string;
    images?: Array<{
      url: string;
      caption?: string;
      title?: string;
      license?: string;
    }>;
  }>> {
    // Mock implementation - replace with actual database query
    return [
      {
        id: 'product-1',
        name: 'Sample Product 1',
        slug: 'sample-product-1',
        updatedAt: new Date().toISOString(),
        images: [
          {
            url: 'https://example.com/images/product-1-main.jpg',
            caption: 'Main product image',
            title: 'Sample Product 1 - Main View',
          },
          {
            url: 'https://example.com/images/product-1-side.jpg',
            caption: 'Side view of the product',
            title: 'Sample Product 1 - Side View',
          },
        ],
      },
    ];
  }

  /**
   * Get products with videos
   */
  private async getProductsWithVideos(): Promise<Array<{
    id: string;
    name: string;
    slug?: string;
    updatedAt?: string;
    videos?: Array<{
      thumbnailUrl: string;
      title: string;
      description: string;
      contentUrl?: string;
      duration?: number;
      publicationDate?: string;
      familyFriendly?: boolean;
      rating?: number;
      viewCount?: number;
    }>;
  }>> {
    // Mock implementation - replace with actual database query
    return [
      {
        id: 'product-1',
        name: 'Sample Product 1',
        slug: 'sample-product-1',
        updatedAt: new Date().toISOString(),
        videos: [
          {
            thumbnailUrl: 'https://example.com/thumbnails/product-1-demo.jpg',
            title: 'Product Demo Video',
            description: 'Watch how to use this amazing product',
            contentUrl: 'https://example.com/videos/product-1-demo.mp4',
            duration: 120,
            publicationDate: new Date().toISOString(),
            familyFriendly: true,
            rating: 4.5,
            viewCount: 1500,
          },
        ],
      },
    ];
  }

  /**
   * Generate XML sitemap from URLs
   */
  private generateSitemapXml(urls: ISitemapUrl[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    urls.forEach(url => {
      xml += '  <url>\n';
      xml += `    <loc>${this.escapeXml(url.loc)}</loc>\n`;
      
      if (url.lastmod) {
        xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      }
      
      if (url.changefreq) {
        xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      }
      
      if (url.priority !== undefined) {
        xml += `    <priority>${url.priority.toFixed(1)}</priority>\n`;
      }
      
      xml += '  </url>\n';
    });

    xml += '</urlset>';
    return xml;
  }

  /**
   * Generate XML sitemap with image support
   */
  private generateImageSitemapXml(urls: ISitemapUrl[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    urls.forEach(url => {
      xml += '  <url>\n';
      xml += `    <loc>${this.escapeXml(url.loc)}</loc>\n`;
      
      if (url.lastmod) {
        xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      }
      
      if (url.changefreq) {
        xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      }
      
      if (url.priority !== undefined) {
        xml += `    <priority>${url.priority.toFixed(1)}</priority>\n`;
      }

      // Add image information
      if (url.images && url.images.length > 0) {
        url.images.forEach(image => {
          xml += '    <image:image>\n';
          xml += `      <image:loc>${this.escapeXml(image.loc)}</image:loc>\n`;
          
          if (image.caption) {
            xml += `      <image:caption>${this.escapeXml(image.caption)}</image:caption>\n`;
          }
          
          if (image.title) {
            xml += `      <image:title>${this.escapeXml(image.title)}</image:title>\n`;
          }
          
          if (image.license) {
            xml += `      <image:license>${this.escapeXml(image.license)}</image:license>\n`;
          }
          
          xml += '    </image:image>\n';
        });
      }
      
      xml += '  </url>\n';
    });

    xml += '</urlset>';
    return xml;
  }

  /**
   * Generate XML sitemap with video support
   */
  private generateVideoSitemapXml(urls: ISitemapUrl[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n';

    urls.forEach(url => {
      xml += '  <url>\n';
      xml += `    <loc>${this.escapeXml(url.loc)}</loc>\n`;
      
      if (url.lastmod) {
        xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      }
      
      if (url.changefreq) {
        xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      }
      
      if (url.priority !== undefined) {
        xml += `    <priority>${url.priority.toFixed(1)}</priority>\n`;
      }

      // Add video information
      if (url.videos && url.videos.length > 0) {
        url.videos.forEach(video => {
          xml += '    <video:video>\n';
          xml += `      <video:thumbnail_loc>${this.escapeXml(video.thumbnailLoc)}</video:thumbnail_loc>\n`;
          xml += `      <video:title>${this.escapeXml(video.title)}</video:title>\n`;
          xml += `      <video:description>${this.escapeXml(video.description)}</video:description>\n`;
          
          if (video.contentLoc) {
            xml += `      <video:content_loc>${this.escapeXml(video.contentLoc)}</video:content_loc>\n`;
          }
          
          if (video.duration) {
            xml += `      <video:duration>${video.duration}</video:duration>\n`;
          }
          
          if (video.publicationDate) {
            xml += `      <video:publication_date>${video.publicationDate}</video:publication_date>\n`;
          }
          
          if (video.familyFriendly !== undefined) {
            xml += `      <video:family_friendly>${video.familyFriendly ? 'yes' : 'no'}</video:family_friendly>\n`;
          }
          
          if (video.rating) {
            xml += `      <video:rating>${video.rating}</video:rating>\n`;
          }
          
          if (video.viewCount) {
            xml += `      <video:view_count>${video.viewCount}</video:view_count>\n`;
          }
          
          xml += '    </video:video>\n';
        });
      }
      
      xml += '  </url>\n';
    });

    xml += '</urlset>';
    return xml;
  }

  /**
   * Get static pages configuration
   */
  private getStaticPages(): Array<{
    path: string;
    title: string;
    changefreq?: 'always' | 'never' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    priority?: number;
  }> {
    return [
      { path: '/', title: 'Home', changefreq: 'daily', priority: 1.0 },
      { path: '/about', title: 'About Us', changefreq: 'monthly', priority: 0.7 },
      { path: '/contact', title: 'Contact Us', changefreq: 'monthly', priority: 0.7 },
      { path: '/privacy', title: 'Privacy Policy', changefreq: 'yearly', priority: 0.5 },
      { path: '/terms', title: 'Terms of Service', changefreq: 'yearly', priority: 0.5 },
      { path: '/shipping', title: 'Shipping Information', changefreq: 'monthly', priority: 0.6 },
      { path: '/returns', title: 'Returns & Refunds', changefreq: 'monthly', priority: 0.6 },
      { path: '/faq', title: 'FAQ', changefreq: 'monthly', priority: 0.6 },
    ];
  }

  /**
   * Mock function to get products (replace with actual database query)
   */
  private async getProducts(page: number = 1, limit: number = 1000): Promise<Array<{
    id: string;
    name: string;
    slug?: string;
    updatedAt?: string;
  }>> {
    // This is a mock implementation
    // In a real application, you would query your database
    const mockProducts: Array<{
      id: string;
      name: string;
      slug?: string;
      updatedAt?: string;
    }> = [];
    const offset = (page - 1) * limit;
    
    for (let i = offset; i < offset + Math.min(limit, 100); i++) {
      mockProducts.push({
        id: `product-${i + 1}`,
        name: `Product ${i + 1}`,
        slug: `product-${i + 1}`,
        updatedAt: new Date().toISOString(),
      });
    }
    
    return mockProducts;
  }

  /**
   * Mock function to get categories (replace with actual database query)
   */
  private async getCategories(): Promise<Array<{
    id: string;
    name: string;
    slug?: string;
    updatedAt?: string;
  }>> {
    // This is a mock implementation
    // In a real application, you would query your database
    return [
      { id: 'cat-1', name: 'Electronics', slug: 'electronics', updatedAt: new Date().toISOString() },
      { id: 'cat-2', name: 'Clothing', slug: 'clothing', updatedAt: new Date().toISOString() },
      { id: 'cat-3', name: 'Books', slug: 'books', updatedAt: new Date().toISOString() },
      { id: 'cat-4', name: 'Home & Garden', slug: 'home-garden', updatedAt: new Date().toISOString() },
      { id: 'cat-5', name: 'Sports', slug: 'sports', updatedAt: new Date().toISOString() },
    ];
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    };

    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}