import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { SecurityConfig } from '../config/security.config';

@Injectable()
export class HelmetMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Apply Helmet with a comprehensive security configuration
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: SecurityConfig.csp.directives as any,
        reportOnly: false,
      },
      // Cross-Origin options - relaxed for frontend integration
      crossOriginEmbedderPolicy: false, // Disabled for frontend integration
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Allow popups for auth
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin for frontend

      // Browser features and security
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: SecurityConfig.hsts,
      noSniff: true, // X-Content-Type-Options
      originAgentCluster: true,
      dnsPrefetchControl: { allow: false },

      // Framing controls - relaxed for development
      frameguard: process.env.NODE_ENV === 'production' ? { action: 'deny' } : false,

      // Additional protections
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
      xssFilter: true, // X-XSS-Protection

      // Disable features
      ieNoOpen: true,
    })(req, res, next);
  }
}
