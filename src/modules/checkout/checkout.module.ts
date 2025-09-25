import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { UserRepository } from 'src/DB/models/User/user.repository';
import { OrderRepository } from 'src/DB/models/Order/order.repository';
import { StripeService } from 'src/commen/service/stripe.service';
import { User, userSchema } from 'src/DB/models/User/user.schema';
import { Order, orderSchema } from 'src/DB/models/Order/order.schema';
import { SharedModule } from 'src/commen/sharedModules';

@Module({
  imports: [
    SharedModule,
    MongooseModule.forFeature([
      { name: User.name, schema: userSchema },
      { name: Order.name, schema: orderSchema },
    ]),
  ],
  controllers: [CheckoutController],
  providers: [
    CheckoutService,
    UserRepository,
    OrderRepository,
    StripeService,
  ],
  exports: [CheckoutService],
})
export class CheckoutModule {}