import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../User/user.schema';
import { Product } from '../Product/product.schema';

export interface IRatingComment {
  en?: string;
  ar?: string;
}

@Schema({ 
  timestamps: true,
  _id: true,
  id: false
})
export class Rating {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Product.name, required: true })
  productId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating: number;

  @Prop({
    type: {
      en: { type: String, required: false },
      ar: { type: String, required: false },
    },
    required: false
  })
  comment?: IRatingComment;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isVerifiedPurchase: boolean;

  // Helpful votes from other users
  @Prop({ type: Number, default: 0, min: 0 })
  helpfulVotes: number;

  @Prop([{ type: Types.ObjectId, ref: User.name }])
  helpfulBy: Types.ObjectId[];

  // Admin moderation
  @Prop({ type: Boolean, default: false })
  isReported: boolean;

  @Prop({ type: String, required: false })
  moderationNote?: string;

  // Timestamps (automatically added by mongoose)
  createdAt?: Date;
  updatedAt?: Date;
}

export const ratingSchema = SchemaFactory.createForClass(Rating);

// Compound index to ensure one rating per user per product
ratingSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Index for efficient product rating queries
ratingSchema.index({ productId: 1, isActive: 1, createdAt: -1 });

// Index for user rating queries
ratingSchema.index({ userId: 1, isActive: 1, createdAt: -1 });

// Index for rating statistics
ratingSchema.index({ productId: 1, rating: 1, isActive: 1 });

// Index for verified purchase queries
ratingSchema.index({ productId: 1, isVerifiedPurchase: 1, isActive: 1 });

export type TRating = HydratedDocument<Rating>;