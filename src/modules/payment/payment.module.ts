import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { CheckoutModule } from '../checkout/checkout.module';
import { StripeService } from 'src/commen/service/stripe.service';

@Module({
  imports: [CheckoutModule],
  controllers: [PaymentController],
  providers: [StripeService],
})
export class PaymentModule {}