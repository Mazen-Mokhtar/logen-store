import { Injectable } from '@nestjs/common';
import { DBService } from '../db.service';
import { Product, TProduct } from './product.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ProductRepository extends DBService<TProduct> {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<TProduct>,
  ) {
    super(productModel);
  }
}