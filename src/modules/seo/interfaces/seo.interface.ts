export interface ISeoMetadata {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  robots?: string;
  openGraph: IOpenGraph;
  twitterCard: ITwitterCard;
  hreflang?: IHreflang[];
  structuredData?: any;
}

export interface IOpenGraph {
  title: string;
  description: string;
  type: string;
  image?: string;
  imageAlt?: string;
  url?: string;
  siteName?: string;
}

export interface ITwitterCard {
  card: string;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  site?: string;
  creator?: string;
}

export interface IHreflang {
  hreflang: string;
  href: string;
}

export interface ISitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'never' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority?: number;
  images?: IImageSitemapUrl[];
  videos?: IVideoSitemapUrl[];
}

export interface IImageSitemapUrl {
  loc: string;
  caption?: string;
  geoLocation?: string;
  title?: string;
  license?: string;
}

export interface IVideoSitemapUrl {
  thumbnailLoc: string;
  title: string;
  description: string;
  contentLoc?: string;
  playerLoc?: string;
  duration?: number;
  expirationDate?: string;
  rating?: number;
  viewCount?: number;
  publicationDate?: string;
  familyFriendly?: boolean;
  restriction?: {
    relationship: 'allow' | 'deny';
    countries: string[];
  };
  platform?: {
    relationship: 'allow' | 'deny';
    platforms: string[];
  };
  live?: boolean;
}

export interface ISitemap {
  urls: ISitemapUrl[];
  lastGenerated: Date;
  compressed?: boolean;
  size?: number;
}

export interface IStructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export interface IProductStructuredData extends IStructuredData {
  '@type': 'Product';
  name: string;
  description: string;
  image?: string[];
  brand?: {
    '@type': 'Brand';
    name: string;
  };
  offers?: {
    '@type': 'Offer';
    price: string;
    priceCurrency: string;
    availability: string;
    url?: string;
  };
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: number;
    reviewCount: number;
    bestRating?: number;
    worstRating?: number;
  };
  sku?: string;
  gtin?: string;
}

export interface ICategoryStructuredData extends IStructuredData {
  '@type': 'ItemList';
  name: string;
  description?: string;
  numberOfItems: number;
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    item: {
      '@type': 'Product';
      name: string;
      url: string;
      image?: string;
    };
  }>;
}

export interface IOrganizationStructuredData extends IStructuredData {
  '@type': 'Organization';
  name: string;
  url: string;
  logo?: string;
  description?: string;
  contactPoint?: Array<{
    '@type': 'ContactPoint';
    telephone: string;
    contactType: string;
    availableLanguage?: string[];
  }>;
  sameAs?: string[];
}

export interface IWebsiteStructuredData extends IStructuredData {
  '@type': 'WebSite';
  name: string;
  url: string;
  description?: string;
  potentialAction?: {
    '@type': 'SearchAction';
    target: string;
    'query-input': string;
  };
}

export interface IBreadcrumbStructuredData extends IStructuredData {
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item?: string;
  }>;
}

// Additional structured data interfaces for enterprise features
export interface IArticleStructuredData extends IStructuredData {
  '@type': 'Article' | 'NewsArticle' | 'BlogPosting';
  headline: string;
  author: {
    '@type': 'Person' | 'Organization';
    name: string;
    url?: string;
  };
  datePublished: string;
  dateModified?: string;
  image?: string | string[];
  publisher: {
    '@type': 'Organization';
    name: string;
    logo?: {
      '@type': 'ImageObject';
      url: string;
      width?: number;
      height?: number;
    };
  };
  mainEntityOfPage?: string;
  wordCount?: number;
  articleSection?: string;
  keywords?: string[];
}

export interface IEventStructuredData extends IStructuredData {
  '@type': 'Event';
  name: string;
  startDate: string;
  endDate?: string;
  location: {
    '@type': 'Place';
    name: string;
    address?: {
      '@type': 'PostalAddress';
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      postalCode?: string;
      addressCountry?: string;
    };
  };
  description?: string;
  image?: string | string[];
  organizer?: {
    '@type': 'Organization' | 'Person';
    name: string;
    url?: string;
  };
  offers?: {
    '@type': 'Offer';
    price?: string;
    priceCurrency?: string;
    availability?: string;
    url?: string;
  };
}

export interface IRecipeStructuredData extends IStructuredData {
  '@type': 'Recipe';
  name: string;
  description?: string;
  image?: string | string[];
  author?: {
    '@type': 'Person' | 'Organization';
    name: string;
  };
  datePublished?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeYield?: string;
  recipeCategory?: string;
  recipeCuisine?: string;
  recipeIngredient?: string[];
  recipeInstructions?: Array<{
    '@type': 'HowToStep';
    text: string;
    name?: string;
    url?: string;
    image?: string;
  }>;
  nutrition?: {
    '@type': 'NutritionInformation';
    calories?: string;
    fatContent?: string;
    carbohydrateContent?: string;
    proteinContent?: string;
  };
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: number;
    reviewCount: number;
    bestRating?: number;
    worstRating?: number;
  };
}

export interface IJobPostingStructuredData extends IStructuredData {
  '@type': 'JobPosting';
  title: string;
  description: string;
  datePosted: string;
  validThrough?: string;
  employmentType?: string;
  hiringOrganization: {
    '@type': 'Organization';
    name: string;
    sameAs?: string;
    logo?: string;
  };
  jobLocation: {
    '@type': 'Place';
    address: {
      '@type': 'PostalAddress';
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      postalCode?: string;
      addressCountry?: string;
    };
  };
  baseSalary?: {
    '@type': 'MonetaryAmount';
    currency: string;
    value: {
      '@type': 'QuantitativeValue';
      value: number;
      unitText: string;
    };
  };
  qualifications?: string;
  responsibilities?: string;
  skills?: string;
}

export interface IVideoStructuredData extends IStructuredData {
  '@type': 'VideoObject';
  name: string;
  description: string;
  thumbnailUrl: string | string[];
  uploadDate: string;
  duration?: string;
  contentUrl?: string;
  embedUrl?: string;
  interactionStatistic?: {
    '@type': 'InteractionCounter';
    interactionType: string;
    userInteractionCount: number;
  };
  publisher?: {
    '@type': 'Organization';
    name: string;
    logo?: {
      '@type': 'ImageObject';
      url: string;
    };
  };
}

export interface IHowToStructuredData extends IStructuredData {
  '@type': 'HowTo';
  name: string;
  description?: string;
  image?: string | string[];
  totalTime?: string;
  estimatedCost?: {
    '@type': 'MonetaryAmount';
    currency: string;
    value: string;
  };
  supply?: Array<{
    '@type': 'HowToSupply';
    name: string;
  }>;
  tool?: Array<{
    '@type': 'HowToTool';
    name: string;
  }>;
  step: Array<{
    '@type': 'HowToStep';
    name?: string;
    text: string;
    url?: string;
    image?: string;
  }>;
}

export interface IValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  score: number; // SEO score out of 100
}

export interface ISchemaValidationOptions {
  strict?: boolean;
  checkRecommended?: boolean;
  validateUrls?: boolean;
  validateImages?: boolean;
}

export interface ICacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
  compressed?: boolean;
  size?: number;
}

export interface ICacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  memoryUsage: number;
  maxSize: number;
  size: number;
}

export interface IRedirectRule {
  from: string;
  to: string;
  statusCode: number;
  permanent: boolean;
  pattern?: RegExp;
  reason?: string;
  createdAt?: Date;
}

export interface ISeoConfig {
  siteUrl: string;
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultKeywords?: string;
  defaultImage?: string;
  twitterSite?: string;
  facebookAppId?: string;
  cache: {
    ttl: number;
    maxSize: number;
  };
  sitemap: {
    changefreq: 'always' | 'never' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    priority: number;
    maxUrls: number;
    maxUrlsPerSitemap: number;
  };
}

export interface IUrlSlug {
  original: string;
  slug: string;
  type: 'product' | 'category' | 'page';
  entityId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRobotsConfig {
  userAgent: string;
  allow?: string[];
  disallow?: string[];
  crawlDelay?: number;
  sitemap?: string[];
}