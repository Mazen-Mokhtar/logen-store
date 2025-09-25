import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TUser } from 'src/DB/models/User/user.schema';
import {
  CreateProductDTO,
  ParamProductDTO,
  QueryProductDTO,
  UpdateProductDTO,
} from './dto/index';
import { cloudService, IAttachments } from 'src/commen/multer/cloud.service';
import { ProductRepository } from 'src/DB/models/Product/product.repository';
import { FilterQuery } from 'mongoose';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly cloudService: cloudService,
  ) {}

  async create(
    user: TUser,
    body: CreateProductDTO,
    files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one product image is required');
    }

    // Check if product with same handle already exists
    if (await this.productRepository.findOne({ handle: body.handle })) {
      throw new ConflictException('Product handle already exists');
    }

    // Use crypto for secure random number generation
    const crypto = require('crypto');
    const folderId = crypto.randomInt(100000, 999999).toString();

    // Upload all images
    const images: IAttachments[] = [];
    for (const file of files) {
      const { secure_url, public_id } = await this.cloudService.uploadFile(
        file,
        {
          folder: `${process.env.APP_NAME}/Products/${folderId}`,
        },
      );
      images.push({ secure_url, public_id });
    }
    console.log({body})
    const product = await this.productRepository.create({
      handle: body.handle,
      title: body.title,
      description: body.description,
      price: body.price,
      images,
      tags: body.tags || [],
      category: body.category,
      inStock: body.inStock !== undefined ? body.inStock : true,
      promotion: body.promotion ? {
        ...body.promotion,
        saleEndDate: body.promotion.saleEndDate ? new Date(body.promotion.saleEndDate) : undefined
      } : { isOnSale: false },
      sizes: body.sizes || [],
      colors: body.colors || [],
      createdBy: user._id,
      folderId,
    });

    return { success: true, data: product };
  }

  async update(
    params: ParamProductDTO,
    body?: UpdateProductDTO,
    files?: Express.Multer.File[],
  ) {
    const product = await this.productRepository.findById(params.productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if handle is being updated and if it conflicts
    if (
      body?.handle &&
      (await this.productRepository.findOne({
        handle: body.handle,
        _id: { $ne: params.productId },
      }))
    ) {
      throw new ConflictException('Product handle already exists');
    }

    let images: IAttachments[] = product.images;

    // Handle new image uploads
    if (files && files.length > 0) {
      // Delete old images
      for (const image of product.images) {
        if (image.public_id) {
          await this.cloudService.destroyFile(image.public_id);
        }
      }

      // Upload new images
      images = [];
      for (const file of files) {
        const { secure_url, public_id } = await this.cloudService.uploadFile(
          file,
          {
            folder: `${process.env.APP_NAME}/Products/${product.folderId}`,
          },
        );
        images.push({ secure_url, public_id });
      }
    }

    const updateData: any = {};
    if (body?.title) updateData.title = body.title;
    if (body?.description) updateData.description = body.description;
    if (body?.price !== undefined) updateData.price = body.price;
    if (body?.tags) updateData.tags = body.tags;
    if (body?.category) updateData.category = body.category;
    if (body?.inStock !== undefined) updateData.inStock = body.inStock;
    if (body?.promotion) updateData.promotion = body.promotion;
    if (body?.sizes) updateData.sizes = body.sizes;
    if (body?.colors) updateData.colors = body.colors;
    if (body?.handle) updateData.handle = body.handle;
    updateData.images = images;

    await this.productRepository.updateOne({ _id: product._id }, updateData);

    return { success: true, message: 'Product updated successfully' };
  }

  async getProduct(params: ParamProductDTO) {
    const product = await this.productRepository.findById(params.productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await product.populate([
      { path: 'category', select: 'name slug type' },
      { path: 'createdBy', select: '-password' },
    ]);

    return { success: true, data: product };
  }

  async getProductByHandle(handle: string) {
    const product = await this.productRepository.findOne({ handle });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await product.populate([
      { path: 'category', select: 'name slug type' },
      { path: 'createdBy', select: '-password' },
    ]);

    return { success: true, data: product };
  }

  async getAllProducts(query: QueryProductDTO) {
    const filter: any = {};

    // Search by title
    if (query.search) {
      const sanitizedSearch = query.search.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );
      filter.$or = [
        { 'title.en': { $regex: sanitizedSearch, $options: 'i' } },
        { 'title.ar': { $regex: sanitizedSearch, $options: 'i' } },
        { tags: { $in: [new RegExp(sanitizedSearch, 'i')] } },
      ];
    }

    // Filter by category
    if (query.category) {
      filter.category = query.category;
    }

    // Filter by stock availability
    if (query.inStock !== undefined) {
      filter.inStock = query.inStock;
    }

    const options: any = {
      sort: query.sort || { createdAt: -1 },
      limit: query.limit ? parseInt(query.limit.toString()) : 20,
      skip: query.page
        ? (parseInt(query.page.toString()) - 1) *
          (query.limit ? parseInt(query.limit.toString()) : 20)
        : 0,
    };

    const products = await this.productRepository.find(
      filter,
      undefined,
      options,
    );

    // Populate category information
    for (const product of products) {
      await product.populate([{ path: 'category', select: 'name slug type' }]);
    }

    const total = await this.productRepository.countDocuments(filter);

    return {
      success: true,
      data: products,
      pagination: {
        total,
        page: query.page ? parseInt(query.page.toString()) : 1,
        limit: query.limit ? parseInt(query.limit.toString()) : 20,
        totalPages: Math.ceil(
          total / (query.limit ? parseInt(query.limit.toString()) : 20),
        ),
      },
    };
  }

  async deleteProduct(params: ParamProductDTO) {
    const product = await this.productRepository.findById(params.productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Delete all product images
    for (const image of product.images) {
      if (image.public_id) {
        await this.cloudService.destroyFile(image.public_id);
      }
    }

    await this.productRepository.deleteOne({ _id: product._id });

    return { success: true, message: 'Product deleted successfully' };
  }
}