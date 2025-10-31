import { Controller, Get, Req, Res, Query, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Controller({ path: 'products', version: '' }) // Empty version to handle unversioned requests
export class ProductRedirectController {
  private readonly logger = new Logger(ProductRedirectController.name);

  @Get()
  redirectToVersionedEndpointBase(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: any,
  ) {
    this.logger.log(`Redirecting base path ${req.path} to /api/v1/products with query: ${JSON.stringify(query)}`);
    
    // Build the query string
    const queryString = Object.keys(query).length > 0 
      ? '?' + new URLSearchParams(query).toString() 
      : '';
    
    // Redirect to versioned endpoint
    const redirectUrl = `/api/v1/products${queryString}`;
    
    this.logger.log(`Redirecting to: ${redirectUrl}`);
    res.redirect(301, redirectUrl);
  }

  @Get('*')
  redirectToVersionedEndpoint(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: any,
  ) {
    // Extract the path after /api/products
    const originalPath = req.path;
    const productPath = originalPath.replace('/api/products', '');
    
    this.logger.log(`Redirecting ${originalPath} to /api/v1/products${productPath} with query: ${JSON.stringify(query)}`);
    
    // Build the query string
    const queryString = Object.keys(query).length > 0 
      ? '?' + new URLSearchParams(query).toString() 
      : '';
    
    // Redirect to versioned endpoint
    const redirectUrl = `/api/v1/products${productPath}${queryString}`;
    
    this.logger.log(`Redirecting to: ${redirectUrl}`);
    res.redirect(301, redirectUrl);
  }
}