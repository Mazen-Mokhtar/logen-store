# SEO Module Documentation

## Overview

The SEO Module is a comprehensive, enterprise-grade SEO system built for NestJS applications. It provides a complete suite of SEO tools including metadata management, sitemap generation, structured data, URL optimization, caching, and SEO-friendly redirects.

## Features

### 🚀 Core Features
- **Dynamic Metadata Management**: Auto-generated meta tags, Open Graph, and Twitter Cards
- **Sitemap Generation**: XML and HTML sitemaps with pagination support
- **Structured Data**: JSON-LD schema markup for products, categories, organizations, and more
- **URL Optimization**: SEO-friendly slug generation and canonical URL management
- **Smart Caching**: LRU cache with TTL and tag-based invalidation
- **SEO Redirects**: 301/302 redirects for legacy URLs and common SEO patterns
- **Performance Optimized**: Built-in caching and compression support
- **Multi-language Support**: Hreflang tags and internationalization ready

### 🛠️ Technical Features
- **Type Safety**: Full TypeScript support with DTOs and interfaces
- **Validation**: Input validation using class-validator
- **Documentation**: Swagger/OpenAPI integration
- **Scalable**: Modular architecture with dependency injection
- **Production Ready**: Error handling, logging, and monitoring

## Module Structure

```
src/modules/seo/
├── README.md                           # This documentation
├── seo.module.ts                       # Main module configuration
├── seo.controller.ts                   # HTTP endpoints
├── seo.service.ts                      # Main orchestrator service
├── services/
│   ├── cache.service.ts               # LRU caching with TTL
│   ├── metadata.service.ts            # Meta tags and Open Graph
│   ├── sitemap.service.ts             # XML/HTML sitemap generation
│   ├── structured-data.service.ts     # JSON-LD schema markup
│   └── url-optimization.service.ts    # URL slugs and optimization
├── middleware/
│   ├── seo-meta.middleware.ts         # Auto-inject SEO metadata
│   └── seo-redirect.middleware.ts     # Handle SEO redirects
├── dto/
│   └── seo.dto.ts                     # Data transfer objects
└── interfaces/
    └── seo.interface.ts               # TypeScript interfaces
```

## API Endpoints

### Core SEO Endpoints

#### Robots.txt
```http
GET /robots.txt
```
Returns the robots.txt file with sitemap references and crawling rules.

#### Sitemaps
```http
GET /sitemap.xml                    # Main sitemap index
GET /sitemap-products.xml           # Products sitemap (paginated)
GET /sitemap-categories.xml         # Categories sitemap
GET /sitemap                        # HTML sitemap for users
```

### Metadata Endpoints

#### Dynamic Metadata
```http
GET /seo/metadata/product/:slug     # Product metadata
GET /seo/metadata/category/:slug    # Category metadata  
GET /seo/metadata/homepage          # Homepage metadata
```

**Response Example:**
```json
{
  "title": "Product Name - Site Name",
  "description": "Product description optimized for SEO",
  "keywords": ["keyword1", "keyword2"],
  "canonical": "https://example.com/products/product-slug",
  "openGraph": {
    "title": "Product Name",
    "description": "Product description",
    "image": "https://example.com/product-image.jpg",
    "url": "https://example.com/products/product-slug"
  },
  "twitterCard": {
    "card": "summary_large_image",
    "title": "Product Name",
    "description": "Product description",
    "image": "https://example.com/product-image.jpg"
  }
}
```

### Structured Data Endpoints

#### JSON-LD Schema
```http
GET /seo/structured-data/product/:slug      # Product schema
GET /seo/structured-data/category/:slug     # Category schema
GET /seo/structured-data/organization       # Organization schema
GET /seo/structured-data/website           # Website schema
```

**Product Schema Example:**
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "description": "Product description",
  "image": ["https://example.com/product-image.jpg"],
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "offers": {
    "@type": "Offer",
    "price": "99.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
}
```

### URL Optimization Endpoints

#### URL Management
```http
GET /seo/canonical/:path               # Get canonical URL
GET /seo/breadcrumbs/:path            # Get breadcrumb data
POST /seo/generate-slug               # Generate SEO-friendly slug
```

### Cache Management Endpoints

#### Cache Operations
```http
GET /seo/cache/stats                  # Cache statistics
POST /seo/cache/clear                 # Clear entire cache
POST /seo/cache/invalidate/:tag       # Invalidate by tag
POST /seo/cache/warmup                # Warm up critical cache
```

### SEO Management Endpoints

#### Health & Configuration
```http
GET /seo/health                       # SEO system health check
GET /seo/config                       # SEO configuration
GET /seo/redirects                    # Active redirect rules
```

## Services

### SeoService (Main Orchestrator)
The main service that coordinates all SEO functionality:

```typescript
// Get complete SEO data for a page
const seoData = await this.seoService.getSeoData('product', 'product-slug');

// Generate complete HTML head section
const htmlHead = await this.seoService.generateHtmlHead('product', 'product-slug');

// Check redirect rules
const redirect = await this.seoService.checkRedirectRules('/old-url');
```

### MetadataService
Handles dynamic metadata generation:

```typescript
// Generate product metadata
const metadata = await this.metadataService.generateProductMetadata(productSlug);

// Generate hreflang tags
const hreflang = await this.metadataService.generateHreflangTags(currentUrl, languages);
```

### SitemapService
Manages sitemap generation:

```typescript
// Generate main sitemap
const sitemap = await this.sitemapService.generateMainSitemap();

// Generate products sitemap with pagination
const productsSitemap = await this.sitemapService.generateProductsSitemap(page);
```

### StructuredDataService
Creates JSON-LD structured data:

```typescript
// Generate product structured data
const productSchema = await this.structuredDataService.generateProductStructuredData(productSlug);

// Generate organization schema
const orgSchema = await this.structuredDataService.generateOrganizationStructuredData();
```

### UrlOptimizationService
Handles URL optimization:

```typescript
// Generate SEO-friendly slug
const slug = await this.urlOptimizationService.generateSlug('Product Name', 'product');

// Get canonical URL
const canonical = await this.urlOptimizationService.getCanonicalUrl('/products/product-name');
```

### CacheService
Provides intelligent caching:

```typescript
// Cache with TTL and tags
await this.cacheService.set('key', data, 3600000, ['products', 'seo']);

// Invalidate by tag
await this.cacheService.invalidateByTag('products');

// Get cache statistics
const stats = await this.cacheService.getStats();
```

## Middleware

### Middleware Order (in app.module.ts)

The SEO middleware is integrated into the application middleware stack in the following order:

```typescript
configure(consumer: MiddlewareConsumer) {
  // 1. Core Infrastructure
  consumer.apply(ErrorHandlingMiddleware).forRoutes('*');
  consumer.apply(MetricsMiddleware).forRoutes('*');

  // 2. Security
  consumer.apply(HelmetMiddleware).forRoutes('*');
  consumer.apply(SanitizationMiddleware).forRoutes('*');

  // 3. SEO (Critical for proper SEO handling)
  consumer.apply(SeoRedirectMiddleware).forRoutes('*');    // Handle redirects first
  consumer.apply(SeoMetaMiddleware).forRoutes('*');        // Inject metadata

  // 4. Rate Limiting
  consumer.apply(RateLimitMiddleware).forRoutes('*');
  consumer.apply(CsrfMiddleware).forRoutes('*');
  
  // 5. Specialized Rate Limiting
  // ... other middleware
}
```

### SeoRedirectMiddleware
Handles SEO-friendly redirects:

- **301 Redirects**: Permanent redirects for moved content
- **302 Redirects**: Temporary redirects
- **Common Patterns**: Trailing slashes, lowercase URLs, index file removal
- **Custom Rules**: Database-driven redirect rules

### SeoMetaMiddleware
Automatically injects SEO metadata into HTML responses:

- **Smart Detection**: Identifies page type from URL patterns
- **Dynamic Injection**: Injects meta tags, Open Graph, structured data
- **Performance**: Caches generated metadata
- **Non-intrusive**: Only processes HTML responses

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```env
# SEO Configuration
SEO_CACHE_TTL=3600000                    # Cache TTL in milliseconds (1 hour)
SEO_CACHE_MAX_SIZE=1000                  # Maximum cache entries
SITE_URL=https://example.com             # Your site URL
SITE_NAME=Your Site Name                 # Site name for metadata
SITE_DESCRIPTION=Your site description   # Default site description
SITE_KEYWORDS=keyword1,keyword2,keyword3 # Default keywords

# Organization Information (for structured data)
ORGANIZATION_NAME=Your Company Inc.
ORGANIZATION_URL=https://example.com
ORGANIZATION_LOGO=https://example.com/logo.png
ORGANIZATION_CONTACT_TYPE=customer service
ORGANIZATION_TELEPHONE=+1-555-123-4567
ORGANIZATION_EMAIL=contact@example.com
ORGANIZATION_ADDRESS_STREET=123 Business St
ORGANIZATION_ADDRESS_CITY=Business City
ORGANIZATION_ADDRESS_REGION=BC
ORGANIZATION_ADDRESS_POSTAL_CODE=12345
ORGANIZATION_ADDRESS_COUNTRY=US

# Multi-language Support
DEFAULT_LANGUAGE=en
SUPPORTED_LANGUAGES=en,es,fr

# Sitemap Configuration
SITEMAP_PRODUCTS_PER_PAGE=1000
SITEMAP_CATEGORIES_PER_PAGE=500
```

## Usage Examples

### Basic Integration

1. **Import the module** in your `app.module.ts`:
```typescript
import { SeoModule } from './modules/seo/seo.module';

@Module({
  imports: [
    // ... other modules
    SeoModule,
  ],
})
export class AppModule {}
```

2. **Use in controllers**:
```typescript
import { SeoService } from './modules/seo/seo.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly seoService: SeoService) {}

  @Get(':slug')
  async getProduct(@Param('slug') slug: string) {
    // Get product data
    const product = await this.productsService.findBySlug(slug);
    
    // Get SEO data (automatically cached)
    const seoData = await this.seoService.getSeoData('product', slug);
    
    return {
      product,
      seo: seoData
    };
  }
}
```

### Advanced Usage

#### Custom Metadata Generation
```typescript
import { MetadataService } from './modules/seo/services/metadata.service';

@Injectable()
export class CustomSeoService {
  constructor(private readonly metadataService: MetadataService) {}

  async generateCustomPageMetadata(pageData: any) {
    return await this.metadataService.generateCustomMetadata({
      title: `${pageData.title} - Custom Page`,
      description: pageData.description,
      keywords: pageData.tags,
      canonical: `https://example.com/custom/${pageData.slug}`,
      openGraph: {
        title: pageData.title,
        description: pageData.description,
        image: pageData.featuredImage,
        type: 'article'
      }
    });
  }
}
```

#### Cache Warming Strategy
```typescript
import { CacheService } from './modules/seo/services/cache.service';

@Injectable()
export class SeoWarmupService {
  constructor(private readonly cacheService: CacheService) {}

  async warmupCriticalPages() {
    const criticalPages = [
      { type: 'homepage', slug: null },
      { type: 'product', slug: 'best-seller-product' },
      { type: 'category', slug: 'popular-category' }
    ];

    for (const page of criticalPages) {
      await this.seoService.getSeoData(page.type, page.slug);
    }
  }
}
```

## Performance Considerations

### Caching Strategy
- **LRU Eviction**: Automatically removes least recently used entries
- **TTL Support**: Configurable time-to-live for cache entries
- **Tag-based Invalidation**: Invalidate related cache entries efficiently
- **Memory Management**: Configurable maximum cache size

### Optimization Tips
1. **Warm up cache** for critical pages during application startup
2. **Use appropriate TTL** values based on content update frequency
3. **Implement cache invalidation** when content changes
4. **Monitor cache hit rates** using the `/seo/cache/stats` endpoint

## Monitoring & Health Checks

### Health Check Endpoint
```http
GET /seo/health
```

Returns comprehensive health information:
```json
{
  "status": "healthy",
  "cache": {
    "status": "healthy",
    "hitRate": 0.85,
    "size": 450,
    "maxSize": 1000
  },
  "services": {
    "metadata": "healthy",
    "sitemap": "healthy",
    "structuredData": "healthy",
    "urlOptimization": "healthy"
  },
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

### Cache Statistics
```http
GET /seo/cache/stats
```

Provides detailed cache metrics:
```json
{
  "size": 450,
  "maxSize": 1000,
  "hitRate": 0.85,
  "missRate": 0.15,
  "totalHits": 1700,
  "totalMisses": 300,
  "evictions": 25,
  "tags": ["products", "categories", "metadata", "sitemaps"]
}
```

## Best Practices

### SEO Best Practices
1. **Unique Titles**: Ensure each page has a unique, descriptive title
2. **Meta Descriptions**: Write compelling descriptions under 160 characters
3. **Canonical URLs**: Always specify canonical URLs to avoid duplicate content
4. **Structured Data**: Implement relevant schema markup for better search results
5. **Mobile-First**: Ensure all SEO elements work on mobile devices

### Performance Best Practices
1. **Cache Warming**: Pre-load cache for critical pages
2. **Efficient Invalidation**: Use specific tags for cache invalidation
3. **Monitor Performance**: Regularly check cache hit rates and response times
4. **Optimize Images**: Use appropriate image formats and sizes for Open Graph

### Development Best Practices
1. **Type Safety**: Use provided DTOs and interfaces
2. **Error Handling**: Implement proper error handling for SEO operations
3. **Testing**: Write tests for custom SEO logic
4. **Documentation**: Document custom SEO implementations

## Troubleshooting

### Common Issues

#### Cache Not Working
- Check `SEO_CACHE_TTL` and `SEO_CACHE_MAX_SIZE` environment variables
- Verify cache service is properly injected
- Monitor cache statistics for hit/miss rates

#### Metadata Not Appearing
- Ensure `SeoMetaMiddleware` is properly configured
- Check middleware order in `app.module.ts`
- Verify HTML responses are being processed

#### Redirects Not Working
- Confirm `SeoRedirectMiddleware` is applied before other middleware
- Check redirect rules configuration
- Verify URL patterns match expected format

#### Sitemap Issues
- Ensure database connections are working
- Check pagination parameters
- Verify URL generation logic

### Debug Mode
Enable debug logging by setting:
```env
LOGGING_LEVEL=debug
```

This will provide detailed logs for SEO operations, cache hits/misses, and middleware execution.

## Contributing

When extending the SEO module:

1. **Follow TypeScript conventions**: Use proper types and interfaces
2. **Add tests**: Write unit and integration tests for new features
3. **Update documentation**: Keep this README updated with new features
4. **Performance considerations**: Ensure new features don't impact performance
5. **Backward compatibility**: Maintain compatibility with existing implementations

## License

This SEO module is part of the NestJS application and follows the same licensing terms.