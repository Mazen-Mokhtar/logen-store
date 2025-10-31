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
  BulkCreateProductDTO,
} from './dto/index';
import { cloudService, IAttachments } from 'src/commen/multer/cloud.service';
import { ProductRepository } from 'src/DB/models/Product/product.repository';
import { RatingRepository } from 'src/DB/models/Rating/rating.repository';
import { FilterQuery, Types } from 'mongoose';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly cloudService: cloudService,
    private readonly ratingRepository: RatingRepository,
  ) {}

  private decodeHtmlEntities(text: string): string {
    const entities = {
      '&#x2F;': '/',
      '&#x3D;': '=',
      '&#x3F;': '?',
      '&#x26;': '&',
      '&#x3A;': ':',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
    };
    
    return text.replace(/&#x2F;|&#x3D;|&#x3F;|&#x26;|&#x3A;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (match) => entities[match] || match);
  }

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
      currency: body.currency || 'USD',
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
      warranty: body.warranty || { hasWarranty: false },
      createdBy: user._id,
      folderId,
    });

    return { success: true, data: product };
  }

  async bulkCreate(user: TUser, body: BulkCreateProductDTO) {
    const results: any[] = [];
    const errors: any[] = [];

    // Check for duplicate handles in the request
    const handles = body.products.map(product => product.handle);
    const duplicateHandles = handles.filter((handle, index) => handles.indexOf(handle) !== index);
    if (duplicateHandles.length > 0) {
      throw new BadRequestException(`Duplicate handles found in request: ${duplicateHandles.join(', ')}`);
    }

    // Check if any handles already exist in database
    const existingProducts = await this.productRepository.find({ 
      handle: { $in: handles } 
    });
    if (existingProducts.length > 0) {
      const existingHandles = existingProducts.map(p => p.handle);
      throw new ConflictException(`Product handles already exist: ${existingHandles.join(', ')}`);
    }

    // Process each product
    for (const productData of body.products) {
      try {
        // Validate that imageUrls are provided
        if (!productData.imageUrls || productData.imageUrls.length === 0) {
          throw new BadRequestException(`At least one image URL is required for product: ${productData.handle}`);
        }

        // Use crypto for secure random number generation
        const crypto = require('crypto');
        const folderId = crypto.randomInt(100000, 999999).toString();

        // Convert image URLs to IAttachments format and decode HTML entities
        const images: IAttachments[] = productData.imageUrls.map((url, index) => ({
          secure_url: this.decodeHtmlEntities(url),
          public_id: `${productData.handle}_image_${index + 1}_${Date.now()}`,
        }));

        // Validate category ID
        if (!Types.ObjectId.isValid(productData.category)) {
          throw new BadRequestException(`Invalid category ID for product: ${productData.handle}`);
        }

        const product = await this.productRepository.create({
          handle: productData.handle,
          title: {
            en: productData.title,
            ar: productData.title
          },
          description: {
            en: productData.description,
            ar: productData.description
          },
          price: productData.price,
          currency: productData.currency || 'USD',
          images,
          tags: productData.tags || [],
          category: new Types.ObjectId(productData.category),
          inStock: productData.inStock !== undefined ? productData.inStock : true,
          promotion: productData.promotion ? {
            ...productData.promotion,
            saleEndDate: productData.promotion.saleEndDate ? new Date(productData.promotion.saleEndDate) : undefined
          } : { isOnSale: false },
          sizes: productData.sizes ? productData.sizes.map(size => ({ name: size, available: true })) : [],
          colors: productData.colors ? productData.colors.map(color => ({ name: color, available: true })) : [],
          warranty: productData.warranty || { hasWarranty: false },
          createdBy: user._id,
          folderId,
        });

        results.push({
          success: true,
          handle: productData.handle,
          data: product
        });

      } catch (error: any) {
        errors.push({
          success: false,
          handle: productData.handle,
          error: error.message
        });
      }
    }

    return {
      success: errors.length === 0,
      message: `Processed ${body.products.length} products. ${results.length} successful, ${errors.length} failed.`,
      results,
      errors: errors.length > 0 ? errors : undefined
    };
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
    if (body?.currency) updateData.currency = body.currency;
    if (body?.tags) updateData.tags = body.tags;
    if (body?.category) updateData.category = body.category;
    if (body?.inStock !== undefined) updateData.inStock = body.inStock;
    if (body?.promotion) updateData.promotion = body.promotion;
    if (body?.sizes) updateData.sizes = body.sizes;
    if (body?.colors) updateData.colors = body.colors;
    if (body?.warranty) updateData.warranty = body.warranty;
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

    // Get rating statistics
    const ratingStats = await this.ratingRepository.getProductRatingStats(params.productId);

    return { 
      success: true, 
      data: {
        ...product.toObject(),
        ratingStats
      }
    };
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

    // Get rating statistics
    const ratingStats = await this.ratingRepository.getProductRatingStats(product._id);

    return { 
      success: true, 
      data: {
        ...product.toObject(),
        ratingStats
      }
    };
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
      filter.category = new Types.ObjectId(query.category);
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

    // Populate category information and add rating statistics
    for (const product of products) {
      await product.populate([{ path: 'category', select: 'name slug type' }]);
      
      // Add rating statistics
      const ratingStats = await this.ratingRepository.getProductRatingStats(product._id);
      (product as any).ratingStats = ratingStats;
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

  async getRelatedProducts(params: ParamProductDTO, limit?: number) {
    const product = await this.productRepository.findById(params.productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const limitValue = limit || 4;

    // Find related products based on category and tags
    const filter: any = {
      _id: { $ne: params.productId }, // Exclude the current product
      $or: [
        { category: product.category }, // Same category
        { tags: { $in: product.tags } }, // Similar tags
      ],
      inStock: true, // Only show products in stock
    };

    const relatedProducts = await this.productRepository.find(
      filter,
      undefined,
      {
        limit: limitValue,
        sort: { createdAt: -1 },
      },
    );

    // Populate category information and add rating statistics
    for (const relatedProduct of relatedProducts) {
      await relatedProduct.populate([{ path: 'category', select: 'name slug type' }]);
      
      // Add rating statistics
      const ratingStats = await this.ratingRepository.getProductRatingStats(relatedProduct._id);
      (relatedProduct as any).ratingStats = ratingStats;
    }

    return {
      success: true,
      data: relatedProducts,
    };
  }
}