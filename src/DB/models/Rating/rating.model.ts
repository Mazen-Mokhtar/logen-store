import { MongooseModule } from '@nestjs/mongoose';
import { Rating, ratingSchema } from './rating.schema';

export const ratingModel = MongooseModule.forFeature([
  { name: Rating.name, schema: ratingSchema },
]);

export * from './rating.schema';
export * from './rating.repository';