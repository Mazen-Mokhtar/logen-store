import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';
import { RatingRepository } from 'src/DB/models/Rating/rating.repository';
import { ProductRepository } from 'src/DB/models/Product/product.repository';
import { OrderRepository } from 'src/DB/models/Order/order.repository';
import { RatingOwnershipGuard } from './guards/rating-ownership.guard';
import { IsValidRatingContentConstraint } from './validators/rating-content.validator';
import { RatingSanitizationInterceptor } from './interceptors/rating-sanitization.interceptor';
import { SharedModule } from 'src/commen/sharedModules';

// Import schemas
import { ratingModel } from 'src/DB/models/Rating/rating.model';
import { productModel } from 'src/DB/models/Product/product.model';
import { orderModel } from 'src/DB/models/Order/order.model';

@Module({
  imports: [
    SharedModule,
    ratingModel,
    productModel,
    orderModel,
  ],
  controllers: [RatingController],
  providers: [
    RatingService,
    RatingRepository,
    ProductRepository,
    OrderRepository,
    RatingOwnershipGuard,
    IsValidRatingContentConstraint,
    RatingSanitizationInterceptor,
  ],
  exports: [RatingService, RatingRepository],
})
export class RatingModule {}