# SEO API Documentation for Frontend Developers

## Overview

The SEO API provides comprehensive SEO metadata, locale configuration, and hreflang management for the Logen Store e-commerce platform. This API is designed to help frontend developers implement proper SEO practices, internationalization, and search engine optimization.

## Base URL

```
http://localhost:3000/api/seo
```

## Authentication

All SEO endpoints are publicly accessible and do not require authentication.

## Endpoints

### 1. Get SEO Metadata

**Endpoint:** `GET /seo/metadata`

**Description:** Returns comprehensive SEO metadata for any page path and locale, including meta tags, Open Graph data, Twitter Cards, structured data, and hreflang tags.

**Query Parameters:**
- `path` (required): The page path (e.g., `/`, `/products/smartphone`, `/categories/electronics`)
- `locale` (optional): Locale code (e.g., `en`, `ar`). Defaults to `en`
- `includeStructuredData` (optional): Include JSON-LD structured data. Defaults to `true`
- `includeHreflang` (optional): Include hreflang tags. Defaults to `true`

**Example Request:**
```javascript
const response = await fetch('/api/seo/metadata?path=/&locale=en');
const seoData = await response.json();
```

**Example Response:**
```json
{
  "meta": {
    "title": "Wivz - Premium Electronics & Technology",
    "description": "Discover premium electronics, gadgets, and technology products at Logen Store. Quality guaranteed with fast shipping worldwide.",
    "keywords": "electronics,technology,gadgets",
    "canonical": "https://example.com/",
    "robots": "index,follow"
  },
  "openGraph": {
    "title": "Wivz - Premium Electronics & Technology",
    "description": "Discover premium electronics, gadgets, and technology products at Logen Store. Quality guaranteed with fast shipping worldwide.",
    "type": "website",
    "image": "https://example.com/images/og-default.jpg",
    "url": "https://example.com/",
    "siteName": "Wivz"
  },
  "twitterCard": {
    "card": "summary_large_image",
    "title": "Wivz - Premium Electronics & Technology",
    "description": "Discover premium electronics, gadgets, and technology products at Logen Store. Quality guaranteed with fast shipping worldwide.",
    "image": "https://example.com/images/og-default.jpg",
    "site": "@logenstore"
  },
  "path": "/",
  "locale": "en",
  "pageType": "homepage",
  "lastModified": "2025-10-05T15:39:45.194Z",
  "cacheTtl": 3600,
  "structuredData": {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Wivz",
    "url": "https://example.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://example.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  },
  "hreflang": [
    {
      "hreflang": "en-US",
      "href": "https://example.com/",
      "title": "English"
    },
    {
      "hreflang": "x-default",
      "href": "https://example.com/",
      "title": "Default"
    }
  ],
  "breadcrumbs": [
    {
      "name": "Home",
      "url": "https://example.com/",
      "position": 1
    }
  ]
}
```

### 2. Get Locale Configuration

**Endpoint:** `GET /seo/locale/config`

**Description:** Returns available locales, default locale, and locale-related settings for frontend internationalization.

**Example Request:**
```javascript
const response = await fetch('/api/seo/locale/config');
const localeConfig = await response.json();
```

**Example Response:**
```json
{
  "defaultLocale": "en",
  "locales": [
    {
      "code": "en",
      "name": "English",
      "nativeName": "English",
      "region": "US",
      "direction": "ltr",
      "currency": "USD",
      "dateFormat": "MM/DD/YYYY",
      "timeFormat": "12h",
      "enabled": true
    },
    {
      "code": "ar",
      "name": "Arabic",
      "nativeName": "العربية",
      "region": "SA",
      "direction": "rtl",
      "currency": "SAR",
      "dateFormat": "DD/MM/YYYY",
      "timeFormat": "24h",
      "enabled": true
    }
  ]
}
```

### 3. Get Hreflang Tags

**Endpoint:** `GET /seo/locale/hreflang`

**Description:** Returns hreflang tags for all available locales for the given URL path.

**Query Parameters:**
- `url` (required): Full URL or path to generate hreflang tags for
- `locale` (optional): Current locale
- `includeDefault` (optional): Include x-default hreflang tag. Defaults to `true`

**Example Request:**
```javascript
const response = await fetch('/api/seo/locale/hreflang?url=/products/smartphone');
const hreflangData = await response.json();
```

**Example Response:**
```json
{
  "currentUrl": "https://example.com/products/smartphone",
  "currentLocale": "en",
  "hreflangTags": [
    {
      "hreflang": "en-US",
      "href": "https://example.com/products/smartphone"
    },
    {
      "hreflang": "ar-SA",
      "href": "https://example.com/ar/products/smartphone"
    },
    {
      "hreflang": "x-default",
      "href": "https://example.com/products/smartphone"
    }
  ]
}
```

## Frontend Integration Examples

### React/Next.js Integration

#### 1. SEO Metadata Hook

```javascript
import { useState, useEffect } from 'react';

export const useSEOMetadata = (path, locale = 'en') => {
  const [seoData, setSeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSEOData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/seo/metadata?path=${encodeURIComponent(path)}&locale=${locale}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setSeoData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (path) {
      fetchSEOData();
    }
  }, [path, locale]);

  return { seoData, loading, error };
};
```

#### 2. SEO Head Component

```javascript
import Head from 'next/head';
import { useSEOMetadata } from './hooks/useSEOMetadata';

export const SEOHead = ({ path, locale }) => {
  const { seoData, loading, error } = useSEOMetadata(path, locale);

  if (loading || error || !seoData) return null;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{seoData.meta.title}</title>
      <meta name="description" content={seoData.meta.description} />
      <meta name="keywords" content={seoData.meta.keywords} />
      <meta name="robots" content={seoData.meta.robots} />
      <link rel="canonical" href={seoData.meta.canonical} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={seoData.openGraph.title} />
      <meta property="og:description" content={seoData.openGraph.description} />
      <meta property="og:type" content={seoData.openGraph.type} />
      <meta property="og:image" content={seoData.openGraph.image} />
      <meta property="og:url" content={seoData.openGraph.url} />
      <meta property="og:site_name" content={seoData.openGraph.siteName} />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={seoData.twitterCard.card} />
      <meta name="twitter:title" content={seoData.twitterCard.title} />
      <meta name="twitter:description" content={seoData.twitterCard.description} />
      <meta name="twitter:image" content={seoData.twitterCard.image} />
      <meta name="twitter:site" content={seoData.twitterCard.site} />

      {/* Hreflang Tags */}
      {seoData.hreflang?.map((tag, index) => (
        <link
          key={index}
          rel="alternate"
          hrefLang={tag.hreflang}
          href={tag.href}
        />
      ))}

      {/* Structured Data */}
      {seoData.structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(seoData.structuredData)
          }}
        />
      )}
    </Head>
  );
};
```

#### 3. Breadcrumbs Component

```javascript
import Link from 'next/link';
import { useSEOMetadata } from './hooks/useSEOMetadata';

export const Breadcrumbs = ({ path, locale }) => {
  const { seoData } = useSEOMetadata(path, locale);

  if (!seoData?.breadcrumbs) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="breadcrumb">
        {seoData.breadcrumbs.map((crumb, index) => (
          <li key={index} className="breadcrumb-item">
            {index === seoData.breadcrumbs.length - 1 ? (
              <span aria-current="page">{crumb.name}</span>
            ) : (
              <Link href={crumb.url}>
                <a>{crumb.name}</a>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
```

### Vue.js Integration

#### 1. SEO Composable

```javascript
import { ref, computed, watch } from 'vue';

export function useSEO(path, locale = 'en') {
  const seoData = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchSEOData = async () => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await fetch(
        `/api/seo/metadata?path=${encodeURIComponent(path.value)}&locale=${locale.value}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      seoData.value = await response.json();
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  watch([path, locale], fetchSEOData, { immediate: true });

  return {
    seoData: computed(() => seoData.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    refetch: fetchSEOData
  };
}
```

## Performance Considerations

### Caching

- SEO metadata is cached for 1 hour (3600 seconds) by default
- Use appropriate cache headers in your frontend application
- Consider implementing client-side caching for frequently accessed pages

### Optimization Tips

1. **Batch Requests**: If you need multiple SEO data points, consider batching requests
2. **Lazy Loading**: Load SEO data only when needed
3. **Error Handling**: Always implement proper error handling for API calls
4. **Fallbacks**: Provide default SEO values when API calls fail

### Example Caching Implementation

```javascript
class SEOCache {
  constructor(ttl = 300000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttl
    });
  }

  clear() {
    this.cache.clear();
  }
}

const seoCache = new SEOCache();

export const fetchSEODataWithCache = async (path, locale) => {
  const cacheKey = `${path}-${locale}`;
  const cached = seoCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const response = await fetch(
    `/api/seo/metadata?path=${encodeURIComponent(path)}&locale=${locale}`
  );
  const data = await response.json();
  
  seoCache.set(cacheKey, data);
  return data;
};
```

## Error Handling

### Common Error Responses

```json
{
  "statusCode": 400,
  "message": "Path parameter is required",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 500,
  "message": "Failed to generate SEO metadata",
  "error": "Internal Server Error"
}
```

### Error Handling Best Practices

```javascript
const handleSEOError = (error, fallbackData) => {
  console.error('SEO API Error:', error);
  
  // Return fallback SEO data
  return {
    meta: {
      title: fallbackData.title || 'Logen Store',
      description: fallbackData.description || 'Premium electronics and technology',
      keywords: 'electronics,technology,gadgets',
      canonical: window.location.href,
      robots: 'index,follow'
    },
    // ... other fallback data
  };
};
```

## Testing

### Unit Testing Example

```javascript
import { render, waitFor } from '@testing-library/react';
import { SEOHead } from './SEOHead';

// Mock fetch
global.fetch = jest.fn();

describe('SEOHead Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('renders SEO metadata correctly', async () => {
    const mockSEOData = {
      meta: {
        title: 'Test Page',
        description: 'Test description'
      }
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSEOData
    });

    render(<SEOHead path="/test" locale="en" />);

    await waitFor(() => {
      expect(document.title).toBe('Test Page');
    });
  });
});
```

## Support

For questions or issues with the SEO API, please:

1. Check this documentation first
2. Review the API response format
3. Ensure proper error handling in your implementation
4. Contact the backend development team for API-specific issues

## Changelog

### Version 1.0.0
- Initial release with metadata, locale config, and hreflang endpoints
- Support for multiple locales (English, Arabic)
- Comprehensive SEO metadata including Open Graph and Twitter Cards
- Structured data support with JSON-LD
- Breadcrumb generation
- Performance optimization with caching