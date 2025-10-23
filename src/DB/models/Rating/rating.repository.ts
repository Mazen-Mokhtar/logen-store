import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DBService } from '../db.service';
import { Rating, TRating } from './rating.schema';

@Injectable()
export class RatingRepository extends DBService<TRating> {
  constructor(
    @InjectModel(Rating.name)
    private readonly ratingModel: Model<TRating>,
  ) {
    super(ratingModel);
  }

  // Get ratings for a specific product
  async getProductRatings(
    productId: string | Types.ObjectId,
    options: {
      page?: number;
      limit?: number;
      sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
      rating?: number;
      verifiedOnly?: boolean;
    } = {}
  ) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'newest',
      rating,
      verifiedOnly = false
    } = options;

    const filter: any = {
      productId: new Types.ObjectId(productId),
      isActive: true
    };

    if (rating) {
      filter.rating = rating;
    }

    if (verifiedOnly) {
      filter.isVerifiedPurchase = true;
    }

    let sort: any = {};
    switch (sortBy) {
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'highest':
        sort = { rating: -1, createdAt: -1 };
        break;
      case 'lowest':
        sort = { rating: 1, createdAt: -1 };
        break;
      case 'helpful':
        sort = { helpfulVotes: -1, createdAt: -1 };
        break;
    }

    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      this.ratingModel
        .find(filter)
        .populate('userId', 'userName email profileImage')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.ratingModel.countDocuments(filter)
    ]);

    return {
      ratings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get rating statistics for a product
  async getProductRatingStats(productId: string | Types.ObjectId) {
    const stats = await this.ratingModel.aggregate([
      {
        $match: {
          productId: new Types.ObjectId(productId),
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      },
      {
        $project: {
          _id: 0,
          averageRating: { $round: ['$averageRating', 1] },
          totalRatings: 1,
          ratingDistribution: {
            5: {
              $size: {
                $filter: {
                  input: '$ratingDistribution',
                  cond: { $eq: ['$$this', 5] }
                }
              }
            },
            4: {
              $size: {
                $filter: {
                  input: '$ratingDistribution',
                  cond: { $eq: ['$$this', 4] }
                }
              }
            },
            3: {
              $size: {
                $filter: {
                  input: '$ratingDistribution',
                  cond: { $eq: ['$$this', 3] }
                }
              }
            },
            2: {
              $size: {
                $filter: {
                  input: '$ratingDistribution',
                  cond: { $eq: ['$$this', 2] }
                }
              }
            },
            1: {
              $size: {
                $filter: {
                  input: '$ratingDistribution',
                  cond: { $eq: ['$$this', 1] }
                }
              }
            }
          }
        }
      }
    ]);

    return stats[0] || {
      averageRating: 0,
      totalRatings: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }

  // Check if user has already rated a product
  async hasUserRatedProduct(userId: string | Types.ObjectId, productId: string | Types.ObjectId) {
    const rating = await this.ratingModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId)
    });
    return !!rating;
  }

  // Get user's rating for a specific product
  async getUserProductRating(userId: string | Types.ObjectId, productId: string | Types.ObjectId) {
    return this.ratingModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId)
    });
  }

  // Add helpful vote to a rating
  async addHelpfulVote(ratingId: string | Types.ObjectId, userId: string | Types.ObjectId) {
    return this.ratingModel.findByIdAndUpdate(
      ratingId,
      {
        $addToSet: { helpfulBy: new Types.ObjectId(userId) },
        $inc: { helpfulVotes: 1 }
      },
      { new: true }
    );
  }

  // Remove helpful vote from a rating
  async removeHelpfulVote(ratingId: string | Types.ObjectId, userId: string | Types.ObjectId) {
    return this.ratingModel.findByIdAndUpdate(
      ratingId,
      {
        $pull: { helpfulBy: new Types.ObjectId(userId) },
        $inc: { helpfulVotes: -1 }
      },
      { new: true }
    );
  }
}