import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, TCart, ICartItem } from './cart.schema';

@Injectable()
export class cartRepository {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<TCart>,
  ) {}

  // Get cart by user ID
  async getCartByUserId(userId: string): Promise<TCart | null> {
    return await this.cartModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
  }

  // Create new cart for user
  async createCart(userId: string): Promise<TCart> {
    const newCart = new this.cartModel({
      userId: new Types.ObjectId(userId),
      items: [],
      totalItems: 0,
      totalPrice: 0,
    });
    return await newCart.save();
  }

  // Add item to cart
  async addItemToCart(userId: string, item: ICartItem): Promise<TCart> {
    const cart = await this.getCartByUserId(userId);
    
    if (!cart) {
      const newCart = await this.createCart(userId);
      newCart.items.push(item);
      return await newCart.save();
    }

    // Check if item already exists (same product, size, color)
    const existingItemIndex = cart.items.findIndex(
      (cartItem) =>
        cartItem.productId.toString() === item.productId.toString() &&
        cartItem.size === item.size &&
        cartItem.color === item.color
    );

    if (existingItemIndex > -1) {
      // Update quantity if item exists
      cart.items[existingItemIndex].quantity += item.quantity;
    } else {
      // Add new item
      cart.items.push(item);
    }

    return await cart.save();
  }

  // Update item quantity
  async updateItemQuantity(
    userId: string,
    productId: string,
    quantity: number,
    size?: string,
    color?: string
  ): Promise<TCart | null> {
    const cart = await this.getCartByUserId(userId);
    if (!cart) return null;

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (itemIndex > -1) {
      if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }
      return await cart.save();
    }

    return cart;
  }

  // Remove item from cart
  async removeItemFromCart(
    userId: string,
    productId: string,
    size?: string,
    color?: string
  ): Promise<TCart | null> {
    const cart = await this.getCartByUserId(userId);
    if (!cart) return null;

    cart.items = cart.items.filter(
      (item) =>
        !(item.productId.toString() === productId &&
          item.size === size &&
          item.color === color)
    );

    return await cart.save();
  }

  // Clear entire cart
  async clearCart(userId: string): Promise<TCart | null> {
    const cart = await this.getCartByUserId(userId);
    if (!cart) return null;

    cart.items = [];
    return await cart.save();
  }

  // Delete cart
  async deleteCart(userId: string): Promise<boolean> {
    const result = await this.cartModel.deleteOne({ userId: new Types.ObjectId(userId) }).exec();
    return result.deletedCount > 0;
  }
}