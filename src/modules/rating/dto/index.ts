import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsBoolean,
  IsEnum,
  IsMongoId,
  ValidateNested,
  IsObject,
  MaxLength
} from 'class-validator';
import { IsValidRatingContent } from '../validators/rating-content.validator';

export class RatingCommentDTO {
  @ApiPropertyOptional({ description: 'English comment' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  en?: string;

  @ApiPropertyOptional({ description: 'Arabic comment' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  ar?: string;
}

export class CreateRatingDTO {
  @ApiProperty({ description: 'Product ID', example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  productId: string;

  @ApiProperty({ description: 'Rating value (1-5)', minimum: 1, maximum: 5, example: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Rating comment in multiple languages' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RatingCommentDTO)
  @IsValidRatingContent()
  comment?: RatingCommentDTO;
}

export class UpdateRatingDTO {
  @ApiPropertyOptional({ description: 'Rating value (1-5)', minimum: 1, maximum: 5, example: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Rating comment in multiple languages' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RatingCommentDTO)
  @IsValidRatingContent()
  comment?: RatingCommentDTO;
}

export class ParamRatingDTO {
  @ApiProperty({ description: 'Rating ID', example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  id: string;
}

export class ParamProductRatingDTO {
  @ApiProperty({ description: 'Product ID', example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  productId: string;
}

export enum RatingSortBy {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  HIGHEST = 'highest',
  LOWEST = 'lowest',
  HELPFUL = 'helpful'
}

export class QueryRatingDTO {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ 
    description: 'Sort by', 
    enum: RatingSortBy, 
    default: RatingSortBy.NEWEST 
  })
  @IsOptional()
  @IsEnum(RatingSortBy)
  sortBy?: RatingSortBy = RatingSortBy.NEWEST;

  @ApiPropertyOptional({ description: 'Filter by rating value (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Show only verified purchases', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  verifiedOnly?: boolean = false;
}

export class HelpfulVoteDTO {
  @ApiProperty({ description: 'Rating ID', example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  ratingId: string;
}