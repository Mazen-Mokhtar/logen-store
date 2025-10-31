import { PartialType } from '@nestjs/mapped-types';
import { Type, Transform } from 'class-transformer';
import {
  IsMongoId,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsObject,
  IsDateString,
  IsHexColor,
} from 'class-validator';
import { Types } from 'mongoose';

export class ProductTitleDTO {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  en: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  ar: string;
}

export class ProductDescriptionDTO {
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  en: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  ar: string;
}

export class ProductPromotionDTO {
  @IsBoolean()
  isOnSale: boolean;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  originalPrice?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  salePrice?: number;

  @IsDateString()
  @IsOptional()
  saleEndDate?: string;
}

export class ProductSizeDTO {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  available?: boolean = true;
}

export class ProductColorDTO {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsOptional()
  name?: string;

  @IsHexColor()
  @IsOptional()
  hex?: string;

  @IsBoolean()
  @IsOptional()
  available?: boolean = true;
}

export class ProductWarrantyDescriptionDTO {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @IsOptional()
  en?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @IsOptional()
  ar?: string;
}

export class ProductWarrantyDTO {
  @IsBoolean()
  hasWarranty: boolean;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  warrantyPeriod?: number; // in months

  @IsString()
  @IsOptional()
  warrantyType?: 'manufacturer' | 'seller' | 'extended';

  @ValidateNested()
  @Type(() => ProductWarrantyDescriptionDTO)
  @IsOptional()
  warrantyDescription?: ProductWarrantyDescriptionDTO;
}

export class CreateProductDTO {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  handle: string;

  @ValidateNested()
  @Type(() => ProductTitleDTO)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  title: ProductTitleDTO;

  @ValidateNested()
  @Type(() => ProductDescriptionDTO)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  description: ProductDescriptionDTO;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toUpperCase();
    }
    return value;
  })
  currency?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [value];
      }
    }
    return value;
  })
  tags?: string[];

  @IsMongoId()
  category: Types.ObjectId;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  inStock?: boolean;

  @ValidateNested()
  @Type(() => ProductPromotionDTO)
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  promotion?: ProductPromotionDTO;

 @IsArray()
  // @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [value];
      }
    }
    return value;
  })
  sizes?: ProductSizeDTO[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductColorDTO)
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value || [];
  })
  colors?: ProductColorDTO[];

  @ValidateNested()
  @Type(() => ProductWarrantyDTO)
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return { hasWarranty: false };
      }
    }
    return value || { hasWarranty: false };
  })
  warranty?: ProductWarrantyDTO;
}

// DTO for bulk product creation with pre-uploaded images
export class BulkCreateProductItemDTO {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  handle: string;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  category: string;

  @IsBoolean()
  @IsOptional()
  inStock?: boolean;

  @ValidateNested()
  @Type(() => ProductPromotionDTO)
  @IsOptional()
  promotion?: ProductPromotionDTO;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sizes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  colors?: string[];

  // Array of image URLs (secure_url) - no public_id needed as mentioned by user
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  imageUrls: string[];

  @ValidateNested()
  @Type(() => ProductWarrantyDTO)
  @IsOptional()
  warranty?: ProductWarrantyDTO;
}

export class BulkCreateProductDTO {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkCreateProductItemDTO)
  products: BulkCreateProductItemDTO[];
}

export class UpdateProductDTO extends PartialType(CreateProductDTO) { }

export class ParamProductDTO {
  @IsMongoId()
  productId: Types.ObjectId;
}

export class QueryProductDTO {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  search?: string;

  @IsMongoId()
  @IsOptional()
  category?: Types.ObjectId;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  inStock?: boolean;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsString()
  @MinLength(1)
  @IsOptional()
  sort?: string;
}