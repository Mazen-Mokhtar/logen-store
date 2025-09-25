import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { cartRepository } from 'src/DB/models/Cart/cart.repository';
import { cartModel } from 'src/DB/models/Cart/cart.model';
import { SharedModule } from 'src/commen/sharedModules';

@Module({
  imports: [SharedModule, cartModel],
  controllers: [CartController],
  providers: [CartService, cartRepository],
  exports: [cartRepository, CartService],
})
export class CartModule {}