import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TUser } from 'src/DB/models/User/user.schema';
import { RatingRepository } from 'src/DB/models/Rating/rating.repository';
import { ProductRepository } from 'src/DB/models/Product/product.repository';
import { OrderRepository } from 'src/DB/models/Order/order.repository';
import {
  CreateRatingDTO,
  UpdateRatingDTO,
  ParamRatingDTO,
  ParamProductRatingDTO,
  QueryRatingDTO,
  HelpfulVoteDTO,
} from './dto/index';
import { Types } from 'mongoose';

@Injectable()
export class RatingService {
  constructor(
    private readonly ratingRepository: RatingRepository,
    private readonly productRepository: ProductRepository,
    private readonly orderRepository: OrderRepository,
  ) {}

  async createRating(user: TUser, body: CreateRatingDTO) {
    // Check if product exists
    const product = await this.productRepository.findById(body.productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if user has already rated this product
    const existingRating = await this.ratingRepository.hasUserRatedProduct(
      user._id,
      body.productId
    );
    if (existingRating) {
      throw new ConflictException('You have already rated this product');
    }

    // Check if user has purchased this product (for verified purchase flag)
    const hasPurchased = await this.checkUserPurchase(user._id, body.productId);

    // Additional security: Rate limiting check (business logic level)
    const recentRatings = await this.ratingRepository.find({
      userId: user._id,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
    });

    if (recentRatings.length >= 50) {
      throw new BadRequestException('Too many ratings in the last 24 hours');
    }

    // Create the rating
    const rating = await this.ratingRepository.create({
      userId: user._id,
      productId: new Types.ObjectId(body.productId),
      rating: body.rating,
      comment: body.comment,
      isVerifiedPurchase: hasPurchased,
    });

    return this.ratingRepository.mongooseModel
      .findById(rating._id)
      .populate('userId', 'userName email profileImage')
      .exec();
  }

  async updateRating(user: TUser, params: ParamRatingDTO, body: UpdateRatingDTO) {
    const rating = await this.ratingRepository.findById(params.id);
    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    // Check if user owns this rating
    if (rating.userId.toString() !== user._id.toString()) {
      throw new ForbiddenException('You can only update your own ratings');
    }

    // Update the rating
    const updatedRating = await this.ratingRepository.findByIdAndUpdate(
      params.id,
      {
        ...(body.rating && { rating: body.rating }),
        ...(body.comment && { comment: body.comment }),
      },
      { new: true }
    );

    if (!updatedRating) {
      throw new NotFoundException('Failed to update rating');
    }

    return this.ratingRepository.mongooseModel
      .findById(updatedRating._id)
      .populate('userId', 'userName email profileImage')
      .exec();
  }

  async deleteRating(user: TUser, params: ParamRatingDTO) {
    const rating = await this.ratingRepository.findById(params.id);
    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    // Check if user owns this rating
    if (rating.userId.toString() !== user._id.toString()) {
      throw new ForbiddenException('You can only delete your own ratings');
    }

    // Soft delete by setting isActive to false
    await this.ratingRepository.findByIdAndUpdate(params.id, { isActive: false });

    return { message: 'Rating deleted successfully' };
  }

  async getProductRatings(params: ParamProductRatingDTO, query: QueryRatingDTO) {
    // Check if product exists
    const product = await this.productRepository.findById(params.productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.ratingRepository.getProductRatings(params.productId, {
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      rating: query.rating,
      verifiedOnly: query.verifiedOnly,
    });
  }

  async getProductRatingStats(params: ParamProductRatingDTO) {
    // Check if product exists
    const product = await this.productRepository.findById(params.productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.ratingRepository.getProductRatingStats(params.productId);
  }

  async getUserRatings(user: TUser, query: QueryRatingDTO) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const filter = {
      userId: user._id,
      isActive: true,
    };

    const [ratings, total] = await Promise.all([
      this.ratingRepository.mongooseModel
        .find(filter)
        .populate('productId', 'title images price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.ratingRepository.countDocuments(filter),
    ]);

    return {
      ratings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserProductRating(user: TUser, params: ParamProductRatingDTO) {
    const rating = await this.ratingRepository.getUserProductRating(
      user._id,
      params.productId
    );

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    return rating;
  }

  async addHelpfulVote(user: TUser, body: HelpfulVoteDTO) {
    const rating = await this.ratingRepository.findById(body.ratingId);
    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    // Check if user has already voted
    if (rating.helpfulBy.includes(user._id)) {
      throw new ConflictException('You have already voted for this rating');
    }

    // Users cannot vote for their own ratings
    if (rating.userId.toString() === user._id.toString()) {
      throw new BadRequestException('You cannot vote for your own rating');
    }

    return this.ratingRepository.addHelpfulVote(body.ratingId, user._id);
  }

  async removeHelpfulVote(user: TUser, body: HelpfulVoteDTO) {
    const rating = await this.ratingRepository.findById(body.ratingId);
    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    // Check if user has voted
    if (!rating.helpfulBy.includes(user._id)) {
      throw new BadRequestException('You have not voted for this rating');
    }

    return this.ratingRepository.removeHelpfulVote(body.ratingId, user._id);
  }

  private async checkUserPurchase(userId: Types.ObjectId, productId: string): Promise<boolean> {
    try {
      // Check if user has any completed orders containing this product
      const orders = await this.orderRepository.find({
        userId: userId,
        status: { $in: ['delivered', 'paid'] },
        $or: [
          { productId: productId },
          { 'items.id': productId }
        ]
      });

      return orders.length > 0;
    } catch (error) {
      // If there's an error checking orders, default to false
      return false;
    }
  }
}