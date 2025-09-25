import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { CheckoutRequestDTO, CheckoutResponseDTO } from './dto/checkout.dto';
import { AuthGuard } from 'src/commen/Guards/auth.guard';
import { User } from 'src/commen/Decorator/user.decorator';
import { TUser } from 'src/DB/models/User/user.schema';

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @ApiOperation({
    summary: 'Process checkout',
    description: 'Process checkout for both guest and registered users. Supports COD and online payment methods.',
  })
  @ApiBody({ type: CheckoutRequestDTO })
  @ApiResponse({
    status: 200,
    description: 'Checkout processed successfully',
    type: CheckoutResponseDTO,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid checkout data',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already registered or duplicate order',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Checkout processing failed',
  })
  @Post()
  @HttpCode(HttpStatus.OK)
  async processCheckout(
    @Body(ValidationPipe) checkoutData: CheckoutRequestDTO,
    @User() user?: TUser,
  ): Promise<CheckoutResponseDTO> {
    return await this.checkoutService.processCheckout(checkoutData, user);
  }

  @ApiOperation({
    summary: 'Process authenticated user checkout',
    description: 'Process checkout for authenticated users only. Requires valid JWT token.',
  })
  @ApiBearerAuth('JWT')
  @ApiBody({ type: CheckoutRequestDTO })
  @ApiResponse({
    status: 200,
    description: 'Checkout processed successfully',
    type: CheckoutResponseDTO,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid checkout data',
  })
  @Post('authenticated')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async processAuthenticatedCheckout(
    @Body(ValidationPipe) checkoutData: CheckoutRequestDTO,
    @User() user: TUser,
  ): Promise<CheckoutResponseDTO> {
    return await this.checkoutService.processCheckout(checkoutData, user);
  }

  @ApiOperation({
    summary: 'Get order status',
    description: 'Get the current status of an order by order ID.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Order ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Order status retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid order ID',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  @Get('order/:orderId/status')
  async getOrderStatus(@Param('orderId') orderId: string) {
    return await this.checkoutService.getOrderStatus(orderId);
  }

  @ApiOperation({
    summary: 'Get authenticated user order status',
    description: 'Get the current status of an order for authenticated user.',
  })
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'orderId',
    description: 'Order ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Order status retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid order ID',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  @Get('order/:orderId/status/authenticated')
  @UseGuards(AuthGuard)
  async getAuthenticatedUserOrderStatus(
    @Param('orderId') orderId: string,
    @User() user: TUser,
  ) {
    return await this.checkoutService.getOrderStatus(orderId, user._id.toString());
  }
}