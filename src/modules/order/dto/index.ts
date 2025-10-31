import { Type, Transform } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  MinLength,
  IsArray,
  ValidateNested,
  IsBoolean,
  Length,
  IsInt,
  Min,
  IsEmail,
  ValidateIf,
} from 'class-validator';
import { Types } from 'mongoose';
import { OrderStatus } from 'src/DB/models/Order/order.schema';
import { PaymentMethod } from '../enums/payment-method.enum';

export class CartItemDTO {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  id: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  image: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  size?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  color?: string;
}

export class ShippingInfoDTO {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  phone: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  address: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  postalCode?: string;
}

export class CreateCartOrderDTO {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDTO)
  items: CartItemDTO[];

  @ValidateNested()
  @Type(() => ShippingInfoDTO)
  shippingInfo: ShippingInfoDTO;

  @IsNumber()
  @IsPositive()
  subtotal: number;

  @IsNumber()
  @Min(0)
  shipping: number;

  @IsNumber()
  @Min(0)
  tax: number;

  @IsNumber()
  @IsPositive()
  total: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
  couponCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  note?: string;
}

export class CreateOrderDTO {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  productName: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  productId?: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
  couponCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  note?: string;
}

export class OrderIdDTO {
  @IsMongoId()
  orderId: Types.ObjectId;
}

export class UpdateOrderStatusDTO {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  adminNote?: string;
}

export class AdminOrderQueryDTO {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return 1;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1 : parsed;
  })
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return 20;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 20 : parsed;
  })
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}

export class UserOrderQueryDTO {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return 1;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1 : parsed;
  })
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return 20;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 20 : parsed;
  })
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}

export class TrackOrderDTO {
  @IsString({ message: 'Order ID must be a string' })
  @Length(8, 8, { message: 'Order ID must be exactly 8 characters long' })
  @Matches(/^[a-zA-Z0-9]{8}$/, { 
    message: 'Order ID must contain only alphanumeric characters (letters and numbers)' 
  })
  orderId: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'Phone must be a string' })
  @Matches(/^[\+]?[1-9][\d]{0,15}$/, { 
    message: 'Phone must be a valid phone number format' 
  })
  @IsOptional()
  phone?: string;
}
