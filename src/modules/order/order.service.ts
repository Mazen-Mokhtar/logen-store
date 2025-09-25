import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderRepository } from 'src/DB/models/Order/order.repository';
import { TUser } from 'src/DB/models/User/user.schema';
import {
  CreateOrderDTO,
  CreateCartOrderDTO,
  OrderIdDTO,
  UpdateOrderStatusDTO,
  AdminOrderQueryDTO,
  UserOrderQueryDTO,
} from './dto';
import { OrderStatus, Currency } from 'src/DB/models/Order/order.schema';
import { Types } from 'mongoose';
import { StripeService } from 'src/commen/service/stripe.service';
import { Request } from 'express';
import { RoleTypes } from 'src/DB/models/User/user.schema';
import { EncryptionService } from 'src/commen/service/encryption.service';
import { cloudService, IAttachments } from 'src/commen/multer/cloud.service';
import { CouponService } from '../coupon/coupon.service';
import { CouponType } from 'src/DB/models/Coupon/coupon.schema';

@Injectable()
export class OrderService {
  private readonly cloudService = new cloudService();
  private readonly encryptionService = new EncryptionService();

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly stripeService: StripeService,
    private readonly couponService: CouponService,
  ) {}

  async createCartOrder(user: TUser, body: CreateCartOrderDTO) {
    // Validate cart items
    if (!body.items || body.items.length === 0) {
      throw new BadRequestException('Cart items are required');
    }

    // Validate shipping information
    if (!body.shippingInfo) {
      throw new BadRequestException('Shipping information is required');
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(body.shippingInfo.email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate totals
    const calculatedSubtotal = body.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    if (Math.abs(calculatedSubtotal - body.subtotal) > 0.01) {
      throw new BadRequestException('Subtotal calculation mismatch');
    }

    const calculatedTotal = body.subtotal + body.shipping + body.tax;
    if (Math.abs(calculatedTotal - body.total) > 0.01) {
      throw new BadRequestException('Total calculation mismatch');
    }

    // Apply coupon if provided
    let couponData: any = null;
    let finalAmount = body.total;

    if (body.couponCode) {
      try {
        couponData = await this.applyCouponToOrder(
          body.couponCode,
          body.total,
        );
        finalAmount = couponData.finalAmount;
      } catch (error) {
        throw new BadRequestException(`Coupon error: ${error.message}`);
      }
    }

    // Create order data
    const orderData: any = {
      userId: user._id,
      productName: `Cart Order - ${body.items.length} items`,
      items: body.items,
      shippingInfo: body.shippingInfo,
      subtotal: body.subtotal,
      shipping: body.shipping,
      tax: body.tax,
      totalAmount: finalAmount,
      currency: Currency.EGP,
      paymentMethod: body.paymentMethod,
      status: OrderStatus.PENDING,
      adminNote: body.note,
    };

    // Add coupon data if applied
    if (couponData) {
      orderData.couponId = couponData.couponId;
      orderData.originalAmount = couponData.originalAmount;
      orderData.discountAmount = couponData.discountAmount;
    }

    try {
      const order = await this.orderRepository.create(orderData);
      return {
        success: true,
        message: 'Cart order created successfully',
        data: order,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to create order: ${error.message}`);
    }
  }

  async createOrder(user: TUser, body: CreateOrderDTO) {
    // Simplified order creation without game/package validation
    // Since we removed game and package modules, we'll create orders with basic validation
    
    // Basic validation for required fields
    if (!body.productName) {
      throw new BadRequestException('Product name is required');
    }

    // Basic validation
    if (!body.productName || body.productName.trim().length === 0) {
      throw new BadRequestException('Product name is required');
    }

    // Validate payment method
    if (!body.paymentMethod) {
      throw new BadRequestException('Payment method is required');
    }

    // Set default values since we don't have game/package data
    const totalAmount = 100; // Default amount - should be configured elsewhere
    const orderCurrency = Currency.EGP; // Default currency

    // Apply coupon if provided
    let couponData: any = null;
    let finalAmount = totalAmount;

    if (body.couponCode) {
      try {
        couponData = await this.applyCouponToOrder(
          body.couponCode,
          totalAmount,
        );
        finalAmount = couponData.finalAmount;
      } catch (error) {
        throw new BadRequestException(`Coupon error: ${error.message}`);
      }
    }

    const orderData: any = {
      userId: user._id,
      productName: body.productName,
      paymentMethod: body.paymentMethod,
      totalAmount: finalAmount,
      currency: orderCurrency,
      status: OrderStatus.PENDING,
      adminNote: body.note,
    };

    // Add coupon data if applied
    if (couponData) {
      orderData.couponId = couponData.couponId;
      orderData.originalAmount = couponData.originalAmount;
      orderData.discountAmount = couponData.discountAmount;
    }

    // Add productId if provided
    if (body.productId) {
      orderData.productId = body.productId;
    }

    const order = await this.orderRepository.create(orderData);

    // Add coupon info to response
    const responseData: any = { ...order.toObject() };
    if (couponData) {
      responseData.couponApplied = {
        code: couponData.couponDetails.code,
        name: couponData.couponDetails.name,
        discountAmount: couponData.discountAmount,
        originalAmount: couponData.originalAmount,
      };
    }

    return { success: true, data: responseData };
  }

  async checkout(user: TUser, orderId: Types.ObjectId) {
    const order = await this.orderRepository.findOne({
      _id: orderId,
      userId: user._id,
      paymentMethod: 'card',
      status: OrderStatus.PENDING,
    });

    if (!order) {
      throw new BadRequestException('Invalid order or order not found');
    }

    // Use product name from order
    const productName = order.productName || 'Product';

    // استخدام العملة من الطلب مع EGP كقيمة افتراضية
    const currency = (order.currency || 'EGP').toLowerCase();

    // إعداد بيانات المنتج للدفع (بالمبلغ الأصلي)
    const lineItems: any = [
      {
        quantity: 1,
        price_data: {
          product_data: {
            name: productName,
          },
          currency: currency,
          unit_amount: (order.originalAmount || order.totalAmount) * 100, // المبلغ الأصلي قبل الخصم
        },
      },
    ];

    // إعداد معلومات الجلسة
    const metadata: any = { orderId: orderId.toString() };
    let discounts: any[] = [];

    // إنشاء كوبون Stripe إذا كان مطبقاً
    if (order.couponId && order.discountAmount) {
      try {
        // الحصول على تفاصيل الكوبون من قاعدة البيانات
        const coupon = await this.couponService.getCouponByObjectId(
          order.couponId,
        );

        if (coupon) {
          // إنشاء كوبون في Stripe باستخدام الدالة المحسنة
          const stripeCoupon = await this.createStripeCoupon(
            coupon,
            order.discountAmount,
            order.originalAmount || order.totalAmount,
            currency,
            orderId,
          );

          // إضافة الكوبون إلى الخصومات
          discounts = [
            {
              coupon: stripeCoupon.id,
            },
          ];

          // إضافة معلومات الكوبون للـ metadata
          metadata.couponId = order.couponId.toString();
          metadata.couponCode = coupon.code;
          metadata.originalAmount = order.originalAmount;
          metadata.discountAmount = order.discountAmount;
          metadata.stripeCouponId = stripeCoupon.id;
        }
      } catch (error) {
        console.error('Error creating Stripe coupon:', error);
        // في حالة فشل إنشاء الكوبون، استخدم المبلغ النهائي مباشرة
        lineItems[0].price_data.unit_amount = order.totalAmount * 100;
      }
    }

    const session = await this.stripeService.cheakoutSession({
      customer_email: user.email,
      line_items: lineItems,
      metadata: metadata,
      discounts: discounts,
    });

    return { success: true, data: session };
  }

  async webhook(req: Request) {
    const data = await this.stripeService.webhook(req);

    if (typeof data === 'string') {
      return 'Done';
    } else {
      await this.orderRepository.updateOne(
        { _id: data.orderId },
        {
          status: OrderStatus.PAID,
          paidAt: new Date(),
        },
      );
    }
  }

  async cancelOrder(user: TUser, orderId: Types.ObjectId) {
    const order = await this.orderRepository.findOne({
      _id: orderId,
      userId: user._id,
      status: { $in: [OrderStatus.PENDING, OrderStatus.PAID] },
    });

    if (!order) {
      throw new BadRequestException('Invalid order or cannot cancel');
    }

    let refund = {};
    if (order.paymentMethod === 'card' && order.status === OrderStatus.PAID) {
      refund = {
        refundAmount: order.totalAmount,
        refundDate: new Date(),
      };
      // Note: You'll need to implement refund logic in StripeService
      // await this.stripeService.refund(order.intent as string);
    }

    await this.orderRepository.updateOne(
      { _id: orderId },
      {
        status: OrderStatus.REJECTED,
        adminNote: 'Cancelled by user',
        ...refund,
      },
    );

    return { success: true, data: 'Order cancelled successfully' };
  }

  async getUserOrders(userId: Types.ObjectId, query?: UserOrderQueryDTO) {
    const filter: any = { userId };

    // If no query provided, use default behavior
    if (!query) {
      const orders = await this.orderRepository.findWithPopulate(
        filter,
        '',
        { sort: { createdAt: -1 } },
        undefined,
        [],
      );
      return { success: true, data: orders };
    }

    // Status filter
    if (query.status) {
      filter.status = query.status;
    }

    // Payment status filter
    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }

    // Date range filter
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.createdAt.$lte = new Date(query.endDate);
      }
    }

    // Search filter - search in product name
    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [
        { productName: searchRegex },
      ];
    }

    // Pagination parameters
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Sort configuration
    let sortConfig: any = { createdAt: -1 }; // Default sort
    if (query.sortBy) {
      const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
      sortConfig = { [query.sortBy]: sortOrder };
    }

    // Get total count for pagination
    const total = await this.orderRepository.count(filter);

    // Get paginated data with optimized field selection
    const orders = await this.orderRepository.findWithPopulate(
      filter,
      'userId productName productId status totalAmount currency paymentMethod createdAt paidAt',
      {
        sort: sortConfig,
        skip: skip,
        limit: limit,
        lean: true,
      },
      undefined,
      [],
    );

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      success: true,
      data: orders,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
      },
    };
  }

  async getOrderDetails(user: TUser, orderId: Types.ObjectId) {
    const order = await this.orderRepository.findOneWithPopulate(
      {
        _id: orderId,
        userId: user._id,
      },
      '',
      {},
      [],
    );

    if (!order) {
      throw new BadRequestException(
        'Order not found or you do not have access to this order',
      );
    }

    return { success: true, data: order };
  }

  // Admin Dashboard Methods
  async getAllOrders(query: AdminOrderQueryDTO, user?: TUser) {
    const filter: any = {};
    console.log({ query });
    // Status filter
    if (query.status) {
      filter.status = query.status;
    }

    // Payment status filter
    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }

    // Date range filter
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.createdAt.$lte = new Date(query.endDate);
      }
    }

    // Search filter
    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [
        { 'userId.name': searchRegex },
        { 'userId.email': searchRegex },
        { productName: searchRegex },
      ];
    }

    // Pagination parameters
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Sort configuration
    let sortConfig: any = { createdAt: -1 }; // Default sort
    if (query.sortBy) {
      const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
      sortConfig = { [query.sortBy]: sortOrder };
    }

    // Use optimized aggregation pipeline for better performance
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userId',
          pipeline: [{ $project: { name: 1, email: 1, phone: 1 } }],
        },
      },
      {
        $addFields: {
          userId: { $arrayElemAt: ['$userId', 0] },
        },
      },
      {
        $facet: {
          data: [{ $sort: sortConfig }, { $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await this.orderRepository.aggregate(pipeline);
    const orders = result.data;
    const total = result.totalCount[0]?.count || 0;

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      success: true,
      data: orders,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
      },
    };
  }

  async getOrderById(orderId: Types.ObjectId, user?: TUser) {
    const order = await this.orderRepository.findByIdWithPopulate(
      orderId,
      '',
      { isAdminRequest: true },
      [
        { path: 'userId', select: 'name email phone' },
      ],
    );

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return { success: true, data: order };
  }

  async updateOrderStatus(
    admin: TUser,
    orderId: Types.ObjectId,
    body: UpdateOrderStatusDTO,
  ) {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // Validate status transition
    if (order.status === OrderStatus.REJECTED) {
      throw new BadRequestException('Cannot update rejected order');
    }

    if (
      order.status === OrderStatus.DELIVERED &&
      body.status !== OrderStatus.DELIVERED
    ) {
      throw new BadRequestException('Cannot change status of delivered order');
    }

    const updateData: any = {
      status: body.status,
    };

    if (body.adminNote) {
      updateData.adminNote = body.adminNote;
    }

    if (body.status === OrderStatus.REJECTED) {
      // Refund if order was paid
      if (order.paymentMethod === 'card' && order.status === OrderStatus.PAID) {
        updateData.refundAmount = order.totalAmount;
        updateData.refundDate = new Date();
        // Note: You'll need to implement refund logic in StripeService
        // await this.stripeService.refund(order.intent as string);
      }
    }

    await this.orderRepository.updateOne({ _id: orderId }, updateData);

    return {
      success: true,
      message: `Order status updated to ${body.status}`,
      data: { orderId, newStatus: body.status },
    };
  }

  async getOrderStats() {
    // Optimized single aggregation pipeline to get all stats at once
    const pipeline = [
      {
        $facet: {
          // Get stats by status
          statusStats: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$totalAmount' },
              },
            },
          ],
          // Get total orders count
          totalCount: [{ $count: 'total' }],
          // Get total revenue from paid/delivered orders
          totalRevenue: [
            {
              $match: {
                status: { $in: [OrderStatus.PAID, OrderStatus.DELIVERED] },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$totalAmount' },
              },
            },
          ],
        },
      },
    ];

    const [result] = await this.orderRepository.aggregate(pipeline);

    return {
      success: true,
      data: {
        stats: result.statusStats,
        totalOrders: result.totalCount[0]?.total || 0,
        totalRevenue: result.totalRevenue[0]?.total || 0,
      },
    };
  }

  /**
   * دالة مساعدة لحساب الخصم وتطبيق الكوبون
   * @param couponCode - كود الكوبون
   * @param orderAmount - مبلغ الطلب الأصلي
   * @returns معلومات الخصم والمبلغ النهائي
   */
  private async applyCouponToOrder(couponCode: string, orderAmount: number) {
    try {
      // التحقق من صحة الكوبون
      const validationResult = await this.couponService.validateCoupon({
        code: couponCode,
        orderAmount: orderAmount,
      });

      if (!validationResult.success) {
        throw new BadRequestException('Invalid coupon');
      }

      const { coupon, discountAmount, finalAmount } = validationResult.data;

      // تطبيق الكوبون (زيادة عداد الاستخدام)
      await this.couponService.applyCoupon(coupon.id.toString());

      return {
        couponId: coupon.id,
        originalAmount: orderAmount,
        discountAmount: discountAmount,
        finalAmount: finalAmount,
        couponDetails: coupon,
      };
    } catch (error) {
      throw new BadRequestException(
        `Coupon application failed: ${error.message}`,
      );
    }
  }

  /**
   * إنشاء كوبون Stripe بناءً على نوع الخصم
   */
  private async createStripeCoupon(
    coupon: any,
    discountAmount: number,
    orderAmount: number,
    currency: string,
    orderId: Types.ObjectId,
  ) {
    const couponParams: any = {
      duration: 'once',
      name: `${coupon.name} - Order ${orderId}`,
      metadata: {
        orderId: orderId.toString(),
        couponId: coupon._id.toString(),
        couponCode: coupon.code,
      },
    };

    // تحديد نوع الخصم
    if (coupon.discountType === CouponType.PERCENTAGE) {
      // خصم بالنسبة المئوية
      couponParams.percent_off = coupon.discountValue;
    } else {
      // خصم بمبلغ ثابت
      couponParams.amount_off = Math.round(discountAmount * 100); // تحويل إلى cents
      couponParams.currency = currency;
    }

    return await this.stripeService.createCoupon(couponParams);
  }
}
