import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IStructuredData,
  IProductStructuredData,
  ICategoryStructuredData,
  IOrganizationStructuredData,
  IWebsiteStructuredData,
  IBreadcrumbStructuredData,
  IArticleStructuredData,
  IEventStructuredData,
  IRecipeStructuredData,
  IJobPostingStructuredData,
  IVideoStructuredData,
  IHowToStructuredData,
  IValidationResult,
  ISchemaValidationOptions,
} from './interfaces/seo.interface';

@Injectable()
export class StructuredDataService {
  private readonly logger = new Logger(StructuredDataService.name);
  private readonly baseContext = 'https://schema.org';

  constructor(private configService: ConfigService) {}

  /**
   * Generate product structured data
   */
  generateProductStructuredData(product: {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    availability: 'InStock' | 'OutOfStock' | 'PreOrder';
    brand?: string;
    sku?: string;
    gtin?: string;
    images?: string[];
    rating?: {
      value: number;
      count: number;
      bestRating?: number;
      worstRating?: number;
    };
    category?: string;
    url?: string;
  }): IProductStructuredData {
    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');
    
    const structuredData: IProductStructuredData = {
      '@context': this.baseContext,
      '@type': 'Product',
      name: product.name,
      description: product.description,
      sku: product.sku,
      gtin: product.gtin,
    };

    // Add images
    if (product.images && product.images.length > 0) {
      structuredData.image = product.images.map(img => 
        img.startsWith('http') ? img : `${baseUrl}${img}`
      );
    }

    // Add brand
    if (product.brand) {
      structuredData.brand = {
        '@type': 'Brand',
        name: product.brand,
      };
    }

    // Add offers
    structuredData.offers = {
      '@type': 'Offer',
      price: product.price.toString(),
      priceCurrency: product.currency,
      availability: `https://schema.org/${product.availability}`,
      url: product.url || `${baseUrl}/product/${product.id}`,
    };

    // Add aggregate rating
    if (product.rating && product.rating.count > 0) {
      structuredData.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: product.rating.value,
        reviewCount: product.rating.count,
        bestRating: product.rating.bestRating || 5,
        worstRating: product.rating.worstRating || 1,
      };
    }

    // Add category
    if (product.category) {
      structuredData['category'] = product.category;
    }

    this.logger.debug(`Generated product structured data for: ${product.name}`);
    return structuredData;
  }

  /**
   * Generate category structured data
   */
  generateCategoryStructuredData(category: {
    name: string;
    description?: string;
    products: Array<{
      id: string;
      name: string;
      url: string;
      image?: string;
    }>;
  }): ICategoryStructuredData {
    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');

    const structuredData: ICategoryStructuredData = {
      '@context': this.baseContext,
      '@type': 'ItemList',
      name: category.name,
      description: category.description,
      numberOfItems: category.products.length,
      itemListElement: category.products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: product.name,
          url: product.url.startsWith('http') ? product.url : `${baseUrl}${product.url}`,
          image: product.image ? (
            product.image.startsWith('http') ? product.image : `${baseUrl}${product.image}`
          ) : undefined,
        },
      })),
    };

    this.logger.debug(`Generated category structured data for: ${category.name}`);
    return structuredData;
  }

  /**
   * Generate organization structured data
   */
  generateOrganizationStructuredData(organization?: {
    name?: string;
    url?: string;
    logo?: string;
    description?: string;
    contactPoints?: Array<{
      telephone: string;
      contactType: string;
      availableLanguage?: string[];
    }>;
    socialProfiles?: string[];
  }): IOrganizationStructuredData {
    const siteName = this.configService.get<string>('SITE_NAME', 'My Company');
    const siteUrl = this.configService.get<string>('SITE_URL', 'https://example.com');
    const siteDescription = this.configService.get<string>('SITE_DESCRIPTION', '');
    const siteLogo = this.configService.get<string>('SITE_LOGO', '');

    const structuredData: IOrganizationStructuredData = {
      '@context': this.baseContext,
      '@type': 'Organization',
      name: organization?.name || siteName,
      url: organization?.url || siteUrl,
      description: organization?.description || siteDescription,
    };

    // Add logo
    if (organization?.logo || siteLogo) {
      const logoUrl = organization?.logo || siteLogo;
      structuredData.logo = logoUrl.startsWith('http') ? logoUrl : `${siteUrl}${logoUrl}`;
    }

    // Add contact points
    if (organization?.contactPoints && organization.contactPoints.length > 0) {
      structuredData.contactPoint = organization.contactPoints.map(contact => ({
        '@type': 'ContactPoint',
        telephone: contact.telephone,
        contactType: contact.contactType,
        availableLanguage: contact.availableLanguage,
      }));
    }

    // Add social profiles
    if (organization?.socialProfiles && organization.socialProfiles.length > 0) {
      structuredData.sameAs = organization.socialProfiles;
    }

    this.logger.debug('Generated organization structured data');
    return structuredData;
  }

  /**
   * Generate website structured data
   */
  generateWebsiteStructuredData(website?: {
    name?: string;
    url?: string;
    description?: string;
    searchAction?: {
      target: string;
      queryInput: string;
    };
  }): IWebsiteStructuredData {
    const siteName = this.configService.get<string>('SITE_NAME', 'My Website');
    const siteUrl = this.configService.get<string>('SITE_URL', 'https://example.com');
    const siteDescription = this.configService.get<string>('SITE_DESCRIPTION', '');

    const structuredData: IWebsiteStructuredData = {
      '@context': this.baseContext,
      '@type': 'WebSite',
      name: website?.name || siteName,
      url: website?.url || siteUrl,
      description: website?.description || siteDescription,
    };

    // Add search action
    if (website?.searchAction) {
      structuredData.potentialAction = {
        '@type': 'SearchAction',
        target: website.searchAction.target,
        'query-input': website.searchAction.queryInput,
      };
    } else {
      // Default search action
      structuredData.potentialAction = {
        '@type': 'SearchAction',
        target: `${siteUrl}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      };
    }

    this.logger.debug('Generated website structured data');
    return structuredData;
  }

  /**
   * Generate breadcrumb structured data
   */
  generateBreadcrumbStructuredData(breadcrumbs: Array<{
    name: string;
    url?: string;
  }>): IBreadcrumbStructuredData {
    const structuredData: IBreadcrumbStructuredData = {
      '@context': this.baseContext,
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((breadcrumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: breadcrumb.name,
        item: breadcrumb.url,
      })),
    };

    this.logger.debug(`Generated breadcrumb structured data with ${breadcrumbs.length} items`);
    return structuredData;
  }

  /**
   * Generate FAQ structured data
   */
  generateFAQStructuredData(faqs: Array<{
    question: string;
    answer: string;
  }>): IStructuredData {
    const structuredData: IStructuredData = {
      '@context': this.baseContext,
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };

    this.logger.debug(`Generated FAQ structured data with ${faqs.length} questions`);
    return structuredData;
  }

  /**
   * Generate review structured data
   */
  generateReviewStructuredData(review: {
    itemName: string;
    reviewBody: string;
    rating: number;
    author: string;
    datePublished: string;
    bestRating?: number;
    worstRating?: number;
  }): IStructuredData {
    const structuredData: IStructuredData = {
      '@context': this.baseContext,
      '@type': 'Review',
      itemReviewed: {
        '@type': 'Product',
        name: review.itemName,
      },
      reviewBody: review.reviewBody,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: review.bestRating || 5,
        worstRating: review.worstRating || 1,
      },
      author: {
        '@type': 'Person',
        name: review.author,
      },
      datePublished: review.datePublished,
    };

    this.logger.debug(`Generated review structured data for: ${review.itemName}`);
    return structuredData;
  }

  /**
   * Generate local business structured data
   */
  generateLocalBusinessStructuredData(business: {
    name: string;
    address: {
      streetAddress: string;
      addressLocality: string;
      addressRegion: string;
      postalCode: string;
      addressCountry: string;
    };
    telephone?: string;
    url?: string;
    openingHours?: string[];
    priceRange?: string;
    geo?: {
      latitude: number;
      longitude: number;
    };
  }): IStructuredData {
    const siteUrl = this.configService.get<string>('SITE_URL', 'https://example.com');

    const structuredData: IStructuredData = {
      '@context': this.baseContext,
      '@type': 'LocalBusiness',
      name: business.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: business.address.streetAddress,
        addressLocality: business.address.addressLocality,
        addressRegion: business.address.addressRegion,
        postalCode: business.address.postalCode,
        addressCountry: business.address.addressCountry,
      },
      telephone: business.telephone,
      url: business.url || siteUrl,
    };

    // Add opening hours
    if (business.openingHours && business.openingHours.length > 0) {
      structuredData.openingHours = business.openingHours;
    }

    // Add price range
    if (business.priceRange) {
      structuredData.priceRange = business.priceRange;
    }

    // Add geo coordinates
    if (business.geo) {
      structuredData.geo = {
        '@type': 'GeoCoordinates',
        latitude: business.geo.latitude,
        longitude: business.geo.longitude,
      };
    }

    this.logger.debug(`Generated local business structured data for: ${business.name}`);
    return structuredData;
  }

  /**
   * Generate article structured data
   */
  generateArticleStructuredData(article: {
    type?: 'Article' | 'NewsArticle' | 'BlogPosting';
    headline: string;
    author: {
      type?: 'Person' | 'Organization';
      name: string;
      url?: string;
    };
    datePublished: string;
    dateModified?: string;
    image?: string | string[];
    publisher: {
      name: string;
      logo?: {
        url: string;
        width?: number;
        height?: number;
      };
    };
    mainEntityOfPage?: string;
    wordCount?: number;
    articleSection?: string;
    keywords?: string[];
    description?: string;
  }): IArticleStructuredData {
    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');

    const structuredData: IArticleStructuredData = {
      '@context': this.baseContext,
      '@type': article.type || 'Article',
      headline: article.headline,
      author: {
        '@type': article.author.type || 'Person',
        name: article.author.name,
        url: article.author.url,
      },
      datePublished: article.datePublished,
      dateModified: article.dateModified || article.datePublished,
      publisher: {
        '@type': 'Organization',
        name: article.publisher.name,
      },
      mainEntityOfPage: article.mainEntityOfPage || baseUrl,
    };

    // Add images
    if (article.image) {
      if (Array.isArray(article.image)) {
        structuredData.image = article.image.map(img => 
          img.startsWith('http') ? img : `${baseUrl}${img}`
        );
      } else {
        structuredData.image = article.image.startsWith('http') ? article.image : `${baseUrl}${article.image}`;
      }
    }

    // Add publisher logo
    if (article.publisher.logo) {
      structuredData.publisher.logo = {
        '@type': 'ImageObject',
        url: article.publisher.logo.url.startsWith('http') ? 
          article.publisher.logo.url : `${baseUrl}${article.publisher.logo.url}`,
        width: article.publisher.logo.width,
        height: article.publisher.logo.height,
      };
    }

    // Add optional fields
    if (article.wordCount) structuredData.wordCount = article.wordCount;
    if (article.articleSection) structuredData.articleSection = article.articleSection;
    if (article.keywords) structuredData.keywords = article.keywords;

    this.logger.debug(`Generated article structured data for: ${article.headline}`);
    return structuredData;
  }

  /**
   * Generate event structured data
   */
  generateEventStructuredData(event: {
    name: string;
    startDate: string;
    endDate?: string;
    location: {
      name: string;
      address?: {
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
      type?: 'Organization' | 'Person';
      name: string;
      url?: string;
    };
    offers?: {
      price?: string;
      priceCurrency?: string;
      availability?: string;
      url?: string;
    };
  }): IEventStructuredData {
    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');

    const structuredData: IEventStructuredData = {
      '@context': this.baseContext,
      '@type': 'Event',
      name: event.name,
      startDate: event.startDate,
      location: {
        '@type': 'Place',
        name: event.location.name,
      },
    };

    // Add optional fields
    if (event.endDate) structuredData.endDate = event.endDate;
    if (event.description) structuredData.description = event.description;

    // Add location address
    if (event.location.address) {
      structuredData.location.address = {
        '@type': 'PostalAddress',
        ...event.location.address,
      };
    }

    // Add images
    if (event.image) {
      if (Array.isArray(event.image)) {
        structuredData.image = event.image.map(img => 
          img.startsWith('http') ? img : `${baseUrl}${img}`
        );
      } else {
        structuredData.image = event.image.startsWith('http') ? event.image : `${baseUrl}${event.image}`;
      }
    }

    // Add organizer
    if (event.organizer) {
      structuredData.organizer = {
        '@type': event.organizer.type || 'Organization',
        name: event.organizer.name,
        url: event.organizer.url,
      };
    }

    // Add offers
    if (event.offers) {
      structuredData.offers = {
        '@type': 'Offer',
        ...event.offers,
      };
    }

    this.logger.debug(`Generated event structured data for: ${event.name}`);
    return structuredData;
  }

  /**
   * Generate recipe structured data
   */
  generateRecipeStructuredData(recipe: {
    name: string;
    description?: string;
    image?: string | string[];
    author?: {
      type?: 'Person' | 'Organization';
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
      text: string;
      name?: string;
      url?: string;
      image?: string;
    }>;
    nutrition?: {
      calories?: string;
      fatContent?: string;
      carbohydrateContent?: string;
      proteinContent?: string;
    };
    aggregateRating?: {
      ratingValue: number;
      reviewCount: number;
      bestRating?: number;
      worstRating?: number;
    };
  }): IRecipeStructuredData {
    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');

    const structuredData: IRecipeStructuredData = {
      '@context': this.baseContext,
      '@type': 'Recipe',
      name: recipe.name,
    };

    // Add optional fields
    if (recipe.description) structuredData.description = recipe.description;
    if (recipe.datePublished) structuredData.datePublished = recipe.datePublished;
    if (recipe.prepTime) structuredData.prepTime = recipe.prepTime;
    if (recipe.cookTime) structuredData.cookTime = recipe.cookTime;
    if (recipe.totalTime) structuredData.totalTime = recipe.totalTime;
    if (recipe.recipeYield) structuredData.recipeYield = recipe.recipeYield;
    if (recipe.recipeCategory) structuredData.recipeCategory = recipe.recipeCategory;
    if (recipe.recipeCuisine) structuredData.recipeCuisine = recipe.recipeCuisine;
    if (recipe.recipeIngredient) structuredData.recipeIngredient = recipe.recipeIngredient;

    // Add images
    if (recipe.image) {
      if (Array.isArray(recipe.image)) {
        structuredData.image = recipe.image.map(img => 
          img.startsWith('http') ? img : `${baseUrl}${img}`
        );
      } else {
        structuredData.image = recipe.image.startsWith('http') ? recipe.image : `${baseUrl}${recipe.image}`;
      }
    }

    // Add author
    if (recipe.author) {
      structuredData.author = {
        '@type': recipe.author.type || 'Person',
        name: recipe.author.name,
      };
    }

    // Add recipe instructions
    if (recipe.recipeInstructions) {
      structuredData.recipeInstructions = recipe.recipeInstructions.map(instruction => ({
        '@type': 'HowToStep',
        text: instruction.text,
        name: instruction.name,
        url: instruction.url,
        image: instruction.image ? (
          instruction.image.startsWith('http') ? instruction.image : `${baseUrl}${instruction.image}`
        ) : undefined,
      }));
    }

    // Add nutrition information
    if (recipe.nutrition) {
      structuredData.nutrition = {
        '@type': 'NutritionInformation',
        ...recipe.nutrition,
      };
    }

    // Add aggregate rating
    if (recipe.aggregateRating) {
      structuredData.aggregateRating = {
        '@type': 'AggregateRating',
        ...recipe.aggregateRating,
      };
    }

    this.logger.debug(`Generated recipe structured data for: ${recipe.name}`);
    return structuredData;
  }

  /**
   * Generate job posting structured data
   */
  generateJobPostingStructuredData(job: {
    title: string;
    description: string;
    datePosted: string;
    validThrough?: string;
    employmentType?: string;
    hiringOrganization: {
      name: string;
      sameAs?: string;
      logo?: string;
    };
    jobLocation: {
      address: {
        streetAddress?: string;
        addressLocality?: string;
        addressRegion?: string;
        postalCode?: string;
        addressCountry?: string;
      };
    };
    baseSalary?: {
      currency: string;
      value: number;
      unitText: string;
    };
    qualifications?: string;
    responsibilities?: string;
    skills?: string;
  }): IJobPostingStructuredData {
    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');

    const structuredData: IJobPostingStructuredData = {
      '@context': this.baseContext,
      '@type': 'JobPosting',
      title: job.title,
      description: job.description,
      datePosted: job.datePosted,
      hiringOrganization: {
        '@type': 'Organization',
        name: job.hiringOrganization.name,
        sameAs: job.hiringOrganization.sameAs,
        logo: job.hiringOrganization.logo ? (
          job.hiringOrganization.logo.startsWith('http') ? 
            job.hiringOrganization.logo : `${baseUrl}${job.hiringOrganization.logo}`
        ) : undefined,
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          ...job.jobLocation.address,
        },
      },
    };

    // Add optional fields
    if (job.validThrough) structuredData.validThrough = job.validThrough;
    if (job.employmentType) structuredData.employmentType = job.employmentType;
    if (job.qualifications) structuredData.qualifications = job.qualifications;
    if (job.responsibilities) structuredData.responsibilities = job.responsibilities;
    if (job.skills) structuredData.skills = job.skills;

    // Add base salary
    if (job.baseSalary) {
      structuredData.baseSalary = {
        '@type': 'MonetaryAmount',
        currency: job.baseSalary.currency,
        value: {
          '@type': 'QuantitativeValue',
          value: job.baseSalary.value,
          unitText: job.baseSalary.unitText,
        },
      };
    }

    this.logger.debug(`Generated job posting structured data for: ${job.title}`);
    return structuredData;
  }

  /**
   * Generate video structured data
   */
  generateVideoStructuredData(video: {
    name: string;
    description: string;
    thumbnailUrl: string | string[];
    uploadDate: string;
    duration?: string;
    contentUrl?: string;
    embedUrl?: string;
    interactionStatistic?: {
      interactionType: string;
      userInteractionCount: number;
    };
    publisher?: {
      name: string;
      logo?: string;
    };
  }): IVideoStructuredData {
    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');

    const structuredData: IVideoStructuredData = {
      '@context': this.baseContext,
      '@type': 'VideoObject',
      name: video.name,
      description: video.description,
      uploadDate: video.uploadDate,
      thumbnailUrl: Array.isArray(video.thumbnailUrl) ? 
        video.thumbnailUrl.map(url => url.startsWith('http') ? url : `${baseUrl}${url}`) :
        (video.thumbnailUrl.startsWith('http') ? video.thumbnailUrl : `${baseUrl}${video.thumbnailUrl}`),
    };

    // Add optional fields
    if (video.duration) structuredData.duration = video.duration;
    if (video.contentUrl) structuredData.contentUrl = video.contentUrl;
    if (video.embedUrl) structuredData.embedUrl = video.embedUrl;

    // Add interaction statistics
    if (video.interactionStatistic) {
      structuredData.interactionStatistic = {
        '@type': 'InteractionCounter',
        ...video.interactionStatistic,
      };
    }

    // Add publisher
    if (video.publisher) {
      structuredData.publisher = {
        '@type': 'Organization',
        name: video.publisher.name,
      };

      if (video.publisher.logo) {
        structuredData.publisher.logo = {
          '@type': 'ImageObject',
          url: video.publisher.logo.startsWith('http') ? 
            video.publisher.logo : `${baseUrl}${video.publisher.logo}`,
        };
      }
    }

    this.logger.debug(`Generated video structured data for: ${video.name}`);
    return structuredData;
  }

  /**
   * Generate how-to structured data
   */
  generateHowToStructuredData(howTo: {
    name: string;
    description?: string;
    image?: string | string[];
    totalTime?: string;
    estimatedCost?: {
      currency: string;
      value: string;
    };
    supply?: Array<{
      name: string;
    }>;
    tool?: Array<{
      name: string;
    }>;
    step: Array<{
      name?: string;
      text: string;
      url?: string;
      image?: string;
    }>;
  }): IHowToStructuredData {
    const baseUrl = this.configService.get<string>('SITE_URL', 'https://example.com');

    const structuredData: IHowToStructuredData = {
      '@context': this.baseContext,
      '@type': 'HowTo',
      name: howTo.name,
      step: howTo.step.map(step => ({
        '@type': 'HowToStep',
        name: step.name,
        text: step.text,
        url: step.url,
        image: step.image ? (
          step.image.startsWith('http') ? step.image : `${baseUrl}${step.image}`
        ) : undefined,
      })),
    };

    // Add optional fields
    if (howTo.description) structuredData.description = howTo.description;
    if (howTo.totalTime) structuredData.totalTime = howTo.totalTime;

    // Add images
    if (howTo.image) {
      if (Array.isArray(howTo.image)) {
        structuredData.image = howTo.image.map(img => 
          img.startsWith('http') ? img : `${baseUrl}${img}`
        );
      } else {
        structuredData.image = howTo.image.startsWith('http') ? howTo.image : `${baseUrl}${howTo.image}`;
      }
    }

    // Add estimated cost
    if (howTo.estimatedCost) {
      structuredData.estimatedCost = {
        '@type': 'MonetaryAmount',
        ...howTo.estimatedCost,
      };
    }

    // Add supplies
    if (howTo.supply) {
      structuredData.supply = howTo.supply.map(supply => ({
        '@type': 'HowToSupply',
        name: supply.name,
      }));
    }

    // Add tools
    if (howTo.tool) {
      structuredData.tool = howTo.tool.map(tool => ({
        '@type': 'HowToTool',
        name: tool.name,
      }));
    }

    this.logger.debug(`Generated how-to structured data for: ${howTo.name}`);
    return structuredData;
  }

  /**
   * Enhanced validation with comprehensive checks
   */
  validateStructuredDataEnhanced(
    data: IStructuredData, 
    options: ISchemaValidationOptions = {}
  ): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    const {
      strict = false,
      checkRecommended = true,
      validateUrls = true,
      validateImages = true,
    } = options;

    // Basic validation
    if (!data['@context']) {
      errors.push('Missing @context property');
      score -= 20;
    } else if (data['@context'] !== this.baseContext) {
      warnings.push(`@context should be ${this.baseContext}`);
      score -= 5;
    }

    if (!data['@type']) {
      errors.push('Missing @type property');
      score -= 20;
    }

    // Type-specific validation
    this.validateByType(data, errors, warnings, suggestions, checkRecommended);

    // URL validation
    if (validateUrls) {
      this.validateUrls(data, errors, warnings);
    }

    // Image validation
    if (validateImages) {
      this.validateImages(data, warnings, suggestions);
    }

    // Calculate final score
    score -= errors.length * 10;
    score -= warnings.length * 3;
    score = Math.max(0, Math.min(100, score));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score,
    };
  }

  private validateByType(
    data: IStructuredData,
    errors: string[],
    warnings: string[],
    suggestions: string[],
    checkRecommended: boolean
  ): void {
    switch (data['@type']) {
      case 'Product':
        if (!data['name']) errors.push('Product name is required');
        if (!data['description'] && checkRecommended) {
          warnings.push('Product description is recommended');
        }
        if (!data['image'] && checkRecommended) {
          suggestions.push('Add product images for better visibility');
        }
        if (!data['offers']) {
          errors.push('Product offers are required');
        }
        break;

      case 'Article':
      case 'NewsArticle':
      case 'BlogPosting':
        if (!data['headline']) errors.push('Article headline is required');
        if (!data['author']) errors.push('Article author is required');
        if (!data['datePublished']) errors.push('Article datePublished is required');
        if (!data['publisher']) errors.push('Article publisher is required');
        if (!data['image'] && checkRecommended) {
          warnings.push('Article image is recommended');
        }
        break;

      case 'Event':
        if (!data['name']) errors.push('Event name is required');
        if (!data['startDate']) errors.push('Event startDate is required');
        if (!data['location']) errors.push('Event location is required');
        break;

      case 'Recipe':
        if (!data['name']) errors.push('Recipe name is required');
        if (!data['recipeIngredient'] && checkRecommended) {
          warnings.push('Recipe ingredients are recommended');
        }
        if (!data['recipeInstructions'] && checkRecommended) {
          warnings.push('Recipe instructions are recommended');
        }
        break;

      case 'Organization':
        if (!data['name']) errors.push('Organization name is required');
        if (!data['url']) errors.push('Organization URL is required');
        break;

      case 'WebSite':
        if (!data['name']) errors.push('Website name is required');
        if (!data['url']) errors.push('Website URL is required');
        break;

      case 'JobPosting':
        if (!data['title']) errors.push('Job title is required');
        if (!data['description']) errors.push('Job description is required');
        if (!data['hiringOrganization']) errors.push('Hiring organization is required');
        if (!data['jobLocation']) errors.push('Job location is required');
        break;
    }
  }

  private validateUrls(data: IStructuredData, errors: string[], warnings: string[]): void {
    const urlFields = ['url', 'sameAs', 'mainEntityOfPage'];
    
    urlFields.forEach(field => {
      const value = data[field];
      if (value) {
        if (Array.isArray(value)) {
          value.forEach(url => {
            if (!this.isValidUrl(url)) {
              errors.push(`Invalid URL in ${field}: ${url}`);
            }
          });
        } else if (!this.isValidUrl(value)) {
          errors.push(`Invalid URL in ${field}: ${value}`);
        }
      }
    });
  }

  private validateImages(data: IStructuredData, warnings: string[], suggestions: string[]): void {
    const imageFields = ['image', 'logo', 'thumbnailUrl'];
    
    imageFields.forEach(field => {
      const value = data[field];
      if (value) {
        if (Array.isArray(value)) {
          value.forEach(url => {
            if (!this.isValidImageUrl(url)) {
              warnings.push(`Image URL may not be valid: ${url}`);
            }
          });
          if (value.length === 1) {
            suggestions.push(`Consider adding multiple images for ${field}`);
          }
        } else if (!this.isValidImageUrl(value)) {
          warnings.push(`Image URL may not be valid: ${value}`);
        }
      }
    });
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidImageUrl(url: string): boolean {
    if (!this.isValidUrl(url)) return false;
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const urlLower = url.toLowerCase();
    
    return imageExtensions.some(ext => urlLower.includes(ext)) || 
           urlLower.includes('image') || 
           urlLower.includes('photo') ||
           urlLower.includes('picture');
  }

  /**
   * Generate schema.org compliant structured data with validation
   */
  generateValidatedStructuredData(
    type: string,
    data: any,
    options: ISchemaValidationOptions = {}
  ): { structuredData: IStructuredData; validation: IValidationResult } {
    let structuredData: IStructuredData;

    // Generate structured data based on type
    switch (type.toLowerCase()) {
      case 'product':
        structuredData = this.generateProductStructuredData(data);
        break;
      case 'article':
      case 'newsarticle':
      case 'blogposting':
        structuredData = this.generateArticleStructuredData({ ...data, type });
        break;
      case 'event':
        structuredData = this.generateEventStructuredData(data);
        break;
      case 'recipe':
        structuredData = this.generateRecipeStructuredData(data);
        break;
      case 'jobposting':
        structuredData = this.generateJobPostingStructuredData(data);
        break;
      case 'video':
      case 'videoobject':
        structuredData = this.generateVideoStructuredData(data);
        break;
      case 'howto':
        structuredData = this.generateHowToStructuredData(data);
        break;
      case 'organization':
        structuredData = this.generateOrganizationStructuredData(data);
        break;
      case 'website':
        structuredData = this.generateWebsiteStructuredData(data);
        break;
      case 'breadcrumb':
      case 'breadcrumblist':
        structuredData = this.generateBreadcrumbStructuredData(data);
        break;
      case 'faq':
      case 'faqpage':
        structuredData = this.generateFAQStructuredData(data);
        break;
      case 'review':
        structuredData = this.generateReviewStructuredData(data);
        break;
      case 'localbusiness':
        structuredData = this.generateLocalBusinessStructuredData(data);
        break;
      default:
        throw new Error(`Unsupported structured data type: ${type}`);
    }

    // Validate the generated structured data
    const validation = this.validateStructuredDataEnhanced(structuredData, options);

    this.logger.debug(`Generated and validated ${type} structured data with score: ${validation.score}`);

    return { structuredData, validation };
  }

  /**
   * Convert structured data to JSON-LD string
   */
  toJsonLd(data: IStructuredData): string {
    try {
      return JSON.stringify(data, null, 0);
    } catch (error) {
      this.logger.error('Failed to serialize structured data to JSON-LD', error);
      return '{}';
    }
  }

  /**
   * Generate multiple structured data objects
   */
  generateMultipleStructuredData(dataObjects: IStructuredData[]): string {
    if (dataObjects.length === 0) {
      return '{}';
    }

    if (dataObjects.length === 1) {
      return this.toJsonLd(dataObjects[0]);
    }

    // Wrap multiple objects in an array
    return JSON.stringify(dataObjects, null, 0);
  }
}