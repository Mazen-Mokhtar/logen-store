import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class RatingSanitizationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Sanitize request body
    if (request.body) {
      request.body = this.sanitizeObject(request.body, new WeakSet());
    }

    return next.handle().pipe(
      map((data) => {
        // Sanitize response data
        return this.sanitizeObject(data, new WeakSet());
      }),
    );
  }

  private sanitizeObject(obj: any, visited: WeakSet<object> = new WeakSet()): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (obj instanceof Date) {
      return obj;
    }

    // Handle MongoDB ObjectId
    if (obj.constructor && obj.constructor.name === 'ObjectId') {
      return obj.toString();
    }

    if (Array.isArray(obj)) {
      // Check for circular reference
      if (visited.has(obj)) {
        return '[Circular Reference]';
      }
      visited.add(obj);
      const result = obj.map(item => this.sanitizeObject(item, visited));
      visited.delete(obj);
      return result;
    }

    if (typeof obj === 'object') {
      // Check for circular reference
      if (visited.has(obj)) {
        return '[Circular Reference]';
      }

      // Handle Mongoose documents specially
      if (obj._doc || obj.$__ || obj.constructor.name === 'model') {
        // This is a Mongoose document, extract only the data we need
        const plainObj = obj.toObject ? obj.toObject() : obj._doc || obj;
        return this.sanitizeObject(plainObj, visited);
      }

      visited.add(obj);
      const sanitized: any = {};
      
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // Skip Mongoose internal properties
          if (key.startsWith('$') || key.startsWith('_') && key !== '_id') {
            continue;
          }
          sanitized[key] = this.sanitizeObject(obj[key], visited);
        }
      }
      
      visited.delete(obj);
      return sanitized;
    }

    return obj;
  }

  private sanitizeString(str: string): string {
    if (typeof str !== 'string') return str;

    // Remove potentially dangerous HTML tags and scripts
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<link\b[^>]*>/gi, '')
      .replace(/<meta\b[^>]*>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
}