import { IsString, IsOptional, IsArray, IsUrl, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MetaTagsDto {
  @ApiProperty({ description: 'Page title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Meta description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Meta keywords' })
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiPropertyOptional({ description: 'Canonical URL' })
  @IsOptional()
  @IsUrl()
  canonical?: string;

  @ApiPropertyOptional({ description: 'Robots meta tag' })
  @IsOptional()
  @IsString()
  robots?: string;
}

export class OpenGraphDto {
  @ApiProperty({ description: 'OG title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'OG description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'OG type' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'OG image URL' })
  @IsOptional()
  @IsUrl()
  image?: string;

  @ApiPropertyOptional({ description: 'OG URL' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'OG site name' })
  @IsOptional()
  @IsString()
  siteName?: string;
}

export class TwitterCardDto {
  @ApiProperty({ description: 'Twitter card type' })
  @IsString()
  card: string;

  @ApiProperty({ description: 'Twitter title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Twitter description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Twitter image URL' })
  @IsOptional()
  @IsUrl()
  image?: string;

  @ApiPropertyOptional({ description: 'Twitter site handle' })
  @IsOptional()
  @IsString()
  site?: string;

  @ApiPropertyOptional({ description: 'Twitter creator handle' })
  @IsOptional()
  @IsString()
  creator?: string;
}

export class HreflangDto {
  @ApiProperty({ description: 'Language code' })
  @IsString()
  hreflang: string;

  @ApiProperty({ description: 'URL for this language' })
  @IsUrl()
  href: string;
}

export class SeoMetadataDto {
  @ApiProperty({ type: MetaTagsDto })
  meta: MetaTagsDto;

  @ApiProperty({ type: OpenGraphDto })
  openGraph: OpenGraphDto;

  @ApiProperty({ type: TwitterCardDto })
  twitterCard: TwitterCardDto;

  @ApiPropertyOptional({ type: [HreflangDto] })
  @IsOptional()
  @IsArray()
  hreflang?: HreflangDto[];

  @ApiPropertyOptional({ description: 'JSON-LD structured data' })
  @IsOptional()
  structuredData?: any;
}

export class SitemapUrlDto {
  @ApiProperty({ description: 'URL location' })
  @IsUrl()
  loc: string;

  @ApiPropertyOptional({ description: 'Last modification date' })
  @IsOptional()
  @IsString()
  lastmod?: string;

  @ApiPropertyOptional({ description: 'Change frequency' })
  @IsOptional()
  @IsString()
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

  @ApiPropertyOptional({ description: 'Priority (0.0 to 1.0)' })
  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  priority?: number;
}

export class CacheStatsDto {
  @ApiProperty({ description: 'Total cache entries' })
  @IsNumber()
  totalEntries: number;

  @ApiProperty({ description: 'Cache hit rate' })
  @IsNumber()
  hitRate: number;

  @ApiProperty({ description: 'Cache miss rate' })
  @IsNumber()
  missRate: number;

  @ApiProperty({ description: 'Memory usage in bytes' })
  @IsNumber()
  memoryUsage: number;

  @ApiProperty({ description: 'Maximum cache size' })
  @IsNumber()
  maxSize: number;
}

export class RedirectDto {
  @ApiProperty({ description: 'Source URL pattern' })
  @IsString()
  from: string;

  @ApiProperty({ description: 'Target URL' })
  @IsUrl()
  to: string;

  @ApiProperty({ description: 'HTTP status code' })
  @IsNumber()
  statusCode: number;

  @ApiPropertyOptional({ description: 'Whether redirect is permanent' })
  @IsOptional()
  @IsBoolean()
  permanent?: boolean;
}

// New DTOs for enhanced SEO API endpoints

export class LocaleConfigDto {
  @ApiProperty({ description: 'Locale code (e.g., en, ar)' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Locale display name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Native locale name' })
  @IsString()
  nativeName: string;

  @ApiPropertyOptional({ description: 'Region code' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ description: 'Text direction' })
  @IsString()
  direction: 'ltr' | 'rtl';

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Date format pattern' })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiProperty({ description: 'Whether locale is enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Whether this is the default locale' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class LocaleConfigResponseDto {
  @ApiProperty({ description: 'Default locale code' })
  @IsString()
  defaultLocale: string;

  @ApiProperty({ type: [LocaleConfigDto], description: 'Available locales' })
  @IsArray()
  locales: LocaleConfigDto[];

  @ApiProperty({ description: 'Whether locale detection is enabled' })
  @IsBoolean()
  detectionEnabled: boolean;

  @ApiProperty({ description: 'Whether hreflang tags are enabled' })
  @IsBoolean()
  hreflangEnabled: boolean;
}

export class MetadataQueryDto {
  @ApiProperty({ description: 'Page path (e.g., /products/smartphone)' })
  @IsString()
  path: string;

  @ApiPropertyOptional({ description: 'Locale code (e.g., en, ar)' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ description: 'Include structured data' })
  @IsOptional()
  @IsBoolean()
  includeStructuredData?: boolean;

  @ApiPropertyOptional({ description: 'Include hreflang tags' })
  @IsOptional()
  @IsBoolean()
  includeHreflang?: boolean;
}

export class EnhancedSeoMetadataDto extends SeoMetadataDto {
  @ApiProperty({ description: 'Page path' })
  @IsString()
  path: string;

  @ApiProperty({ description: 'Current locale' })
  @IsString()
  locale: string;

  @ApiProperty({ description: 'Page type (product, category, homepage, etc.)' })
  @IsString()
  pageType: string;

  @ApiPropertyOptional({ description: 'Last modified timestamp' })
  @IsOptional()
  @IsString()
  lastModified?: string;

  @ApiPropertyOptional({ description: 'Cache TTL in seconds' })
  @IsOptional()
  @IsNumber()
  cacheTtl?: number;

  @ApiPropertyOptional({ description: 'Breadcrumb data' })
  @IsOptional()
  breadcrumbs?: Array<{
    name: string;
    url: string;
    position: number;
  }>;
}

export class HreflangResponseDto {
  @ApiProperty({ description: 'Current page URL' })
  @IsUrl()
  currentUrl: string;

  @ApiProperty({ description: 'Current locale' })
  @IsString()
  currentLocale: string;

  @ApiProperty({ type: [HreflangDto], description: 'Hreflang tags' })
  @IsArray()
  hreflangTags: HreflangDto[];

  @ApiPropertyOptional({ description: 'Default language URL' })
  @IsOptional()
  @IsUrl()
  defaultUrl?: string;
}