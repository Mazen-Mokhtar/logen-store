import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { UserRepository } from 'src/DB/models/User/user.repository';
import { OrderRepository } from 'src/DB/models/Order/order.repository';
import { StripeService } from 'src/commen/service/stripe.service';
import { TUser, SystemRoles } from 'src/DB/models/User/user.schema';
import { OrderStatus, Currency } from 'src/DB/models/Order/order.schema';
import {
  CheckoutRequestDTO,
  CheckoutResponseDTO,
  PaymentMethod,
  GuestInfoDTO,
} from './dto/checkout.dto';
import { messageSystem } from 'src/commen/messages';

@Injectable()
export class CheckoutService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly userRepository: UserRepository,
    private readonly orderRepository: OrderRepository,
    private readonly stripeService: StripeService,
  ) {}

  async processCheckout(
    checkoutData: CheckoutRequestDTO,
    authenticatedUser?: TUser,
  ): Promise<CheckoutResponseDTO> {
    // Check for idempotency
    const existingOrder = await this.orderRepository.findOne({
      idempotency_key: checkoutData.idempotencyKey,
    });

    if (existingOrder) {
      return this.buildCheckoutResponse(existingOrder, 'Order already processed');
    }

    // Start database transaction
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Calculate total amount
      const totalAmount = this.calculateTotalAmount(checkoutData.items);

      // Determine user (guest or authenticated)
      let user: TUser;
      if (authenticatedUser) {
        user = authenticatedUser;
      } else {
        if (!checkoutData.guestInfo) {
          throw new BadRequestException('Guest information is required for guest checkout');
        }
        user = await this.handleGuestUser(checkoutData.guestInfo, session);
      }

      // Create order
      const orderData = {
        userId: user._id,
        items: checkoutData.items.map(item => ({
        id: item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        image: item.image || '',
        size: item.size,
        color: item.color,
      })),
        totalAmount,
        currency: checkoutData.currency,
        status: checkoutData.paymentMethod === PaymentMethod.COD 
          ? OrderStatus.PENDING_COD 
          : OrderStatus.PENDING,
        payment_gateway: checkoutData.paymentMethod,
        idempotency_key: checkoutData.idempotencyKey,
        notes: checkoutData.notes,
        shippingInfo: authenticatedUser ? undefined : {
        firstName: checkoutData.guestInfo?.firstName || '',
        lastName: checkoutData.guestInfo?.lastName || '',
        email: checkoutData.guestInfo?.email || '',
        address: checkoutData.guestInfo?.address || '',
        city: checkoutData.guestInfo?.city || '',
        postalCode: checkoutData.guestInfo?.postalCode || '',
        phone: checkoutData.guestInfo?.phone || '',
      },
      };

      const order = await this.orderRepository.create(orderData);

      let paymentResponse: any = {};

      // Handle payment based on method
      if (checkoutData.paymentMethod === PaymentMethod.STRIPE) {
        paymentResponse = await this.processStripePayment(
          order,
          totalAmount,
          checkoutData.currency,
          user,
        );
        
        // Update order with payment token
        order.payment_token = paymentResponse.paymentIntentId;
        order.payment_metadata = {
          client_secret: paymentResponse.client_secret,
          payment_intent_id: paymentResponse.paymentIntentId,
        };
        await order.save({ session });
      } else if (checkoutData.paymentMethod === PaymentMethod.PAYMOB) {
        // TODO: Implement Paymob integration
        throw new BadRequestException('Paymob payment method not yet implemented');
      }

      // Commit transaction
      await session.commitTransaction();

      return this.buildCheckoutResponse(order, 'Checkout completed successfully', paymentResponse);

    } catch (error) {
      // Rollback transaction
      await session.abortTransaction();
      
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Checkout failed: ' + error.message);
    } finally {
      session.endSession();
    }
  }

  private async handleGuestUser(guestInfo: GuestInfoDTO, session: any): Promise<TUser> {
    // Check if guest user already exists by email
    let existingUser = await this.userRepository.findByEmail({ 
      email: guestInfo.email,
      provider: SystemRoles.GUEST,
    });

    if (existingUser) {
      // Update existing guest user with new information
      existingUser.userName = `${guestInfo.firstName} ${guestInfo.lastName}`;
      existingUser.phone = guestInfo.phone;
      await existingUser.save({ session });
      return existingUser;
    }

    // Check if email is already used by registered user
    const registeredUser = await this.userRepository.findByEmail({ 
      email: guestInfo.email,
      provider: { $ne: SystemRoles.GUEST },
    });

    if (registeredUser) {
      throw new ConflictException(
        'This email is already registered. Please login or use a different email.'
      );
    }

    // Create new guest user
    const guestUserData = {
      userName: `${guestInfo.firstName} ${guestInfo.lastName}`,
      email: guestInfo.email,
      phone: guestInfo.phone,
      provider: SystemRoles.GUEST,
      role: 'user',
      isConfirm: true, // Guest users are automatically confirmed
    };

    return await this.userRepository.create(guestUserData);
  }

  private calculateTotalAmount(items: any[]): number {
    return items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }

  private async processStripePayment(
    order: any,
    amount: number,
    currency: Currency,
    user: TUser,
  ): Promise<any> {
    try {
      const paymentIntent = await this.stripeService.createPaymentIntent({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          orderId: order._id.toString(),
          userId: user._id.toString(),
          userEmail: user.email,
        },
        description: `Order #${order._id} - ${order.items.length} items`,
      });

      return {
        paymentIntentId: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
      };
    } catch (error) {
      throw new BadRequestException(`Payment processing failed: ${error.message}`);
    }
  }

  private buildCheckoutResponse(
    order: any,
    message: string,
    paymentData?: any,
  ): CheckoutResponseDTO {
    const response: CheckoutResponseDTO = {
      success: true,
      message,
      orderId: order._id.toString(),
      userId: order.userId.toString(),
      totalAmount: order.totalAmount,
      currency: order.currency,
      status: order.status,
    };

    if (paymentData) {
      response.clientSecret = paymentData.client_secret;
      response.paymentToken = paymentData.paymentIntentId;
    }

    return response;
  }

  async handlePaymentWebhook(
    gateway: string,
    eventType: string,
    paymentToken: string,
    metadata: any,
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Find order by payment token
      const order = await this.orderRepository.findOne({
        payment_token: paymentToken,
      });

      if (!order) {
        throw new BadRequestException('Order not found for payment token');
      }

      // Handle different event types
      if (eventType === 'payment_intent.succeeded' || eventType === 'charge.succeeded') {
        if (order.status === OrderStatus.PAID) {
          return { success: true, message: 'Order already marked as paid' };
        }

        order.status = OrderStatus.PAID;
        order.payment_metadata = {
          ...order.payment_metadata,
          transaction_id: metadata.transaction_id || metadata.id,
          payment_method: metadata.payment_method,
          paid_at: new Date(),
          webhook_event: eventType,
        };
      } else if (eventType === 'payment_intent.payment_failed' || eventType === 'charge.failed') {
        order.status = OrderStatus.FAILED;
        order.payment_metadata = {
          ...order.payment_metadata,
          failure_reason: metadata.failure_reason || metadata.outcome?.reason,
          failed_at: new Date(),
          webhook_event: eventType,
        };
      }

      await order.save({ session });
      await session.commitTransaction();

      return { 
        success: true, 
        message: `Order ${order._id} status updated to ${order.status}` 
      };

    } catch (error) {
      await session.abortTransaction();
      throw new InternalServerErrorException(`Webhook processing failed: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  async getOrderStatus(orderId: string, userId?: string): Promise<any> {
    const filter: any = { _id: new Types.ObjectId(orderId) };
    
    if (userId) {
      filter.userId = new Types.ObjectId(userId);
    }

    const order = await this.orderRepository.findOne(filter);
    
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return {
      success: true,
      data: {
        orderId: order._id,
        status: order.status,
        totalAmount: order.totalAmount,
        currency: order.currency,
        paymentGateway: order.payment_gateway,
        createdAt: order.createdAt,
        updatedAt: new Date(),
      },
    };
  }
}