import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/commen/Guards/auth.guard';
import { RolesGuard } from 'src/commen/Guards/role.guard';
import { Roles } from 'src/commen/Decorator/roles.decorator';
import { User } from 'src/commen/Decorator/user.decorator';
import { TUser } from 'src/DB/models/User/user.schema';
import { cloudMulter } from 'src/commen/multer/cloud.multer';
import { ApiResponseDto, ErrorResponseDto } from '../../common/dto/common-response.dto';
import { ProductService } from './product.service';
import {
  CreateProductDTO,
  UpdateProductDTO,
  ParamProductDTO,
  QueryProductDTO,
  BulkCreateProductDTO,
} from './dto';
import { PRODUCT_CONSTANTS } from './product.constants';
import { ProductSwaggerSchemas, ProductApiResponses, ProductQueryParams, ProductPathParams } from './product.swagger';

@ApiTags('Products')
@Controller({ path: PRODUCT_CONSTANTS.BASE_PATH, version: PRODUCT_CONSTANTS.API_VERSION })
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles([PRODUCT_CONSTANTS.ROLES.ADMIN, PRODUCT_CONSTANTS.ROLES.MODERATOR])
  @UseInterceptors(FilesInterceptor('images', PRODUCT_CONSTANTS.MAX_FILES, cloudMulter()))
  @ApiOperation({
    summary: 'Create Product',
    description: 'Create a new product with images (Admin/Super Admin only)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Product creation data with images',
    schema: {
      type: 'object',
      properties: {
        handle: { type: 'string', description: 'Product handle/slug' },
        title: {
          type: 'object',
          properties: {
            en: { type: 'string', description: 'English title' },
            ar: { type: 'string', description: 'Arabic title' },
          },
        },
        description: {
          type: 'object',
          properties: {
            en: { type: 'string', description: 'English description' },
            ar: { type: 'string', description: 'Arabic description' },
          },
        },
        price: { type: 'number', description: 'Product price' },
        currency: { 
          type: 'string', 
          description: 'Product currency',
          enum: ['USD', 'EUR', 'EGP', 'SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD'],
          default: 'USD'
        },
        category: { type: 'string', description: 'Category ID' },
        tags: { type: 'array', items: { type: 'string' } },
        inStock: { type: 'boolean', description: 'Stock availability' },
        promotion: {
          type: 'object',
          properties: {
            isOnSale: { type: 'boolean' },
            originalPrice: { type: 'number' },
            salePrice: { type: 'number' },
            saleEndDate: { type: 'string', format: 'date-time' },
          },
        },
        sizes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              available: { type: 'boolean' },
            },
          },
        },
        colors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              hex: { type: 'string' },
              available: { type: 'boolean' },
            },
          },
        },
        warranty: {
          type: 'object',
          properties: {
            hasWarranty: { type: 'boolean', description: 'Whether product has warranty' },
            warrantyPeriod: { type: 'number', description: 'Warranty period in months' },
            warrantyType: { 
              type: 'string', 
              enum: ['manufacturer', 'seller', 'extended'],
              description: 'Type of warranty'
            },
            warrantyDescription: {
              type: 'object',
              properties: {
                en: { type: 'string', description: 'English warranty description' },
                ar: { type: 'string', description: 'Arabic warranty description' },
              },
            },
          },
        },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Product images (max 10 files)',
        },
      },
      required: ['handle', 'title', 'description', 'price', 'category', 'images'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or missing images',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Product handle already exists',
    type: ErrorResponseDto,
  })
  async createProduct(
    @User() user: TUser,
    @Body() createProductDto: CreateProductDTO,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    console.log('Raw createProductDto before transformation:', JSON.stringify(createProductDto, null, 2));
    console.log('Type of sizes:', typeof createProductDto.sizes);
    console.log('Type of colors:', typeof createProductDto.colors);
    console.log('Sizes value:', createProductDto.sizes);
    console.log('Colors value:', createProductDto.colors);
    
    // Transform multipart/form-data fields to proper types
    // this.transformMultipartData(createProductDto);
    
    return this.productService.create(user, createProductDto, files);
  }

  @Post('bulk')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles([PRODUCT_CONSTANTS.ROLES.ADMIN, PRODUCT_CONSTANTS.ROLES.MODERATOR])
  @ApiOperation({
    summary: 'Bulk Create Products',
    description: 'Create multiple products at once with pre-uploaded image URLs (Admin/Super Admin only)',
  })
  @ApiConsumes('application/json')
  @ApiBody({
    description: 'Bulk product creation data with pre-uploaded image URLs',
    schema: {
      type: 'object',
      properties: {
        products: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              handle: { type: 'string', description: 'Product handle/slug' },
              title: {
                type: 'object',
                properties: {
                  en: { type: 'string', description: 'English title' },
                  ar: { type: 'string', description: 'Arabic title' },
                },
              },
              description: {
                type: 'object',
                properties: {
                  en: { type: 'string', description: 'English description' },
                  ar: { type: 'string', description: 'Arabic description' },
                },
              },
              price: { type: 'number', description: 'Product price' },
              currency: { 
                type: 'string', 
                description: 'Product currency',
                enum: ['USD', 'EUR', 'EGP', 'SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD'],
                default: 'USD'
              },
              category: { type: 'string', description: 'Category ID' },
              tags: { type: 'array', items: { type: 'string' } },
              inStock: { type: 'boolean', description: 'Stock availability' },
              promotion: {
                type: 'object',
                properties: {
                  isOnSale: { type: 'boolean' },
                  originalPrice: { type: 'number' },
                  salePrice: { type: 'number' },
                  saleEndDate: { type: 'string', format: 'date-time' },
                },
              },
              sizes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    available: { type: 'boolean' },
                  },
                },
              },
              colors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    hex: { type: 'string' },
                    available: { type: 'boolean' },
                  },
                },
              },
              warranty: {
                type: 'object',
                properties: {
                  hasWarranty: { type: 'boolean', description: 'Whether product has warranty' },
                  warrantyPeriod: { type: 'number', description: 'Warranty period in months' },
                  warrantyType: { 
                    type: 'string', 
                    enum: ['manufacturer', 'seller', 'extended'],
                    description: 'Type of warranty'
                  },
                  warrantyDescription: {
                    type: 'object',
                    properties: {
                      en: { type: 'string', description: 'English warranty description' },
                      ar: { type: 'string', description: 'Arabic warranty description' },
                    },
                  },
                },
              },
              imageUrls: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of pre-uploaded image URLs',
              },
            },
            required: ['handle', 'title', 'description', 'price', 'category', 'imageUrls'],
          },
        },
      },
      required: ['products'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Products created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              handle: { type: 'string' },
              data: { type: 'object' },
            },
          },
        },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              handle: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or duplicate handles',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Product handles already exist',
    type: ErrorResponseDto,
  })
  async bulkCreateProducts(
    @User() user: TUser,
    @Body() bulkCreateProductDto: BulkCreateProductDTO,
  ) {
    return this.productService.bulkCreate(user, bulkCreateProductDto);
  }

  /**
   * Transform multipart/form-data fields to proper types
   * Handles JSON strings and type conversions for form data
   */
  private transformMultipartData(data: any): void {
    try {
      // Parse JSON string fields
      const jsonFields = ['sizes', 'colors', 'tags'];
      jsonFields.forEach(field => {
        if (typeof data[field] === 'string') {
          console.log(`Original ${field} string:`, data[field]);
          data[field] = JSON.parse(data[field]);
          console.log(`Parsed ${field}:`, JSON.stringify(data[field], null, 2));
        } else if (Array.isArray(data[field]) && data[field].length > 0 && typeof data[field][0] === 'object' && Object.keys(data[field][0]).length === 0) {
          // Handle case where multipart parser creates empty objects
          console.log(`${field} contains empty objects, setting to empty array`);
          data[field] = [];
        }
      });
      
      // Convert string booleans
      const booleanFields = ['inStock'];
      booleanFields.forEach(field => {
        if (typeof data[field] === 'string') {
          data[field] = data[field] === 'true';
        }
      });
      
      // Convert string numbers
      const numberFields = ['price'];
      numberFields.forEach(field => {
        if (typeof data[field] === 'string') {
          data[field] = parseFloat(data[field]);
        }
      });
      
      // Handle promotion object
      if (data.promotion) {
        if (typeof data.promotion.isOnSale === 'string') {
          data.promotion.isOnSale = data.promotion.isOnSale === 'true';
        }
        if (typeof data.promotion.originalPrice === 'string') {
          data.promotion.originalPrice = parseFloat(data.promotion.originalPrice);
        }
        if (typeof data.promotion.salePrice === 'string') {
          data.promotion.salePrice = parseFloat(data.promotion.salePrice);
        }
      }

      // Handle warranty object
      if (data.warranty) {
        if (typeof data.warranty === 'string') {
          data.warranty = JSON.parse(data.warranty);
        }
        if (typeof data.warranty.hasWarranty === 'string') {
          data.warranty.hasWarranty = data.warranty.hasWarranty === 'true';
        }
        if (typeof data.warranty.warrantyPeriod === 'string') {
          data.warranty.warrantyPeriod = parseInt(data.warranty.warrantyPeriod);
        }
      }
      
    } catch (error) {
      throw new Error('Invalid JSON format in request data');
    }
  }
  @Put(':productId')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles([PRODUCT_CONSTANTS.ROLES.ADMIN, PRODUCT_CONSTANTS.ROLES.MODERATOR])
  @UseInterceptors(FilesInterceptor('images', PRODUCT_CONSTANTS.MAX_FILES, cloudMulter()))
  @ApiOperation({ summary: 'Update a product' })
  @ApiConsumes('multipart/form-data')
  @ApiParam(ProductPathParams.productId)
  @ApiBody(ProductSwaggerSchemas.updateProductBody)
  @ApiResponse(ProductApiResponses.updated)
  @ApiResponse(ProductApiResponses.badRequest)
  @ApiResponse(ProductApiResponses.unauthorized)
  @ApiResponse(ProductApiResponses.forbidden)
  @ApiResponse(ProductApiResponses.notFound)
  async updateProduct(
    @Param(ValidationPipe) paramProductDto: ParamProductDTO,
    @Body(ValidationPipe) updateProductDto: UpdateProductDTO,
    @UploadedFiles() images: Express.Multer.File[],
    @User() user: any,
  ) {
    return this.productService.update(paramProductDto, updateProductDto, images);
  }

  @Get('handle/:handle')
  @ApiOperation({ summary: 'Get product by handle/slug' })
  @ApiParam(ProductPathParams.handle)
  @ApiResponse(ProductApiResponses.singleProduct)
  @ApiResponse(ProductApiResponses.badRequest)
  @ApiResponse(ProductApiResponses.unauthorized)
  @ApiResponse(ProductApiResponses.notFound)
  async getProductByHandle(@Param('handle') handle: string) {
    return this.productService.getProductByHandle(handle);
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam(ProductPathParams.productId)
  @ApiResponse(ProductApiResponses.singleProduct)
  @ApiResponse(ProductApiResponses.badRequest)
  @ApiResponse(ProductApiResponses.unauthorized)
  @ApiResponse(ProductApiResponses.notFound)
  async getProductById(@Param(ValidationPipe) paramProductDto: ParamProductDTO) {
    return this.productService.getProduct(paramProductDto);
  }

  @Get(':productId/related')
  @ApiOperation({ summary: 'Get related products' })
  @ApiParam(ProductPathParams.productId)
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of related products to return (default: 4)' })
  @ApiResponse(ProductApiResponses.allProducts)
  @ApiResponse(ProductApiResponses.badRequest)
  @ApiResponse(ProductApiResponses.notFound)
  async getRelatedProducts(
    @Param(ValidationPipe) paramProductDto: ParamProductDTO,
    @Query('limit') limit?: number,
  ) {
    return this.productService.getRelatedProducts(paramProductDto, limit);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with pagination and filters' })
  @ApiQuery(ProductQueryParams.search)
  @ApiQuery(ProductQueryParams.category)
  @ApiQuery(ProductQueryParams.inStock)
  @ApiQuery(ProductQueryParams.page)
  @ApiQuery(ProductQueryParams.limit)
  @ApiQuery(ProductQueryParams.sort)
  @ApiResponse(ProductApiResponses.allProducts)
  @ApiResponse(ProductApiResponses.badRequest)
  @ApiResponse(ProductApiResponses.unauthorized)
  async getAllProducts(@Query(ValidationPipe) queryProductDto: QueryProductDTO) {
    return this.productService.getAllProducts(queryProductDto);
  }

  @Delete(':productId')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles([PRODUCT_CONSTANTS.ROLES.ADMIN, PRODUCT_CONSTANTS.ROLES.MODERATOR])
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam(ProductPathParams.productId)
  @ApiResponse(ProductApiResponses.deleted)
  @ApiResponse(ProductApiResponses.badRequest)
  @ApiResponse(ProductApiResponses.unauthorized)
  @ApiResponse(ProductApiResponses.forbidden)
  @ApiResponse(ProductApiResponses.notFound)
  async deleteProduct(
    @Param(ValidationPipe) paramProductDto: ParamProductDTO,
    @User() user: any,
  ) {
    return this.productService.deleteProduct(paramProductDto);
  }
}