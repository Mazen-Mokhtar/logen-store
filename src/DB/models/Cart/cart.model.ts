import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, cartSchema } from './cart.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: cartSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class cartModel {}