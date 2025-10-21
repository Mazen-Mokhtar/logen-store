import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IUrlSlug } from './interfaces/seo.interface';

@Injectable()
export class UrlOptimizationService {
  private readonly logger = new Logger(UrlOptimizationService.name);
  private readonly slugCache = new Map<string, string>();
  private readonly reverseSlugCache = new Map<string, string>();

  constructor(private configService: ConfigService) {}

  /**
   * Generate SEO-friendly slug from text
   */
  generateSlug(text: string, options?: {
    maxLength?: number;
    separator?: string;
    lowercase?: boolean;
    removeStopWords?: boolean;
  }): string {
    const {
      maxLength = 60,
      separator = '-',
      lowercase = true,
      removeStopWords = false,
    } = options || {};

    // Check cache first
    const cacheKey = `${text}_${JSON.stringify(options)}`;
    if (this.slugCache.has(cacheKey)) {
      return this.slugCache.get(cacheKey)!;
    }

    let slug = text;

    // Convert to lowercase if specified
    if (lowercase) {
      slug = slug.toLowerCase();
    }

    // Remove HTML tags
    slug = slug.replace(/<[^>]*>/g, '');

    // Replace special characters and accents
    slug = this.removeAccents(slug);

    // Remove stop words if specified
    if (removeStopWords) {
      slug = this.removeStopWords(slug);
    }

    // Replace non-alphanumeric characters with separator
    slug = slug.replace(/[^a-zA-Z0-9\s]/g, ' ');

    // Replace multiple spaces/separators with single separator
    slug = slug.replace(/\s+/g, separator);
    slug = slug.replace(new RegExp(`\\${separator}+`, 'g'), separator);

    // Remove leading/trailing separators
    slug = slug.replace(new RegExp(`^\\${separator}+|\\${separator}+$`, 'g'), '');

    // Truncate if too long
    if (slug.length > maxLength) {
      slug = slug.substring(0, maxLength);
      // Ensure we don't cut in the middle of a word
      const lastSeparator = slug.lastIndexOf(separator);
      if (lastSeparator > maxLength * 0.8) {
        slug = slug.substring(0, lastSeparator);
      }
    }

    // Ensure slug is not empty
    if (!slug) {
      slug = 'untitled';
    }

    // Cache the result
    this.slugCache.set(cacheKey, slug);
    this.reverseSlugCache.set(slug, text);

    this.logger.debug(`Generated slug: "${text}" -> "${slug}"`);
    return slug;
  }

  /**
   * Generate product URL slug
   */
  generateProductSlug(productName: string, productId: string, categorySlug?: string): string {
    const baseSlug = this.generateSlug(productName, {
      maxLength: 50,
      removeStopWords: true,
    });

    // Add category prefix if provided
    let fullSlug = categorySlug ? `${categorySlug}/${baseSlug}` : baseSlug;

    // Ensure uniqueness by appending ID if needed
    const uniqueSlug = this.ensureUniqueness(fullSlug, productId, 'product');

    return uniqueSlug;
  }

  /**
   * Generate category URL slug
   */
  generateCategorySlug(categoryName: string, categoryId: string, parentSlug?: string): string {
    const baseSlug = this.generateSlug(categoryName, {
      maxLength: 40,
      removeStopWords: false,
    });

    // Add parent category prefix if provided
    let fullSlug = parentSlug ? `${parentSlug}/${baseSlug}` : baseSlug;

    // Ensure uniqueness
    const uniqueSlug = this.ensureUniqueness(fullSlug, categoryId, 'category');

    return uniqueSlug;
  }

  /**
   * Generate page URL slug
   */
  generatePageSlug(pageTitle: string, pageId: string): string {
    const baseSlug = this.generateSlug(pageTitle, {
      maxLength: 60,
      removeStopWords: true,
    });

    return this.ensureUniqueness(baseSlug, pageId, 'page');
  }

  /**
   * Validate URL slug format
   */
  validateSlug(slug: string): {
    isValid: boolean;
    errors: string[];
    suggestions?: string;
  } {
    const errors: string[] = [];

    // Check length
    if (slug.length < 3) {
      errors.push('Slug must be at least 3 characters long');
    }
    if (slug.length > 100) {
      errors.push('Slug must not exceed 100 characters');
    }

    // Check format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      errors.push('Slug can only contain lowercase letters, numbers, and hyphens');
    }

    // Check for consecutive hyphens
    if (slug.includes('--')) {
      errors.push('Slug cannot contain consecutive hyphens');
    }

    // Check start/end with hyphen
    if (slug.startsWith('-') || slug.endsWith('-')) {
      errors.push('Slug cannot start or end with a hyphen');
    }

    // Check for reserved words
    const reservedWords = ['admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'test'];
    if (reservedWords.includes(slug)) {
      errors.push('Slug cannot be a reserved word');
    }

    const result = {
      isValid: errors.length === 0,
      errors,
    };

    // Provide suggestion if invalid
    if (!result.isValid) {
      result['suggestions'] = this.generateSlug(slug, { maxLength: 60 });
    }

    return result;
  }

  /**
   * Get canonical URL for a given path
   */
  getCanonicalUrl(path: string): string {
    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');
    
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    // Ensure trailing slash consistency based on configuration
    const trailingSlash = this.configService.get<boolean>('SEO_TRAILING_SLASH', false);
    let canonicalPath = cleanPath;
    
    if (trailingSlash && !canonicalPath.endsWith('/') && canonicalPath.includes('.') === false) {
      canonicalPath += '/';
    } else if (!trailingSlash && canonicalPath.endsWith('/') && canonicalPath.length > 1) {
      canonicalPath = canonicalPath.slice(0, -1);
    }

    return `${baseUrl}/${canonicalPath}`;
  }

  /**
   * Generate breadcrumb structure from URL
   */
  generateBreadcrumbs(url: string): Array<{ name: string; url: string }> {
    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');
    const siteName = this.configService.get<string>('SITE_NAME', 'Home');
    
    const breadcrumbs = [
      { name: siteName, url: baseUrl }
    ];

    // Remove base URL and split path
    const path = url.replace(baseUrl, '').replace(/^\/+|\/+$/g, '');
    if (!path) {
      return breadcrumbs;
    }

    const segments = path.split('/');
    let currentPath = '';

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Convert slug back to readable name
      const name = this.slugToTitle(segment);
      
      breadcrumbs.push({
        name,
        url: `${baseUrl}${currentPath}`
      });
    });

    return breadcrumbs;
  }

  /**
   * Convert slug back to title format
   */
  slugToTitle(slug: string): string {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Check if URL is SEO-friendly
   */
  isSeoFriendly(url: string): {
    isFriendly: boolean;
    score: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let score = 100;

    // Extract path from URL
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Check length
    if (path.length > 100) {
      score -= 20;
      recommendations.push('URL is too long (over 100 characters)');
    }

    // Check for parameters in path
    if (path.includes('?') || path.includes('&')) {
      score -= 15;
      recommendations.push('Avoid query parameters in URL structure');
    }

    // Check for underscores
    if (path.includes('_')) {
      score -= 10;
      recommendations.push('Use hyphens instead of underscores');
    }

    // Check for uppercase letters
    if (path !== path.toLowerCase()) {
      score -= 10;
      recommendations.push('Use lowercase letters only');
    }

    // Check depth (number of slashes)
    const depth = (path.match(/\//g) || []).length;
    if (depth > 4) {
      score -= 15;
      recommendations.push('URL structure is too deep (more than 4 levels)');
    }

    // Check for meaningful words
    const segments = path.split('/').filter(s => s.length > 0);
    const meaningfulSegments = segments.filter(s => 
      s.length > 2 && !/^\d+$/.test(s) && !s.includes('id')
    );
    
    if (meaningfulSegments.length / segments.length < 0.5) {
      score -= 20;
      recommendations.push('Include more descriptive words in URL');
    }

    return {
      isFriendly: score >= 70,
      score: Math.max(0, score),
      recommendations
    };
  }

  /**
   * Remove accents and special characters
   */
  private removeAccents(text: string): string {
    const accentMap: { [key: string]: string } = {
      'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
      'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
      'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
      'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
      'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
      'ý': 'y', 'ÿ': 'y',
      'ñ': 'n', 'ç': 'c',
      'ß': 'ss',
      'æ': 'ae', 'œ': 'oe'
    };

    return text.replace(/[àáâãäåèéêëìíîïòóôõöùúûüýÿñçßæœ]/g, 
      match => accentMap[match] || match
    );
  }

  /**
   * Remove common stop words
   */
  private removeStopWords(text: string): string {
    const stopWords = [
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
      'had', 'what', 'said', 'each', 'which', 'she', 'do', 'how', 'their'
    ];

    return text
      .split(' ')
      .filter(word => !stopWords.includes(word.toLowerCase()))
      .join(' ');
  }

  /**
   * Ensure slug uniqueness by appending identifier if needed
   */
  private ensureUniqueness(slug: string, id: string, type: string): string {
    // In a real implementation, you would check against a database
    // For now, we'll append the ID if the slug might conflict
    const potentialConflicts = ['product', 'category', 'page', 'admin', 'api'];
    
    if (potentialConflicts.includes(slug) || slug.length < 3) {
      return `${slug}-${id.substring(0, 8)}`;
    }

    return slug;
  }
}