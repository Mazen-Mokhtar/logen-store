import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { OrderService } from './order.service';
import { User } from 'src/commen/Decorator/user.decorator';
import { TUser } from 'src/DB/models/User/user.schema';
import {
  CreateOrderDTO,
  CreateCartOrderDTO,
  OrderIdDTO,
  UpdateOrderStatusDTO,
  AdminOrderQueryDTO,
  UserOrderQueryDTO,
  TrackOrderDTO,
} from './dto';
import { Roles } from 'src/commen/Decorator/roles.decorator';
import { AuthGuard } from 'src/commen/Guards/auth.guard';
import { RolesGuard } from 'src/commen/Guards/role.guard';
import { Request } from 'express';
import { Types } from 'mongoose';
import { RoleTypes } from 'src/DB/models/User/user.schema';
import { cloudMulter } from 'src/commen/multer/cloud.multer';
import {
  ApiVersion,
  VersionedEndpoint,
} from 'src/commen/Decorator/api-version.decorator';

@ApiTags('Orders')
@ApiHeader({
  name: 'X-API-Version',
  description: 'API Version (v1 or v2)',
  required: false,
})
@UsePipes(new ValidationPipe({ whitelist: false, transform: true }))
@Controller({ path: 'order', version: '1' })
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiOperation({
    summary: 'Get order statistics',
    description:
      'Retrieve order statistics for admin dashboard. Requires admin privileges.',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'Order statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @Get('admin/stats')
  @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async getOrderStats() {
    return await this.orderService.getOrderStats();
  }
  @ApiOperation({
    summary: 'Track order by ID',
    description: 'Track an order using the last 8 characters of order ID. Email and phone are optional for additional verification. No authentication required.',
  })
  @ApiQuery({
    name: 'orderId',
    required: true,
    description: 'Last 8 characters of the Order ID (alphanumeric only)',
    type: String,
    example: 'a1b2c3d4',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Optional email address for additional verification',
    type: String,
  })
  @ApiQuery({
    name: 'phone',
    required: false,
    description: 'Optional phone number for additional verification',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Order details retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters or validation failed - Order ID must be exactly 8 alphanumeric characters',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - provided email or phone does not match order',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  @Get('track')
  async trackOrder(@Query() query: TrackOrderDTO) {
    return await this.orderService.trackOrder(query);
  }
  @ApiOperation({
    summary: 'Get user orders',
    description:
      'Retrieve orders for the authenticated user with optional filtering and pagination.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by order status',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'User orders retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @Get('/')
  @UseGuards(AuthGuard)
  @ApiVersion('v1', 'v2')
  async getOrders(@User() user: TUser, @Query() query: UserOrderQueryDTO) {
    return await this.orderService.getUserOrders(user._id, query);
  }

  @ApiOperation({
    summary: 'Get all orders (Admin)',
    description:
      'Retrieve all orders with filtering and pagination. Requires admin privileges.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by order status',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'All orders retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @Get('admin/all')
  @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async getAllOrders(@User() user: TUser, @Query() query: AdminOrderQueryDTO) {
    return await this.orderService.getAllOrders(query, user);
  }

  @ApiOperation({
    summary: 'Create new cart-based order',
    description:
      'Create a new order from cart items with shipping information. Supports coupon application via couponCode field.',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid order data or insufficient funds',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @Post('/cart')
  @UseGuards(AuthGuard)
  @VersionedEndpoint({
    versions: ['v1', 'v2'],
  })
  async createCartOrder(@User() user: TUser, @Body() body: CreateCartOrderDTO) {
    return await this.orderService.createCartOrder(user, body);
  }

  @ApiOperation({
    summary: 'Create new order',
    description:
      'Create a new order for the authenticated user. Supports coupon application via couponCode field.',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid order data or insufficient funds',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({ status: 404, description: 'Product or package not found' })
  @Post('/')
  @UseGuards(AuthGuard)
  @VersionedEndpoint({
    versions: ['v1', 'v2'],
  })
  async createOrder(@User() user: TUser, @Body() body: CreateOrderDTO) {
    // يدعم تطبيق الكوبونات عبر حقل couponCode في CreateOrderDTO
    return await this.orderService.createOrder(user, body);
  }

  @ApiOperation({
    summary: 'Payment webhook',
    description: 'Handle payment webhook notifications from payment providers.',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  @Post('/webhook')
  async webhook(@Req() req: Request) {
    return await this.orderService.webhook(req);
  }

  @ApiOperation({
    summary: 'Checkout order',
    description:
      'Process checkout for an existing order. Supports previously applied coupons.',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID to checkout' })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'Checkout processed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid order or insufficient funds',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - User role required' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Post('/:orderId/checkout')
  @Roles(['user', RoleTypes.SUPER_ADMIN, RoleTypes.ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async checkout(@User() user: TUser, @Param() param: OrderIdDTO) {
    // يدعم الكوبونات المطبقة مسبقاً على الطلب
    return await this.orderService.checkout(user, param.orderId);
  }

  @ApiOperation({
    summary: 'Cancel order',
    description: 'Cancel an existing order. Requires super admin privileges.',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID to cancel' })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super admin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled' })
  @Patch('/:orderId/cancel')
  @Roles([RoleTypes.SUPER_ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async cancelOrder(@User() user: TUser, @Param() param: OrderIdDTO) {
    return await this.orderService.cancelOrder(user, param.orderId);
  }

  @ApiOperation({
    summary: 'Get order details',
    description:
      'Retrieve detailed information about a specific order for the authenticated user.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Order ID to retrieve details for',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'Order details retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - User role required' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Get(':orderId')
  @Roles(['user'])
  @UseGuards(AuthGuard, RolesGuard)
  async getOrderDetails(@User() user: TUser, @Param() params: OrderIdDTO) {
    const orderId = new Types.ObjectId(params.orderId);
    return this.orderService.getOrderDetails(user, orderId);
  }

  // Admin Dashboard Endpoints
  @ApiOperation({
    summary: 'Get order by ID (Admin)',
    description:
      'Retrieve detailed information about any order by ID. Requires admin privileges.',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID to retrieve' })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'Order details retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Get('admin/:orderId')
  @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async getOrderById(@User() user: TUser, @Param() params: OrderIdDTO) {
    const orderId = new Types.ObjectId(params.orderId);
    return await this.orderService.getOrderById(orderId, user);
  }

  @ApiOperation({
    summary: 'Update order status (Admin)',
    description: 'Update the status of an order. Requires admin privileges.',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID to update status for' })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid status or order data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Patch('admin/:orderId/status')
  @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async updateOrderStatus(
    @User() admin: TUser,
    @Param() params: OrderIdDTO,
    @Body() body: UpdateOrderStatusDTO,
  ) {
    const orderId = new Types.ObjectId(params.orderId);
    return await this.orderService.updateOrderStatus(admin, orderId, body);
  }

  
}
