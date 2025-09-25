import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRepository } from 'src/DB/models/Product/product.repository';
import { cloudService } from 'src/commen/multer/cloud.service';
import { productModel } from 'src/DB/models/Product/product.model';
import { SharedModule } from 'src/commen/sharedModules';

@Module({
  imports: [SharedModule, productModel],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository, cloudService],
  exports: [ProductRepository],
})
export class ProductModule {}