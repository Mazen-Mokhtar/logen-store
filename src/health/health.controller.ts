import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService } from './health.service';
import { ApiVersion } from 'src/commen/Decorator/api-version.decorator';
import {
  HealthCheckResult,
  HealthSummary,
  HealthStatus,
} from '../config/health.config';
import { HealthCheckDto } from '../common/dto/common-response.dto';

// HealthCheckResult and HealthSummary are now imported from config

@ApiTags('Health')
@ApiHeader({
  name: 'X-API-Version',
  description: 'API Version',
  required: false,
  schema: { default: 'v1' },
})
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Basic health check endpoint
   * Returns simple status for load balancers
   */
  @Get()
  @ApiOperation({
    summary: 'Basic Health Check',
    description:
      'Returns basic application health status for load balancers and monitoring systems',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    type: HealthCheckDto,
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-15T10:30:00.000Z',
        uptime: 3600,
        version: '1.0.0',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Application is unhealthy',
    type: HealthCheckDto,
    schema: {
      example: {
        status: 'error',
        timestamp: '2024-01-15T10:30:00.000Z',
        error: {
          message: 'Database connection failed',
        },
      },
    },
  })
  async getHealth(@Res() res: Response): Promise<void> {
    try {
      const health = await this.healthService.getBasicHealth();
      const statusCode =
        health.status === 'healthy'
          ? HttpStatus.OK
          : HttpStatus.SERVICE_UNAVAILABLE;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  /**
   * Detailed health check with all dependencies
   */
  @Get('detailed')
  @ApiOperation({
    summary: 'Detailed Health Check',
    description:
      'Returns comprehensive health status including all system dependencies and services',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information',
    type: HealthCheckDto,
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-15T10:30:00.000Z',
        info: {
          database: { status: 'up', responseTime: '15ms' },
          redis: { status: 'up', responseTime: '5ms' },
          memory: { status: 'ok', usage: '45%' },
          disk: { status: 'ok', usage: '60%' },
        },
        details: {
          uptime: 3600,
          version: '1.0.0',
          environment: 'production',
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more services are unhealthy',
    type: HealthCheckDto,
  })
  async getDetailedHealth(@Res() res: Response): Promise<void> {
    try {
      const health = await this.healthService.getDetailedHealth();
      const statusCode =
        health.status === HealthStatus.HEALTHY
          ? HttpStatus.OK
          : health.status === HealthStatus.WARNING
            ? HttpStatus.OK
            : HttpStatus.SERVICE_UNAVAILABLE;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        checks: {},
      });
    }
  }

  /**
   * Readiness probe for Kubernetes
   * Checks if the application is ready to serve traffic
   */
  @Get('ready')
  async getReadiness(@Res() res: Response): Promise<void> {
    try {
      const readiness = await this.healthService.getReadiness();
      const statusCode = readiness.ready
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE;
      res.status(statusCode).json(readiness);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        ready: false,
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  /**
   * Liveness probe for Kubernetes
   * Checks if the application is alive and should not be restarted
   */
  @Get('live')
  async getLiveness(@Res() res: Response): Promise<void> {
    try {
      const liveness = await this.healthService.getLiveness();
      const statusCode = liveness.alive
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE;
      res.status(statusCode).json(liveness);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        alive: false,
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  /**
   * Database health check
   */
  @Get('database')
  async getDatabaseHealth(@Res() res: Response): Promise<void> {
    try {
      const dbHealth = await this.healthService.getDatabaseHealth();
      const statusCode =
        dbHealth.status === 'up'
          ? HttpStatus.OK
          : HttpStatus.SERVICE_UNAVAILABLE;
      res.status(statusCode).json(dbHealth);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'down',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  /**
   * Redis health check
   */
  @Get('redis')
  async getRedisHealth(@Res() res: Response): Promise<void> {
    try {
      const redisHealth = await this.healthService.getRedisHealth();
      const statusCode =
        redisHealth.status === 'up'
          ? HttpStatus.OK
          : HttpStatus.SERVICE_UNAVAILABLE;
      res.status(statusCode).json(redisHealth);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'down',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  /**
   * System metrics endpoint
   */
  @Get('metrics')
  async getMetrics(): Promise<any> {
    return this.healthService.getSystemMetrics();
  }

  /**
   * Application info endpoint
   */
  @Get('info')
  async getInfo(): Promise<any> {
    return this.healthService.getApplicationInfo();
  }

  /**
   * Debug health check with detailed system information
   * Only available in development/staging environments
   */
  @Get('debug')
  @ApiOperation({
    summary: 'Debug Health Check',
    description: 'Returns comprehensive system information for debugging purposes (development only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Debug information',
    schema: {
      example: {
        system: {
          platform: 'win32',
          arch: 'x64',
          hostname: 'localhost',
          uptime: 3600,
        },
        process: {
          pid: 1234,
          uptime: 300,
          memoryUsage: {},
        },
        metrics: {},
        config: {},
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Debug endpoint not available in production',
  })
  async getDebugHealth(@Res() res: Response): Promise<void> {
    // Only allow debug endpoint in non-production environments
    if (process.env.NODE_ENV === 'production') {
      res.status(HttpStatus.FORBIDDEN).json({
        error: 'Debug endpoint not available in production',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      const debugInfo = await this.healthService.getDebugHealth();
      res.status(HttpStatus.OK).json(debugInfo);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Debug health check failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Enhanced health metrics endpoint for monitoring systems
   */
  @Get('health-metrics')
  @ApiOperation({
    summary: 'Enhanced Health Metrics',
    description: 'Returns detailed metrics for monitoring and alerting systems',
  })
  @ApiResponse({
    status: 200,
    description: 'Enhanced health metrics',
    schema: {
      example: {
        timestamp: '2024-01-15T10:30:00.000Z',
        uptime: 3600,
        memory: {
          heap: { used: 50, total: 100, usagePercent: 50 },
          system: { used: 2048, total: 8192, usagePercent: 25 },
        },
        cpu: { usage: {}, loadAverage: [0.5, 0.3, 0.2] },
        application: {},
        database: { readyState: 1 },
      },
    },
  })
  async getHealthMetrics(@Res() res: Response): Promise<void> {
    try {
      const metrics = await this.healthService.getHealthMetrics();
      res.status(HttpStatus.OK).json(metrics);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to retrieve health metrics',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Readiness probe for Kubernetes/container orchestration
   */
  @Get('readiness')
  @ApiOperation({
    summary: 'Readiness Probe',
    description: 'Checks if the service is ready to serve traffic (for load balancers)',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
    schema: {
      example: {
        status: 'healthy',
        message: 'Service is ready',
        details: { uptime: 3600, criticalChecks: 1 },
        timestamp: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready',
  })
  async getReadinessCheck(@Res() res: Response): Promise<void> {
    try {
      const readiness = await this.healthService.getReadinessCheck();
      const statusCode = readiness.status === 'healthy' 
        ? HttpStatus.OK 
        : HttpStatus.SERVICE_UNAVAILABLE;
      
      res.status(statusCode).json(readiness);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'critical',
        message: 'Readiness check failed',
        details: { error: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Liveness probe for Kubernetes/container orchestration
   */
  @Get('liveness')
  @ApiOperation({
    summary: 'Liveness Probe',
    description: 'Checks if the service is alive and responsive (for container restarts)',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
    schema: {
      example: {
        status: 'healthy',
        message: 'Service is alive',
        details: { uptime: 3600, heapUsagePercent: 45 },
        timestamp: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not alive',
  })
  async getLivenessCheck(@Res() res: Response): Promise<void> {
    try {
      const liveness = await this.healthService.getLivenessCheck();
      const statusCode = liveness.status === 'healthy' 
        ? HttpStatus.OK 
        : HttpStatus.SERVICE_UNAVAILABLE;
      
      res.status(statusCode).json(liveness);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'critical',
        message: 'Liveness check failed',
        details: { error: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
