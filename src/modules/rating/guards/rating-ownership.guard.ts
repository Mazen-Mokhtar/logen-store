import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RatingRepository } from 'src/DB/models/Rating/rating.repository';
import { AuthGuard } from 'src/commen/Guards/auth.guard';

@Injectable()
export class RatingOwnershipGuard implements CanActivate {
  constructor(private readonly ratingRepository: RatingRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const ratingId = request.params.id;

    if (!user || !ratingId) {
      throw new ForbiddenException('Access denied');
    }

    try {
      const rating = await this.ratingRepository.findById(ratingId);
      
      if (!rating) {
        throw new NotFoundException('Rating not found');
      }

      // Check if the user owns this rating
      if (rating.userId.toString() !== user._id.toString()) {
        throw new ForbiddenException('You can only modify your own ratings');
      }

      return true;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Access denied');
    }
  }
}