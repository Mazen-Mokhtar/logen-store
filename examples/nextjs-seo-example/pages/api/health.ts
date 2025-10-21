import type { NextApiRequest, NextApiResponse } from 'next';

interface HealthResponse {
  status: 'ok' | 'error';
  uptime: number;
  version: string;
  environment: string;
  nodeVersion: string;
  timestamp: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      status: 'error',
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      message: `Method ${req.method} not allowed`
    });
  }

  try {
    // Get basic system information
    const uptime = process.uptime();
    const version = process.env.npm_package_version || '1.0.0';
    const environment = process.env.NODE_ENV || 'development';
    const nodeVersion = process.version;
    const timestamp = new Date().toISOString();

    // Basic health checks
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // Check if memory usage is too high (over 90%)
    if (memoryUsagePercent > 90) {
      return res.status(503).json({
        status: 'error',
        uptime,
        version,
        environment,
        nodeVersion,
        timestamp,
        message: 'High memory usage detected'
      });
    }

    // Check if uptime is too low (less than 10 seconds, might indicate frequent restarts)
    if (uptime < 10) {
      return res.status(200).json({
        status: 'ok',
        uptime,
        version,
        environment,
        nodeVersion,
        timestamp,
        message: 'Service recently started'
      });
    }

    // All checks passed
    res.status(200).json({
      status: 'ok',
      uptime,
      version,
      environment,
      nodeVersion,
      timestamp
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    res.status(503).json({
      status: 'error',
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      message: 'Internal health check error'
    });
  }
}