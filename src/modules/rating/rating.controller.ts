import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RatingService } from './rating.service';
import { AuthGuard } from 'src/commen/Guards/auth.guard';
import { RatingOwnershipGuard } from './guards/rating-ownership.guard';
import { RatingSanitizationInterceptor } from './interceptors/rating-sanitization.interceptor';
import { User } from 'src/commen/Decorator/user.decorator';
import { TUser } from 'src/DB/models/User/user.schema';
import {
  CreateRatingDTO,
  UpdateRatingDTO,
  ParamRatingDTO,
  ParamProductRatingDTO,
  QueryRatingDTO,
  HelpfulVoteDTO,
} from './dto/index';
import { ApiResponseDto } from 'src/common/dto/common-response.dto';

@ApiTags('Reviews')
@Controller({ path: 'ratings', version: '1' })
@UseInterceptors(RatingSanitizationInterceptor)
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 ratings per minute per user
  @ApiOperation({ summary: 'Create a new rating for a product' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Rating created successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User has already rated this product',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  async createRating(
    @User() user: TUser,
    @Body() body: CreateRatingDTO,
  ) {
    const rating = await this.ratingService.createRating(user, body);
    return {
      success: true,
      message: 'Rating created successfully',
      data: rating,
    };
  }

  @Put(':id')
  @UseGuards(AuthGuard, RatingOwnershipGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 updates per minute per user
  @ApiOperation({ summary: 'Update user rating' })
  @ApiParam({ name: 'id', description: 'Rating ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rating updated successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Rating not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You can only update your own ratings',
  })
  async updateRating(
    @User() user: TUser,
    @Param() params: ParamRatingDTO,
    @Body() body: UpdateRatingDTO,
  ) {
    const rating = await this.ratingService.updateRating(user, params, body);
    return {
      success: true,
      message: 'Rating updated successfully',
      data: rating,
    };
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RatingOwnershipGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user rating' })
  @ApiParam({ name: 'id', description: 'Rating ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rating deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Rating not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You can only delete your own ratings',
  })
  async deleteRating(
    @User() user: TUser,
    @Param() params: ParamRatingDTO,
  ) {
    const result = await this.ratingService.deleteRating(user, params);
    return {
      success: true,
      message: result.message,
    };
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get all ratings for a product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort by' })
  @ApiQuery({ name: 'rating', required: false, description: 'Filter by rating value' })
  @ApiQuery({ name: 'verifiedOnly', required: false, description: 'Show only verified purchases' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product ratings retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  async getProductRatings(
    @Param() params: ParamProductRatingDTO,
    @Query() query: QueryRatingDTO,
  ) {
    const result = await this.ratingService.getProductRatings(params, query);
    return {
      success: true,
      message: 'Product ratings retrieved successfully',
      data: result,
    };
  }

  @Get('product/:productId/stats')
  @ApiOperation({ summary: 'Get rating statistics for a product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product rating statistics retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  async getProductRatingStats(@Param() params: ParamProductRatingDTO) {
    const stats = await this.ratingService.getProductRatingStats(params);
    return {
      success: true,
      message: 'Product rating statistics retrieved successfully',
      data: stats,
    };
  }

  @Get('my-ratings')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user ratings' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User ratings retrieved successfully',
    type: ApiResponseDto,
  })
  async getUserRatings(
    @User() user: TUser,
    @Query() query: QueryRatingDTO,
  ) {
    const result = await this.ratingService.getUserRatings(user, query);
    return {
      success: true,
      message: 'User ratings retrieved successfully',
      data: result,
    };
  }

  @Get('my-rating/product/:productId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user rating for a specific product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User product rating retrieved successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Rating not found',
  })
  async getUserProductRating(
    @User() user: TUser,
    @Param() params: ParamProductRatingDTO,
  ) {
    const rating = await this.ratingService.getUserProductRating(user, params);
    return {
      success: true,
      message: 'User product rating retrieved successfully',
      data: rating,
    };
  }

  @Post('helpful-vote')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 helpful votes per minute per user
  @ApiOperation({ summary: 'Add helpful vote to a rating' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Helpful vote added successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Rating not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'You have already voted for this rating',
  })
  async addHelpfulVote(
    @User() user: TUser,
    @Body() body: HelpfulVoteDTO,
  ) {
    const rating = await this.ratingService.addHelpfulVote(user, body);
    return {
      success: true,
      message: 'Helpful vote added successfully',
      data: rating,
    };
  }

  @Delete('helpful-vote')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove helpful vote from a rating' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Helpful vote removed successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Rating not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'You have not voted for this rating',
  })
  async removeHelpfulVote(
    @User() user: TUser,
    @Body() body: HelpfulVoteDTO,
  ) {
    const rating = await this.ratingService.removeHelpfulVote(user, body);
    return {
      success: true,
      message: 'Helpful vote removed successfully',
      data: rating,
    };
  }
}