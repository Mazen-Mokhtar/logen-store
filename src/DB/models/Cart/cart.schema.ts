import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../User/user.schema';
import { Product } from '../Product/product.schema';

export interface ICartItem {
  productId: Types.ObjectId;
  title: string;
  price: number;
  currency: string;
  image: string;
  quantity: number;
  size?: string;
  color?: string;
}

@Schema({ 
  timestamps: true,
  _id: true,
  id: false
})
export class Cart {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, unique: true })
  userId: Types.ObjectId;

  @Prop([
    raw({
      productId: { type: Types.ObjectId, ref: Product.name, required: true },
      title: { type: String, required: true },
      price: { type: Number, required: true, min: 0 },
      currency: { 
        type: String, 
        required: true, 
        enum: ['USD', 'EUR', 'EGP', 'SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD'],
        default: 'USD'
      },
      image: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1, default: 1 },
      size: { type: String, required: false },
      color: { type: String, required: false },
    }),
  ])
  items: ICartItem[];

  @Prop({ type: Number, default: 0, min: 0 })
  totalItems: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalPrice: number;

  // Timestamp fields (automatically managed by Mongoose when timestamps: true)
  createdAt?: Date;
  updatedAt?: Date;
}

export const cartSchema = SchemaFactory.createForClass(Cart);

// Pre-save middleware to calculate totals
cartSchema.pre('save', function (next) {
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
  this.totalPrice = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  next();
});

// Pre-update middleware to calculate totals
cartSchema.pre(['updateOne', 'findOneAndUpdate'], function (next) {
  const update = this.getUpdate() as any;
  if (update.items) {
    update.totalItems = update.items.reduce((total: number, item: ICartItem) => total + item.quantity, 0);
    update.totalPrice = update.items.reduce((total: number, item: ICartItem) => total + (item.price * item.quantity), 0);
  }
  next();
});

export type TCart = HydratedDocument<Cart>;