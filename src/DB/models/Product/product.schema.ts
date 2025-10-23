import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { IAttachments } from 'src/commen/multer/cloud.service';
import { User } from '../User/user.schema';
import { Category } from '../Category/category.schema';
import slugify from 'slugify';

export interface IProductTitle {
  en: string;
  ar: string;
}

export interface IProductDescription {
  en: string;
  ar: string;
}

export interface IProductPromotion {
  isOnSale: boolean;
  originalPrice?: number;
  salePrice?: number;
  saleEndDate?: Date;
}

export interface IProductSize {
  name?: string;
  available?: boolean;
}

export interface IProductColor {
  name?: string;
  hex?: string;
  available?: boolean;
}

export interface IProductRatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

@Schema({ 
  timestamps: true,
  _id: true,  // تأكيد أن MongoDB سيقوم بإنشاء _id تلقائياً
  id: false   // منع إنشاء virtual id getter
})
export class Product {
  @Prop({ type: String, required: true, unique: true })
  handle: string;

  @Prop(
    raw({
      en: { type: String, required: true },
      ar: { type: String, required: true },
    }),
  )
  title: IProductTitle;

  @Prop(
    raw({
      en: { type: String, required: true },
      ar: { type: String, required: true },
    }),
  )
  description: IProductDescription;

  @Prop({ type: Number, required: true, min: 0 })
  price: number;

  @Prop([
    raw({
      secure_url: { type: String, required: true },
      public_id: { type: String, required: true },
    }),
  ])
  images: IAttachments[];

  @Prop([{ type: String }])
  tags: string[];

  @Prop({ type: Types.ObjectId, ref: Category.name, required: true })
  category: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  inStock: boolean;

  @Prop(
    raw({
      isOnSale: { type: Boolean, default: false },
      originalPrice: { type: Number },
      salePrice: { type: Number },
      saleEndDate: { type: Date },
    }),
  )
  promotion: IProductPromotion;

  @Prop([
    raw({
      name: { type: String, required: false },
      available: { type: Boolean, default: true },
    }),
  ])
  sizes: IProductSize[];

  @Prop([
    raw({
      name: { type: String, required: false },
      hex: { type: String, required: false },
      available: { type: Boolean, default: true },
    }),
  ])
  colors: IProductColor[];

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: String, required: true })
  folderId: string;

  // Virtual field for rating statistics (not stored in DB)
  ratingStats?: IProductRatingStats;
}

export const productSchema = SchemaFactory.createForClass(Product);

productSchema.pre('save', function (next) {
  if (this.isNew && !this.handle) {
    this.handle = slugify(this.title.en, { lower: true, strict: true });
  }
  next();
});

productSchema.pre('updateOne', function (next) {
  const update = this.getUpdate();
  if (update && update['title'] && update['title']['en']) {
    update['handle'] = slugify(update['title']['en'], { lower: true, strict: true });
    this.setUpdate(update);
  }
  next();
});

export type TProduct = HydratedDocument<Product>;