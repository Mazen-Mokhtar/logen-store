import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';

@ValidatorConstraint({ name: 'isValidRatingContent', async: false })
@Injectable()
export class IsValidRatingContentConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!value) return true; // Allow empty values, other validators handle required

    // Check if it's an object with en/ar properties
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const { en, ar } = value;

    // At least one language should be provided
    if (!en && !ar) {
      return false;
    }

    // Validate English content if provided
    if (en && !this.isValidContent(en)) {
      return false;
    }

    // Validate Arabic content if provided
    if (ar && !this.isValidContent(ar)) {
      return false;
    }

    return true;
  }

  private isValidContent(content: string): boolean {
    if (typeof content !== 'string') return false;
    
    // Check length (minimum 3 characters, maximum 1000)
    if (content.trim().length < 3 || content.length > 1000) {
      return false;
    }

    // Check for inappropriate content patterns
    const inappropriatePatterns = [
      /\b(spam|fake|bot|advertisement)\b/i,
      /(.)\1{4,}/, // Repeated characters (more than 4 times)
      // Removed restrictive character set validation to allow multilingual content
    ];

    return !inappropriatePatterns.some(pattern => pattern.test(content));
  }

  defaultMessage(args: ValidationArguments) {
    return 'Rating content must be valid text between 3-1000 characters in English or Arabic';
  }
}

export function IsValidRatingContent(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidRatingContentConstraint,
    });
  };
}