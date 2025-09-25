import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  IsUUID,
  ValidateNested,
  IsPositive,
  Min,
  MinLength,
  MaxLength,
  IsPhoneNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from 'src/DB/models/Order/order.schema';

export enum PaymentMethod {
  COD = 'cod',
  STRIPE = 'stripe',
  PAYMOB = 'paymob',
}

export class CartItemDTO {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  @MinLength(1)
  id: string;

  @ApiProperty({ description: 'Product title' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Product price' })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ description: 'Product image URL' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({ description: 'Product size' })
  @IsString()
  @IsOptional()
  size?: string;

  @ApiPropertyOptional({ description: 'Product color' })
  @IsString()
  @IsOptional()
  color?: string;
}

export class GuestInfoDTO {
  @ApiProperty({ description: 'Guest first name' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ description: 'Guest last name' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ description: 'Guest email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Guest phone number' })
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone: string;

  @ApiProperty({ description: 'Guest address' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  address: string;

  @ApiProperty({ description: 'Guest city' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  city: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  postalCode?: string;
}

export class CheckoutRequestDTO {
  @ApiProperty({ description: 'Cart items', type: [CartItemDTO] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDTO)
  items: CartItemDTO[];

  @ApiPropertyOptional({ description: 'Guest information (required for guest checkout)', type: GuestInfoDTO })
  @ValidateNested()
  @Type(() => GuestInfoDTO)
  @IsOptional()
  guestInfo?: GuestInfoDTO;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Order currency', enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({ description: 'Idempotency key to prevent duplicate orders' })
  @IsUUID()
  idempotencyKey: string;

  @ApiPropertyOptional({ description: 'Coupon code' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
  couponCode?: string;

  @ApiPropertyOptional({ description: 'Order notes' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class CheckoutResponseDTO {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Order ID' })
  orderId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Total amount' })
  totalAmount: number;

  @ApiProperty({ description: 'Currency' })
  currency: string;

  @ApiProperty({ description: 'Order status' })
  status: string;

  @ApiPropertyOptional({ description: 'Payment client secret (for online payments)' })
  clientSecret?: string;

  @ApiPropertyOptional({ description: 'Payment redirect URL (for some gateways)' })
  redirectUrl?: string;

  @ApiPropertyOptional({ description: 'Payment token/intent ID' })
  paymentToken?: string;
}

export class WebhookPayloadDTO {
  @ApiProperty({ description: 'Payment gateway' })
  @IsString()
  gateway: string;

  @ApiProperty({ description: 'Event type' })
  @IsString()
  eventType: string;

  @ApiProperty({ description: 'Payment token/intent ID' })
  @IsString()
  paymentToken: string;

  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ description: 'Transaction ID' })
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiPropertyOptional({ description: 'Payment metadata' })
  @IsOptional()
  metadata?: any;
}