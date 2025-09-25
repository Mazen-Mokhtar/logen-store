import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PaymentMethod } from 'src/modules/order/enums/payment-method.enum';

export enum Currency {
  USD = 'USD',
  EGP = 'EGP',
}

export enum OrderStatus {
    PENDING = "pending",
    PENDING_COD = "pending_cod",
    PLACED = "placed",
    ON_WAY = "on_way",
    DELIVERED = "delivered",
    REJECTED = "rejected",
    PAID = "paid",
    FAILED = "failed"
}

export interface CartItem {
  id: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
  size?: string;
  color?: string;
}

export interface ShippingInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: String, required: false })
  productId?: string;

  // Cart-based order fields
  @Prop({
    type: [{
      id: String,
      title: String,
      price: Number,
      image: String,
      quantity: Number,
      size: { type: String, required: false },
      color: { type: String, required: false }
    }],
    required: false
  })
  items?: CartItem[];

  @Prop({
    type: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      postalCode: { type: String, required: false }
    },
    required: false
  })
  shippingInfo?: ShippingInfo;

  @Prop({ type: Number, required: false })
  subtotal?: number;

  @Prop({ type: Number, required: false })
  shipping?: number;

  @Prop({ type: Number, required: false })
  tax?: number;

  @Prop({ type: Number, required: false })
  total?: number;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: string;

  @Prop({ type: Boolean, default: false })
  isReviewed: boolean;

  @Prop({ type: String })
  adminNote: string;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  paymentMethod: PaymentMethod;

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({
    type: String,
    enum: Currency,
    required: false,
    default: Currency.EGP,
  })
  currency: Currency;

  // Coupon fields
  @Prop({ type: Types.ObjectId, ref: 'Coupon', required: false })
  couponId?: Types.ObjectId;

  @Prop({ type: Number, required: false })
  originalAmount?: number; // المبلغ الأصلي قبل الخصم

  @Prop({ type: Number, required: false })
  discountAmount?: number; // مبلغ الخصم

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date })
  paidAt: Date;

  @Prop({ type: Number })
  refundAmount: number;

  @Prop({ type: Date })
  refundDate: Date;

  @Prop({ type: String })
  intent: string; // Stripe payment intent ID

  @Prop({ type: String, required: false })
  payment_gateway: string; // e.g., 'stripe', 'paymob', 'cod'

  @Prop({ type: String, required: false })
  payment_token: string; // Payment intent ID or transaction token

  @Prop({ type: String, required: false, unique: true, sparse: true })
  idempotency_key: string; // UUID for preventing duplicate orders

  @Prop({ type: Object, required: false })
  payment_metadata: any; // Additional payment information

}

export const orderSchema = SchemaFactory.createForClass(Order);

// Add strategic indexes for better query performance
// Compound index for user orders with status and date filtering
orderSchema.index({ userId: 1, status: 1, createdAt: -1 });
// Index for admin order management queries
orderSchema.index({ status: 1, createdAt: -1 });
// Index for payment method filtering
orderSchema.index({ paymentMethod: 1, status: 1 });
// Index for product-based order queries
orderSchema.index({ productName: 1, status: 1 });
// Index for coupon usage tracking
orderSchema.index({ couponId: 1, status: 1 });

export type OrderDocument = HydratedDocument<Order>;

// Pre-save middleware for basic validation
orderSchema.pre('save', async function (next) {
  try {
    // Basic validation can be added here if needed
    next();
  } catch (error) {
    next(error);
  }
});
