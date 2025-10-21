import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { UrlOptimizationService } from './url-optimization.service';
import { ISeoMetadata, IOpenGraph, ITwitterCard, IHreflang } from './interfaces/seo.interface';

@Injectable()
export class MetadataService {
  private readonly logger = new Logger(MetadataService.name);

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
    private urlOptimizationService: UrlOptimizationService,
  ) {}

  /**
   * Generate metadata for product pages
   */
  async generateProductMetadata(product: {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    images?: string[];
    category?: string;
    brand?: string;
    availability?: string;
    slug?: string;
  }): Promise<ISeoMetadata> {
    const cacheKey = `metadata:product:${product.id}`;
    const cached = this.cacheService.get<ISeoMetadata>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');
    const siteName = this.configService.get<string>('SITE_NAME', 'My Store');
    
    // Generate SEO-friendly title and description
    const title = this.generateProductTitle(product);
    const description = this.generateProductDescription(product);
    const keywords = this.generateProductKeywords(product);
    
    // Get product URL
    const productUrl = product.slug 
      ? `${baseUrl}/product/${product.slug}`
      : `${baseUrl}/product/${product.id}`;
    
    const canonical = this.urlOptimizationService.getCanonicalUrl(productUrl);
    
    // Get primary image
    const primaryImage = product.images && product.images.length > 0 
      ? (product.images[0].startsWith('http') ? product.images[0] : `${baseUrl}${product.images[0]}`)
      : `${baseUrl}/images/default-product.jpg`;

    const metadata: ISeoMetadata = {
      title,
      description,
      keywords,
      canonical,
      robots: 'index, follow',
      openGraph: {
        title,
        description,
        type: 'product',
        image: primaryImage,
        url: canonical,
        siteName,
      },
      twitterCard: {
        card: 'summary_large_image',
        title,
        description,
        image: primaryImage,
        site: this.configService.get<string>('TWITTER_SITE', ''),
      },
    };

    // Add product-specific Open Graph properties
    if (product.price) {
      metadata.openGraph['product:price:amount'] = product.price.toString();
      metadata.openGraph['product:price:currency'] = product.currency;
    }
    
    if (product.availability) {
      metadata.openGraph['product:availability'] = product.availability;
    }
    
    if (product.brand) {
      metadata.openGraph['product:brand'] = product.brand;
    }

    // Cache the result
    this.cacheService.set(cacheKey, metadata, undefined, ['product', `product:${product.id}`]);
    
    this.logger.debug(`Generated metadata for product: ${product.name}`);
    return metadata;
  }

  /**
   * Generate metadata for category pages
   */
  async generateCategoryMetadata(category: {
    id: string;
    name: string;
    description?: string;
    productCount?: number;
    slug?: string;
    parentCategory?: string;
  }): Promise<ISeoMetadata> {
    const cacheKey = `metadata:category:${category.id}`;
    const cached = this.cacheService.get<ISeoMetadata>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');
    const siteName = this.configService.get<string>('SITE_NAME', 'My Store');
    
    const title = this.generateCategoryTitle(category);
    const description = this.generateCategoryDescription(category);
    const keywords = this.generateCategoryKeywords(category);
    
    const categoryUrl = category.slug 
      ? `${baseUrl}/category/${category.slug}`
      : `${baseUrl}/category/${category.id}`;
    
    const canonical = this.urlOptimizationService.getCanonicalUrl(categoryUrl);
    const defaultImage = `${baseUrl}/images/default-category.jpg`;

    const metadata: ISeoMetadata = {
      title,
      description,
      keywords,
      canonical,
      robots: 'index, follow',
      openGraph: {
        title,
        description,
        type: 'website',
        image: defaultImage,
        url: canonical,
        siteName,
      },
      twitterCard: {
        card: 'summary',
        title,
        description,
        image: defaultImage,
        site: this.configService.get<string>('TWITTER_SITE', ''),
      },
    };

    // Cache the result
    this.cacheService.set(cacheKey, metadata, undefined, ['category', `category:${category.id}`]);
    
    this.logger.debug(`Generated metadata for category: ${category.name}`);
    return metadata;
  }

  /**
   * Generate metadata for homepage
   */
  async generateHomepageMetadata(): Promise<ISeoMetadata> {
    const cacheKey = 'metadata:homepage';
    const cached = this.cacheService.get<ISeoMetadata>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');
    const siteName = this.configService.get<string>('SITE_NAME', 'My Store');
    const siteDescription = this.configService.get<string>('SITE_DESCRIPTION', 'Welcome to our online store');
    const defaultImage = `${baseUrl}/images/og-default.jpg`;

    const title = `${siteName} - ${siteDescription}`;
    const description = siteDescription;
    const keywords = this.configService.get<string>('SITE_KEYWORDS', '');

    const metadata: ISeoMetadata = {
      title,
      description,
      keywords,
      canonical: baseUrl,
      robots: 'index, follow',
      openGraph: {
        title,
        description,
        type: 'website',
        image: defaultImage,
        url: baseUrl,
        siteName,
      },
      twitterCard: {
        card: 'summary_large_image',
        title,
        description,
        image: defaultImage,
        site: this.configService.get<string>('TWITTER_SITE', ''),
      },
    };

    // Cache for longer period since homepage doesn't change often
    this.cacheService.set(cacheKey, metadata, 7200000, ['homepage']); // 2 hours
    
    this.logger.debug('Generated homepage metadata');
    return metadata;
  }

  /**
   * Generate metadata for custom pages
   */
  async generatePageMetadata(page: {
    title: string;
    description?: string;
    keywords?: string;
    path: string;
    image?: string;
    type?: string;
  }): Promise<ISeoMetadata> {
    const cacheKey = `metadata:page:${page.path}`;
    const cached = this.cacheService.get<ISeoMetadata>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');
    const siteName = this.configService.get<string>('SITE_NAME', 'My Store');
    
    const title = `${page.title} | ${siteName}`;
    const description = page.description || `${page.title} - ${siteName}`;
    const canonical = this.urlOptimizationService.getCanonicalUrl(page.path);
    const image = page.image || `${baseUrl}/images/og-default.jpg`;

    const metadata: ISeoMetadata = {
      title,
      description,
      keywords: page.keywords,
      canonical,
      robots: 'index, follow',
      openGraph: {
        title,
        description,
        type: page.type || 'article',
        image,
        url: canonical,
        siteName,
      },
      twitterCard: {
        card: 'summary_large_image',
        title,
        description,
        image,
        site: this.configService.get<string>('TWITTER_SITE', ''),
      },
    };

    // Cache the result
    this.cacheService.set(cacheKey, metadata, undefined, ['page']);
    
    this.logger.debug(`Generated metadata for page: ${page.title}`);
    return metadata;
  }

  /**
   * Generate hreflang tags for multi-language support
   */
  generateHreflangTags(currentUrl: string, languages: string[]): IHreflang[] {
    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');
    const hreflangTags: IHreflang[] = [];

    languages.forEach(lang => {
      const langUrl = lang === 'en' 
        ? currentUrl 
        : currentUrl.replace(baseUrl, `${baseUrl}/${lang}`);
      
      hreflangTags.push({
        hreflang: lang,
        href: langUrl,
      });
    });

    // Add x-default for default language
    hreflangTags.push({
      hreflang: 'x-default',
      href: currentUrl,
    });

    return hreflangTags;
  }

  /**
   * Generate HTML meta tags string
   */
  generateMetaTagsHtml(metadata: ISeoMetadata): string {
    let html = '';

    // Basic meta tags
    html += `<title>${this.escapeHtml(metadata.title)}</title>\n`;
    html += `<meta name="description" content="${this.escapeHtml(metadata.description)}">\n`;
    
    if (metadata.keywords) {
      html += `<meta name="keywords" content="${this.escapeHtml(metadata.keywords)}">\n`;
    }
    
    if (metadata.canonical) {
      html += `<link rel="canonical" href="${metadata.canonical}">\n`;
    }
    
    if (metadata.robots) {
      html += `<meta name="robots" content="${metadata.robots}">\n`;
    }

    // Open Graph tags
    const og = metadata.openGraph;
    html += `<meta property="og:title" content="${this.escapeHtml(og.title)}">\n`;
    html += `<meta property="og:description" content="${this.escapeHtml(og.description)}">\n`;
    html += `<meta property="og:type" content="${og.type}">\n`;
    
    if (og.image) {
      html += `<meta property="og:image" content="${og.image}">\n`;
    }
    
    if (og.url) {
      html += `<meta property="og:url" content="${og.url}">\n`;
    }
    
    if (og.siteName) {
      html += `<meta property="og:site_name" content="${this.escapeHtml(og.siteName)}">\n`;
    }

    // Twitter Card tags
    const twitter = metadata.twitterCard;
    html += `<meta name="twitter:card" content="${twitter.card}">\n`;
    html += `<meta name="twitter:title" content="${this.escapeHtml(twitter.title)}">\n`;
    html += `<meta name="twitter:description" content="${this.escapeHtml(twitter.description)}">\n`;
    
    if (twitter.image) {
      html += `<meta name="twitter:image" content="${twitter.image}">\n`;
    }
    
    if (twitter.site) {
      html += `<meta name="twitter:site" content="${twitter.site}">\n`;
    }
    
    if (twitter.creator) {
      html += `<meta name="twitter:creator" content="${twitter.creator}">\n`;
    }

    // Hreflang tags
    if (metadata.hreflang && metadata.hreflang.length > 0) {
      metadata.hreflang.forEach(hreflang => {
        html += `<link rel="alternate" hreflang="${hreflang.hreflang}" href="${hreflang.href}">\n`;
      });
    }

    return html;
  }

  /**
   * Generate product title
   */
  private generateProductTitle(product: any): string {
    const siteName = this.configService.get<string>('SITE_NAME', 'My Store');
    let title = product.name;

    if (product.brand) {
      title = `${product.brand} ${title}`;
    }

    if (product.price && product.currency) {
      title += ` - ${product.currency} ${product.price}`;
    }

    return `${title} | ${siteName}`;
  }

  /**
   * Generate product description
   */
  private generateProductDescription(product: any): string {
    let description = product.description;

    // Truncate if too long
    if (description.length > 160) {
      description = description.substring(0, 157) + '...';
    }

    // Add price and availability info
    if (product.price && product.currency) {
      description += ` Price: ${product.currency} ${product.price}.`;
    }

    if (product.availability) {
      description += ` ${product.availability}.`;
    }

    return description;
  }

  /**
   * Generate product keywords
   */
  private generateProductKeywords(product: any): string {
    const keywords = [product.name];

    if (product.brand) {
      keywords.push(product.brand);
    }

    if (product.category) {
      keywords.push(product.category);
    }

    // Add generic keywords
    keywords.push('buy online', 'shop', 'store');

    return keywords.join(', ');
  }

  /**
   * Generate category title
   */
  private generateCategoryTitle(category: any): string {
    const siteName = this.configService.get<string>('SITE_NAME', 'My Store');
    let title = category.name;

    if (category.productCount) {
      title += ` (${category.productCount} products)`;
    }

    return `${title} | ${siteName}`;
  }

  /**
   * Generate category description
   */
  private generateCategoryDescription(category: any): string {
    let description = category.description || `Shop ${category.name} products`;

    if (category.productCount) {
      description += `. Browse ${category.productCount} products in this category.`;
    }

    // Truncate if too long
    if (description.length > 160) {
      description = description.substring(0, 157) + '...';
    }

    return description;
  }

  /**
   * Generate category keywords
   */
  private generateCategoryKeywords(category: any): string {
    const keywords = [category.name];

    if (category.parentCategory) {
      keywords.push(category.parentCategory);
    }

    // Add generic keywords
    keywords.push('shop', 'buy', 'products', 'online store');

    return keywords.join(', ');
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}