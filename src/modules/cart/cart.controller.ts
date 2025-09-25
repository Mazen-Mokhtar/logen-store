import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/commen/Guards/auth.guard';
import { User } from 'src/commen/Decorator/user.decorator';
import { TUser } from 'src/DB/models/User/user.schema';
import { ApiResponseDto, ErrorResponseDto } from '../../common/dto/common-response.dto';
import { CartService } from './cart.service';
import {
  AddToCartDto,
  UpdateCartItemDto,
  RemoveFromCartDto,
  CartResponseDto,
} from './dto';

@ApiTags('Cart')
@Controller({ path: 'cart', version: '1' })
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({
    summary: 'Get User Cart',
    description: 'Retrieve the current user\'s shopping cart',
  })
  @ApiResponse({
    status: 200,
    description: 'Cart retrieved successfully',
    type: CartResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    type: ErrorResponseDto,
  })
  async getCart(@User() user: TUser) {
    const cart = await this.cartService.getCart(user._id.toString());
    return {
      success: true,
      message: 'Cart retrieved successfully',
      data: cart,
    };
  }

  @Post('add')
  @ApiOperation({
    summary: 'Add Item to Cart',
    description: 'Add a product to the user\'s shopping cart',
  })
  @ApiResponse({
    status: 201,
    description: 'Item added to cart successfully',
    type: CartResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    type: ErrorResponseDto,
  })
  async addToCart(
    @User() user: TUser,
    @Body(ValidationPipe) addToCartDto: AddToCartDto,
  ) {
    const cart = await this.cartService.addToCart(user._id.toString(), addToCartDto);
    return {
      success: true,
      message: 'Item added to cart successfully',
      data: cart,
    };
  }

  @Put('update')
  @ApiOperation({
    summary: 'Update Cart Item Quantity',
    description: 'Update the quantity of an item in the cart',
  })
  @ApiResponse({
    status: 200,
    description: 'Cart item updated successfully',
    type: CartResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Cart not found',
    type: ErrorResponseDto,
  })
  async updateCartItem(
    @User() user: TUser,
    @Body(ValidationPipe) updateCartItemDto: UpdateCartItemDto,
  ) {
    const cart = await this.cartService.updateItemQuantity(user._id.toString(), updateCartItemDto);
    return {
      success: true,
      message: 'Cart item updated successfully',
      data: cart,
    };
  }

  @Delete('remove')
  @ApiOperation({
    summary: 'Remove Item from Cart',
    description: 'Remove a specific item from the cart',
  })
  @ApiResponse({
    status: 200,
    description: 'Item removed from cart successfully',
    type: CartResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Cart not found',
    type: ErrorResponseDto,
  })
  async removeFromCart(
    @User() user: TUser,
    @Body(ValidationPipe) removeFromCartDto: RemoveFromCartDto,
  ) {
    const cart = await this.cartService.removeFromCart(user._id.toString(), removeFromCartDto);
    return {
      success: true,
      message: 'Item removed from cart successfully',
      data: cart,
    };
  }

  @Delete('clear')
  @ApiOperation({
    summary: 'Clear Cart',
    description: 'Remove all items from the cart',
  })
  @ApiResponse({
    status: 200,
    description: 'Cart cleared successfully',
    type: CartResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Cart not found',
    type: ErrorResponseDto,
  })
  async clearCart(@User() user: TUser) {
    const cart = await this.cartService.clearCart(user._id.toString());
    return {
      success: true,
      message: 'Cart cleared successfully',
      data: cart,
    };
  }

  @Get('totals')
  @ApiOperation({
    summary: 'Get Cart Totals',
    description: 'Get the total items count and total price of the cart',
  })
  @ApiResponse({
    status: 200,
    description: 'Cart totals retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            totalItems: { type: 'number' },
            totalPrice: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    type: ErrorResponseDto,
  })
  async getCartTotals(@User() user: TUser) {
    const totals = await this.cartService.getCartTotals(user._id.toString());
    return {
      success: true,
      message: 'Cart totals retrieved successfully',
      data: totals,
    };
  }
}