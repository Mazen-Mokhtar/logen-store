import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductRedirectController } from './product-redirect.controller';
import { ProductService } from './product.service';
import { ProductRepository } from 'src/DB/models/Product/product.repository';
import { RatingRepository } from 'src/DB/models/Rating/rating.repository';
import { cloudService } from 'src/commen/multer/cloud.service';
import { productModel } from 'src/DB/models/Product/product.model';
import { ratingModel } from 'src/DB/models/Rating/rating.model';
import { SharedModule } from 'src/commen/sharedModules';

@Module({
  imports: [SharedModule, productModel, ratingModel],
  controllers: [ProductRedirectController, ProductController],
  providers: [ProductService, ProductRepository, RatingRepository, cloudService],
  exports: [ProductRepository],
})
export class ProductModule {}