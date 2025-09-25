// Product Controller Constants
export const PRODUCT_CONSTANTS = {
  // File Upload Configuration
  MAX_FILES: 10,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  
  // API Configuration
  API_VERSION: '1',
  BASE_PATH: 'products',
  
  // Pagination Defaults
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  
  // Cache Configuration
  CACHE_TTL: 300, // 5 minutes
  
  // Validation Messages
  VALIDATION_MESSAGES: {
    PRODUCT_NOT_FOUND: 'Product not found',
    INVALID_PRODUCT_ID: 'Invalid product ID format',
    HANDLE_ALREADY_EXISTS: 'Product handle already exists',
    IMAGES_REQUIRED: 'At least one image is required',
    TOO_MANY_FILES: `Maximum ${10} files allowed`,
    INVALID_FILE_TYPE: 'Only JPEG, PNG, and WebP images are allowed',
    FILE_TOO_LARGE: `File size must be less than ${5}MB`,
  },
  
  // Success Messages
  SUCCESS_MESSAGES: {
    PRODUCT_CREATED: 'Product created successfully',
    PRODUCT_UPDATED: 'Product updated successfully',
    PRODUCT_DELETED: 'Product deleted successfully',
    PRODUCTS_RETRIEVED: 'Products retrieved successfully',
    PRODUCT_RETRIEVED: 'Product retrieved successfully',
  },
  
  // Roles
  ROLES: {
    ADMIN: 'admin',
    MODERATOR: 'moderator',
  },
} as const;

// Type definitions for better type safety
export type ProductRole = typeof PRODUCT_CONSTANTS.ROLES[keyof typeof PRODUCT_CONSTANTS.ROLES];
export type ValidationMessage = typeof PRODUCT_CONSTANTS.VALIDATION_MESSAGES[keyof typeof PRODUCT_CONSTANTS.VALIDATION_MESSAGES];
export type SuccessMessage = typeof PRODUCT_CONSTANTS.SUCCESS_MESSAGES[keyof typeof PRODUCT_CONSTANTS.SUCCESS_MESSAGES];