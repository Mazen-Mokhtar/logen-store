// Category Controller Constants
export const CATEGORY_CONSTANTS = {
  // File Upload Configuration
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  
  // API Configuration
  API_VERSION: '1',
  BASE_PATH: 'category',
  
  // Pagination Defaults
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  
  // Cache Configuration
  CACHE_TTL: 300, // 5 minutes
  
  // Validation Messages
  VALIDATION_MESSAGES: {
    CATEGORY_NOT_FOUND: 'Category not found',
    INVALID_CATEGORY_ID: 'Invalid category ID format',
    NAME_ALREADY_EXISTS: 'Category name already exists',
    IMAGE_REQUIRED: 'Category image is required',
    INVALID_FILE_TYPE: 'Only JPEG, PNG, and WebP images are allowed',
    FILE_TOO_LARGE: `File size must be less than ${5}MB`,
  },
  
  // Success Messages
  SUCCESS_MESSAGES: {
    CATEGORY_CREATED: 'Category created successfully',
    CATEGORY_UPDATED: 'Category updated successfully',
    CATEGORY_DELETED: 'Category deleted successfully',
    CATEGORIES_RETRIEVED: 'Categories retrieved successfully',
    CATEGORY_RETRIEVED: 'Category retrieved successfully',
  },
  
  // Roles
  ROLES: {
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
  },
} as const;

// Type definitions for better type safety
export type CategoryRole = typeof CATEGORY_CONSTANTS.ROLES[keyof typeof CATEGORY_CONSTANTS.ROLES];
export type CategoryValidationMessage = typeof CATEGORY_CONSTANTS.VALIDATION_MESSAGES[keyof typeof CATEGORY_CONSTANTS.VALIDATION_MESSAGES];
export type CategorySuccessMessage = typeof CATEGORY_CONSTANTS.SUCCESS_MESSAGES[keyof typeof CATEGORY_CONSTANTS.SUCCESS_MESSAGES];