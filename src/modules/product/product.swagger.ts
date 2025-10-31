import { ApiResponseOptions } from '@nestjs/swagger';
import { ApiResponseDto, ErrorResponseDto } from '../../common/dto/common-response.dto';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

// Product Properties Schema
const productProperties = {
  handle: { type: 'string', description: 'Product handle/slug' },
  title: {
    type: 'object',
    properties: {
      en: { type: 'string', description: 'English title' },
      ar: { type: 'string', description: 'Arabic title' },
    },
  },
  description: {
    type: 'object',
    properties: {
      en: { type: 'string', description: 'English description' },
      ar: { type: 'string', description: 'Arabic description' },
    },
  },
  price: { type: 'number', description: 'Product price' },
  currency: { 
    type: 'string', 
    description: 'Product currency',
    enum: ['USD', 'EUR', 'EGP', 'SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD'],
    default: 'USD'
  },
  category: { type: 'string', description: 'Category ID' },
  tags: { type: 'array', items: { type: 'string' } },
  inStock: { type: 'boolean', description: 'Stock availability' },
  promotion: {
    type: 'object',
    properties: {
      isOnSale: { type: 'boolean' },
      originalPrice: { type: 'number' },
      salePrice: { type: 'number' },
      saleEndDate: { type: 'string', format: 'date-time' },
    },
  },
  sizes: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        available: { type: 'boolean' },
      },
    },
  },
  colors: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        hex: { type: 'string' },
        available: { type: 'boolean' },
      },
    },
  },
  images: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        secure_url: { type: 'string' },
        public_id: { type: 'string' },
      },
    },
  },
  warranty: {
    type: 'object',
    properties: {
      hasWarranty: { type: 'boolean', description: 'Whether product has warranty' },
      warrantyPeriod: { type: 'number', description: 'Warranty period in months' },
      warrantyType: { 
        type: 'string', 
        enum: ['manufacturer', 'seller', 'extended'],
        description: 'Type of warranty'
      },
      warrantyDescription: {
        type: 'object',
        properties: {
          en: { type: 'string', description: 'English warranty description' },
          ar: { type: 'string', description: 'Arabic warranty description' },
        },
      },
    },
  },
  createdBy: { type: 'string', description: 'Creator ID' },
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
};

// Common Swagger Schemas
export const ProductSwaggerSchemas = {
  // Product Schema Properties
  productProperties,

  // Create Product Body Schema
  createProductBody: {
    description: 'Product creation data with images',
    schema: {
      type: 'object',
      properties: {
        ...productProperties,
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Product images (max 10 files)',
        },
      },
      required: ['handle', 'title', 'description', 'price', 'currency', 'category', 'images'],
    },
  },

  // Update Product Body Schema
  updateProductBody: {
    description: 'Product update data with optional images',
    schema: {
      type: 'object',
      properties: {
        title: productProperties.title,
        description: productProperties.description,
        price: productProperties.price,
        currency: productProperties.currency,
        category: productProperties.category,
        tags: productProperties.tags,
        inStock: productProperties.inStock,
        promotion: productProperties.promotion,
        sizes: productProperties.sizes,
        colors: productProperties.colors,
        warranty: productProperties.warranty,
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'New product images (optional, max 10 files)',
        },
      },
    },
  },

  // Response Examples
  productExample: {
    _id: 'product_id',
    handle: 'product-handle',
    title: { en: 'Product Title', ar: 'عنوان المنتج' },
    description: { en: 'Product Description', ar: 'وصف المنتج' },
    price: 99.99,
    currency: 'USD',
    images: [{ secure_url: 'image_url', public_id: 'image_id' }],
    category: { _id: 'category_id', name: 'Category Name' },
    inStock: true,
    warranty: {
      hasWarranty: true,
      warrantyPeriod: 12,
      warrantyType: 'manufacturer',
      warrantyDescription: {
        en: '1 year manufacturer warranty',
        ar: 'ضمان الشركة المصنعة لمدة سنة واحدة'
      }
    },
    createdAt: '2024-01-15T10:30:00.000Z',
  },

  productWithCreatorExample: {
    _id: 'product_id',
    handle: 'product-handle',
    title: { en: 'Product Title', ar: 'عنوان المنتج' },
    description: { en: 'Product Description', ar: 'وصف المنتج' },
    price: 99.99,
    currency: 'USD',
    images: [{ secure_url: 'image_url', public_id: 'image_id' }],
    category: { _id: 'category_id', name: 'Category Name' },
    createdBy: { _id: 'user_id', userName: 'admin' },
    inStock: true,
    warranty: {
      hasWarranty: true,
      warrantyPeriod: 24,
      warrantyType: 'extended',
      warrantyDescription: {
        en: '2 years extended warranty',
        ar: 'ضمان ممتد لمدة سنتين'
      }
    },
    createdAt: '2024-01-15T10:30:00.000Z',
  },
};

// Common API Responses
export const ProductApiResponses = {
  // Success Responses
  created: {
    status: 201,
    description: 'Product created successfully',
    type: ApiResponseDto,
  } as ApiResponseOptions,

  updated: {
    status: 200,
    description: 'Product updated successfully',
    type: ApiResponseDto,
  } as ApiResponseOptions,

  deleted: {
    status: 200,
    description: 'Product deleted successfully',
    type: ApiResponseDto,
  } as ApiResponseOptions,

  singleProduct: {
    status: 200,
    description: 'Product retrieved successfully',
    schema: {
      example: {
        success: true,
        data: ProductSwaggerSchemas.productWithCreatorExample,
      },
    },
  } as ApiResponseOptions,

  allProducts: {
    status: 200,
    description: 'Products retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [ProductSwaggerSchemas.productExample],
        pagination: {
          total: 100,
          page: 1,
          limit: 20,
          totalPages: 5,
        },
      },
    },
  } as ApiResponseOptions,

  // Error Responses
  badRequest: {
    status: 400,
    description: 'Bad Request - Invalid input data',
    type: ErrorResponseDto,
  } as ApiResponseOptions,

  badRequestWithImages: {
    status: 400,
    description: 'Bad Request - Invalid input data or missing images',
    type: ErrorResponseDto,
  } as ApiResponseOptions,

  unauthorized: {
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    type: ErrorResponseDto,
  } as ApiResponseOptions,

  forbidden: {
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponseDto,
  } as ApiResponseOptions,

  notFound: {
    status: 404,
    description: 'Not Found - Product not found',
    type: ErrorResponseDto,
  } as ApiResponseOptions,

  conflict: {
    status: 409,
    description: 'Conflict - Product handle already exists',
    type: ErrorResponseDto,
  } as ApiResponseOptions,
};

// Query Parameters
export const ProductQueryParams = {
  search: {
    name: 'search',
    required: false,
    description: 'Search term for product title or tags',
    type: 'string',
  },
  category: {
    name: 'category',
    required: false,
    description: 'Filter by category ID',
    type: 'string',
  },
  inStock: {
    name: 'inStock',
    required: false,
    description: 'Filter by stock availability',
    type: 'boolean',
  },
  page: {
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    type: 'number',
    example: 1,
  },
  limit: {
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    type: 'number',
    example: 20,
  },
  sort: {
    name: 'sort',
    required: false,
    description: 'Sort criteria (e.g., createdAt, price)',
    type: 'string',
    example: 'createdAt',
  },
};

// Path Parameters
export const ProductPathParams = {
  productId: {
    name: 'productId',
    description: 'Product ID',
    type: 'string',
  },
  handle: {
    name: 'handle',
    description: 'Product handle/slug',
    type: 'string',
  },
};