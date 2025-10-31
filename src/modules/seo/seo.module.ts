import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services
import { SeoService } from './seo.service';
import { SitemapService } from './sitemap.service';
import { MetadataService } from './metadata.service';
import { StructuredDataService } from './structured-data.service';
import { UrlOptimizationService } from './url-optimization.service';
import { CacheService } from './cache.service';
import { UrlManagementService } from './url-management.service';
import { LocaleService } from './locale.service';

// Controller
import { SeoController } from './seo.controller';

// Middleware
import { SeoMetaMiddleware } from './middleware/seo-meta.middleware';
import { SeoRedirectMiddleware } from './middleware/seo-redirect.middleware';

@Module({
  imports: [
    ConfigModule, // Import ConfigModule to access environment variables
  ],
  controllers: [
    SeoController,
  ],
  providers: [
    // Core SEO service
    SeoService,
    
    // Specialized services
    SitemapService,
    MetadataService,
    StructuredDataService,
    UrlOptimizationService,
    CacheService,
    UrlManagementService,
    LocaleService,
    
    // Middleware
    SeoMetaMiddleware,
    SeoRedirectMiddleware,
  ],
  exports: [
    // Export services for use in other modules
    SeoService,
    SitemapService,
    MetadataService,
    StructuredDataService,
    UrlOptimizationService,
    CacheService,
    UrlManagementService,
    LocaleService,
    
    // Export middleware for manual configuration if needed
    SeoMetaMiddleware,
    SeoRedirectMiddleware,
  ],
})
export class SeoModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply SEO meta middleware only (redirect middleware is handled globally in app.module.ts)
    consumer
      .apply(SeoMetaMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}