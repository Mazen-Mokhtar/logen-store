import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { SharedModule } from 'src/commen/sharedModules';
import { OrderRepository } from 'src/DB/models/Order/order.repository';
import { orderModel } from 'src/DB/models/Order/order.model';
import { StripeService } from 'src/commen/service/stripe.service';
import { EncryptionService } from 'src/commen/service/encryption.service';
import { IsValidEmailFormatConstraint } from './validators/email-format.validator';
import { CouponModule } from '../coupon/coupon.module';

@Module({
  imports: [SharedModule, orderModel, CouponModule],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderRepository,
    StripeService,
    EncryptionService,
    IsValidEmailFormatConstraint,
  ],
  exports: [OrderService],
})
export class OrderModule {}
