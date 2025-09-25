import { IsString, IsNumber, IsOptional, Min, IsNotEmpty, IsMongoId } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class AddToCartDto {
  @ApiProperty({ description: 'Product ID to add to cart' })
  @IsNotEmpty()
  @IsMongoId()
  productId: string;

  @ApiProperty({ description: 'Product title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Product price', minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Product image URL' })
  @IsNotEmpty()
  @IsString()
  image: string;

  @ApiProperty({ description: 'Quantity to add', minimum: 1, default: 1 })
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  quantity: number = 1;

  @ApiPropertyOptional({ description: 'Product size' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ description: 'Product color' })
  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateCartItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsNotEmpty()
  @IsMongoId()
  productId: string;

  @ApiProperty({ description: 'New quantity', minimum: 1 })
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  quantity: number;

  @ApiPropertyOptional({ description: 'Product size' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ description: 'Product color' })
  @IsOptional()
  @IsString()
  color?: string;
}

export class RemoveFromCartDto {
  @ApiProperty({ description: 'Product ID to remove' })
  @IsNotEmpty()
  @IsMongoId()
  productId: string;

  @ApiPropertyOptional({ description: 'Product size' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ description: 'Product color' })
  @IsOptional()
  @IsString()
  color?: string;
}

export class CartItemResponseDto {
  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Product title' })
  title: string;

  @ApiProperty({ description: 'Product price' })
  price: number;

  @ApiProperty({ description: 'Product image URL' })
  image: string;

  @ApiProperty({ description: 'Item quantity' })
  quantity: number;

  @ApiPropertyOptional({ description: 'Product size' })
  size?: string;

  @ApiPropertyOptional({ description: 'Product color' })
  color?: string;
}

export class CartResponseDto {
  @ApiProperty({ description: 'Cart ID' })
  _id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Cart items', type: [CartItemResponseDto] })
  items: CartItemResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  totalItems: number;

  @ApiProperty({ description: 'Total price' })
  totalPrice: number;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt?: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt?: Date;
}