/**
 * Security configuration settings for the application
 */
export const SecurityConfig = {
  // MongoDB Query Limits
  mongodb: {
    defaultQueryLimit: 100, // Default limit if none specified
    maxQueryLimit: 500, // Maximum allowed limit
    defaultPageSize: 10, // Default page size for pagination
    maxPageSize: 100, // Maximum page size for pagination
  },

  // General API Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // Reduced from 150 for better protection
    message: 'Too many requests, please try again later.',
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // Strict Rate Limiting for sensitive endpoints
  strictRateLimit: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 20, // Very limited for sensitive operations
    message: 'Rate limit exceeded for sensitive operation.',
  },

  // Authentication Rate Limiting
  authRateLimit: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 5, // Max failed attempts
    message: 'Too many failed login attempts, please try again after an hour.',
    skipSuccessfulRequests: true, // Only count failed attempts
  },

  // File Upload Rate Limiting
  uploadRateLimit: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxUploads: 50, // Max file uploads per hour
    message: 'Upload limit exceeded, please try again later.',
  },

  // CSRF Protection
  csrf: {
    cookieName: 'csrf_token',
    headerName: 'x-csrf-token',
    cookieMaxAge: 24 * 60 * 60 * 1000, // 24 hours
    exemptPaths: [
      '/auth/login',
      '/auth/signup',
      '/auth/google-login',
      '/order/webhook',
    ],
  },

  // Content Security Policy
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'http://localhost:*', 'http://127.0.0.1:*'], // Allow local development
      styleSrc: ["'self'", "'unsafe-inline'", 'http://localhost:*', 'http://127.0.0.1:*'], // Allow local development
      imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:*', 'http://127.0.0.1:*'],
      connectSrc: ["'self'", 'https:', 'http://localhost:*', 'http://127.0.0.1:*'], // Allow local API calls
      fontSrc: ["'self'", 'https:', 'data:', 'http://localhost:*', 'http://127.0.0.1:*'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", 'blob:'],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined, // Only in production
      blockAllMixedContent: process.env.NODE_ENV === 'production' ? [] : undefined, // Only in production
    },
  },

  // HSTS Settings
  hsts: {
    maxAge: 15552000, // 180 days in seconds
    includeSubDomains: true,
    preload: true,
  },
};
