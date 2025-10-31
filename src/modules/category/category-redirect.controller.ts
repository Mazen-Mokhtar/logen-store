import { Controller, Get, Req, Res, Query, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Controller({ path: 'category', version: '' }) // Empty version to handle unversioned requests
export class CategoryRedirectController {
  private readonly logger = new Logger(CategoryRedirectController.name);

  @Get('*')
  redirectToVersionedEndpoint(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: any,
  ) {
    // Extract the path after /api/category
    const originalPath = req.path;
    const categoryPath = originalPath.replace('/api/category', '');
    
    this.logger.log(`Redirecting ${originalPath} to /api/v1/category${categoryPath} with query: ${JSON.stringify(query)}`);
    
    // Build the query string
    const queryString = Object.keys(query).length > 0 
      ? '?' + new URLSearchParams(query).toString() 
      : '';
    
    // Redirect to versioned endpoint
    const redirectUrl = `/api/v1/category${categoryPath}${queryString}`;
    
    this.logger.log(`Redirecting to: ${redirectUrl}`);
    res.redirect(301, redirectUrl);
  }
}