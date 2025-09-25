import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { cartRepository } from 'src/DB/models/Cart/cart.repository';
import { TCart, ICartItem } from 'src/DB/models/Cart/cart.schema';
import { AddToCartDto, UpdateCartItemDto, RemoveFromCartDto, CartResponseDto } from './dto';
import { Types } from 'mongoose';

@Injectable()
export class CartService {
  constructor(private readonly cartRepository: cartRepository) {}

  // Get user's cart
  async getCart(userId: string): Promise<CartResponseDto | null> {
    const cart = await this.cartRepository.getCartByUserId(userId);
    
    if (!cart) {
      // Create empty cart if doesn't exist
      const newCart = await this.cartRepository.createCart(userId);
      return this.mapCartToResponse(newCart);
    }

    return this.mapCartToResponse(cart);
  }

  // Add item to cart
  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<CartResponseDto> {
    try {
      const cartItem: ICartItem = {
        productId: new Types.ObjectId(addToCartDto.productId),
        title: addToCartDto.title,
        price: addToCartDto.price,
        image: addToCartDto.image,
        quantity: addToCartDto.quantity,
        size: addToCartDto.size,
        color: addToCartDto.color,
      };

      const updatedCart = await this.cartRepository.addItemToCart(userId, cartItem);
      return this.mapCartToResponse(updatedCart);
    } catch (error) {
      throw new BadRequestException('Failed to add item to cart');
    }
  }

  // Update item quantity
  async updateItemQuantity(userId: string, updateCartItemDto: UpdateCartItemDto): Promise<CartResponseDto> {
    try {
      const updatedCart = await this.cartRepository.updateItemQuantity(
        userId,
        updateCartItemDto.productId,
        updateCartItemDto.quantity,
        updateCartItemDto.size,
        updateCartItemDto.color
      );

      if (!updatedCart) {
        throw new NotFoundException('Cart not found');
      }

      return this.mapCartToResponse(updatedCart);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update item quantity');
    }
  }

  // Remove item from cart
  async removeFromCart(userId: string, removeFromCartDto: RemoveFromCartDto): Promise<CartResponseDto> {
    try {
      const updatedCart = await this.cartRepository.removeItemFromCart(
        userId,
        removeFromCartDto.productId,
        removeFromCartDto.size,
        removeFromCartDto.color
      );

      if (!updatedCart) {
        throw new NotFoundException('Cart not found');
      }

      return this.mapCartToResponse(updatedCart);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to remove item from cart');
    }
  }

  // Clear entire cart
  async clearCart(userId: string): Promise<CartResponseDto> {
    try {
      const clearedCart = await this.cartRepository.clearCart(userId);
      
      if (!clearedCart) {
        throw new NotFoundException('Cart not found');
      }

      return this.mapCartToResponse(clearedCart);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to clear cart');
    }
  }

  // Get cart totals
  async getCartTotals(userId: string): Promise<{ totalItems: number; totalPrice: number }> {
    const cart = await this.cartRepository.getCartByUserId(userId);
    
    if (!cart) {
      return { totalItems: 0, totalPrice: 0 };
    }

    return {
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
    };
  }

  // Helper method to map cart to response DTO
  private mapCartToResponse(cart: TCart): CartResponseDto {
    return {
      _id: cart._id.toString(),
      userId: cart.userId.toString(),
      items: cart.items.map(item => ({
        productId: item.productId.toString(),
        title: item.title,
        price: item.price,
        image: item.image,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      })),
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}