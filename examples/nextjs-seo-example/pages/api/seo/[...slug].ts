import type { NextApiRequest, NextApiResponse } from 'next';

interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  canonical: string;
  openGraph: {
    title: string;
    description: string;
    image: string;
    url: string;
    type: string;
    siteName: string;
  };
  twitter: {
    card: string;
    title: string;
    description: string;
    image: string;
    creator: string;
  };
  structuredData: Record<string, any>[];
  hreflang: Array<{
    hreflang: string;
    href: string;
  }>;
}

interface LocaleConfig {
  locales: Array<{
    code: string;
    name: string;
    nativeName: string;
    enabled: boolean;
    isDefault: boolean;
    direction: 'ltr' | 'rtl';
    dateFormat: string;
    timeFormat: string;
    currency: string;
  }>;
  defaultLocale: string;
  fallbackLocale: string;
  enabledLocales: string[];
}

interface LocaleUrls {
  [localeCode: string]: {
    [path: string]: string;
  };
}

// Mock data - in a real application, this would come from your backend API
const mockSEOData: Record<string, SEOMetadata> = {
  '/': {
    title: 'Home - My E-commerce Site',
    description: 'Welcome to our amazing e-commerce platform with the best products and deals.',
    keywords: ['ecommerce', 'shopping', 'products', 'deals'],
    canonical: 'https://example.com/',
    openGraph: {
      title: 'Home - My E-commerce Site',
      description: 'Welcome to our amazing e-commerce platform with the best products and deals.',
      image: 'https://example.com/images/og-home.jpg',
      url: 'https://example.com/',
      type: 'website',
      siteName: 'My E-commerce Site'
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Home - My E-commerce Site',
      description: 'Welcome to our amazing e-commerce platform with the best products and deals.',
      image: 'https://example.com/images/twitter-home.jpg',
      creator: '@myecommerce'
    },
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'My E-commerce Site',
        url: 'https://example.com',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://example.com/search?q={search_term_string}',
          'query-input': 'required name=search_term_string'
        }
      }
    ],
    hreflang: [
      { hreflang: 'en', href: 'https://example.com/' },
      { hreflang: 'es', href: 'https://example.com/es/' },
      { hreflang: 'fr', href: 'https://example.com/fr/' }
    ]
  },
  '/products': {
    title: 'Products - My E-commerce Site',
    description: 'Browse our extensive collection of high-quality products at great prices.',
    keywords: ['products', 'catalog', 'shopping', 'buy'],
    canonical: 'https://example.com/products',
    openGraph: {
      title: 'Products - My E-commerce Site',
      description: 'Browse our extensive collection of high-quality products at great prices.',
      image: 'https://example.com/images/og-products.jpg',
      url: 'https://example.com/products',
      type: 'website',
      siteName: 'My E-commerce Site'
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Products - My E-commerce Site',
      description: 'Browse our extensive collection of high-quality products at great prices.',
      image: 'https://example.com/images/twitter-products.jpg',
      creator: '@myecommerce'
    },
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Products',
        description: 'Browse our extensive collection of high-quality products at great prices.',
        url: 'https://example.com/products'
      }
    ],
    hreflang: [
      { hreflang: 'en', href: 'https://example.com/products' },
      { hreflang: 'es', href: 'https://example.com/es/productos' },
      { hreflang: 'fr', href: 'https://example.com/fr/produits' }
    ]
  }
};

const mockLocaleConfig: LocaleConfig = {
  locales: [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      enabled: true,
      isDefault: true,
      direction: 'ltr',
      dateFormat: 'MM/dd/yyyy',
      timeFormat: '12h',
      currency: 'USD'
    },
    {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      enabled: true,
      isDefault: false,
      direction: 'ltr',
      dateFormat: 'dd/MM/yyyy',
      timeFormat: '24h',
      currency: 'EUR'
    },
    {
      code: 'fr',
      name: 'French',
      nativeName: 'Français',
      enabled: true,
      isDefault: false,
      direction: 'ltr',
      dateFormat: 'dd/MM/yyyy',
      timeFormat: '24h',
      currency: 'EUR'
    }
  ],
  defaultLocale: 'en',
  fallbackLocale: 'en',
  enabledLocales: ['en', 'es', 'fr']
};

const mockLocaleUrls: LocaleUrls = {
  en: {
    '/': '/',
    '/products': '/products',
    '/about': '/about',
    '/contact': '/contact'
  },
  es: {
    '/': '/es/',
    '/products': '/es/productos',
    '/about': '/es/acerca-de',
    '/contact': '/es/contacto'
  },
  fr: {
    '/': '/fr/',
    '/products': '/fr/produits',
    '/about': '/fr/a-propos',
    '/contact': '/fr/contact'
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug } = req.query;
  const slugArray = Array.isArray(slug) ? slug : [slug];
  const endpoint = slugArray.join('/');

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    switch (endpoint) {
      case 'metadata':
        return handleMetadata(req, res);
      
      case 'locale/hreflang':
        return handleHreflang(req, res);
      
      case 'locale/config':
        return handleLocaleConfig(req, res);
      
      case 'locale/urls':
        return handleLocaleUrls(req, res);
      
      default:
        return res.status(404).json({ error: 'SEO endpoint not found' });
    }
  } catch (error) {
    console.error('SEO API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function handleMetadata(req: NextApiRequest, res: NextApiResponse) {
  const { path = '/', locale = 'en' } = req.query;
  const pathString = Array.isArray(path) ? path[0] : path;
  
  // Get SEO data for the requested path
  let seoData = mockSEOData[pathString] || mockSEOData['/'];
  
  // Localize the SEO data based on the requested locale
  if (locale !== 'en') {
    seoData = {
      ...seoData,
      title: localizeText(seoData.title, locale as string),
      description: localizeText(seoData.description, locale as string),
      openGraph: {
        ...seoData.openGraph,
        title: localizeText(seoData.openGraph.title, locale as string),
        description: localizeText(seoData.openGraph.description, locale as string)
      },
      twitter: {
        ...seoData.twitter,
        title: localizeText(seoData.twitter.title, locale as string),
        description: localizeText(seoData.twitter.description, locale as string)
      }
    };
  }
  
  res.status(200).json(seoData);
}

function handleHreflang(req: NextApiRequest, res: NextApiResponse) {
  const { path = '/' } = req.query;
  const pathString = Array.isArray(path) ? path[0] : path;
  
  // Generate hreflang tags for the requested path
  const hreflangTags = mockLocaleConfig.enabledLocales.map(localeCode => {
    const localizedPath = mockLocaleUrls[localeCode]?.[pathString] || pathString;
    return {
      hreflang: localeCode,
      href: `https://example.com${localizedPath}`
    };
  });
  
  // Add x-default hreflang
  hreflangTags.push({
    hreflang: 'x-default',
    href: `https://example.com${pathString}`
  });
  
  res.status(200).json(hreflangTags);
}

function handleLocaleConfig(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json(mockLocaleConfig);
}

function handleLocaleUrls(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json(mockLocaleUrls);
}

// Helper function to localize text (simplified implementation)
function localizeText(text: string, locale: string): string {
  // In a real application, this would use a proper i18n library
  const translations: Record<string, Record<string, string>> = {
    es: {
      'Home - My E-commerce Site': 'Inicio - Mi Sitio de Comercio Electrónico',
      'Welcome to our amazing e-commerce platform with the best products and deals.': 'Bienvenido a nuestra increíble plataforma de comercio electrónico con los mejores productos y ofertas.',
      'Products - My E-commerce Site': 'Productos - Mi Sitio de Comercio Electrónico',
      'Browse our extensive collection of high-quality products at great prices.': 'Navega por nuestra extensa colección de productos de alta calidad a excelentes precios.'
    },
    fr: {
      'Home - My E-commerce Site': 'Accueil - Mon Site E-commerce',
      'Welcome to our amazing e-commerce platform with the best products and deals.': 'Bienvenue sur notre incroyable plateforme e-commerce avec les meilleurs produits et offres.',
      'Products - My E-commerce Site': 'Produits - Mon Site E-commerce',
      'Browse our extensive collection of high-quality products at great prices.': 'Parcourez notre vaste collection de produits de haute qualité à des prix avantageux.'
    }
  };
  
  return translations[locale]?.[text] || text;
}