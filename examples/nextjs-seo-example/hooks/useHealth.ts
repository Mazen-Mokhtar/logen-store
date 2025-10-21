import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';

export interface BasicHealthResponse {
  status: 'ok' | 'error';
  uptime: number;
  version: string;
  environment: string;
  nodeVersion: string;
  timestamp: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  message?: string;
  responseTime?: number;
  details?: Record<string, any>;
}

export interface DetailedHealthResponse {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    memory: HealthCheckResult;
    disk: HealthCheckResult;
    externalServices?: HealthCheckResult;
  };
  summary: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
  };
}

export interface HealthMetrics {
  memory: {
    heapUsed: number;
    heapTotal: number;
    heapUsedPercent: number;
    rss: number;
    external: number;
    systemTotal: number;
    systemFree: number;
    systemUsedPercent: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  application: {
    activeConnections: number;
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
    uptime: number;
  };
  database: {
    connectionStatus: 'connected' | 'disconnected' | 'error';
    activeConnections: number;
    totalQueries: number;
    averageQueryTime: number;
  };
  timestamp: string;
}

interface UseHealthReturn {
  basicHealth: BasicHealthResponse | null;
  detailedHealth: DetailedHealthResponse | null;
  healthMetrics: HealthMetrics | null;
  loading: boolean;
  error: string | null;
  refreshHealth: () => Promise<void>;
  refreshDetailedHealth: () => Promise<void>;
  refreshHealthMetrics: () => Promise<void>;
  isHealthy: boolean;
  hasWarnings: boolean;
  hasCriticalIssues: boolean;
}

export function useHealth(autoRefresh = false, refreshInterval = 30000): UseHealthReturn {
  const [basicHealth, setBasicHealth] = useState<BasicHealthResponse | null>(null);
  const [detailedHealth, setDetailedHealth] = useState<DetailedHealthResponse | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch basic health status
  const refreshHealth = useCallback(async () => {
    try {
      const response = await apiClient.get<BasicHealthResponse>('/health');
      setBasicHealth(response);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch basic health:', err);
      setError(err.message || 'Failed to fetch health status');
      
      // Set a fallback basic health status
      setBasicHealth({
        status: 'error',
        uptime: 0,
        version: 'unknown',
        environment: 'unknown',
        nodeVersion: 'unknown',
        timestamp: new Date().toISOString()
      });
    }
  }, []);

  // Fetch detailed health status
  const refreshDetailedHealth = useCallback(async () => {
    try {
      const response = await apiClient.get<DetailedHealthResponse>('/health/detailed');
      setDetailedHealth(response);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch detailed health:', err);
      setError(err.message || 'Failed to fetch detailed health status');
    }
  }, []);

  // Fetch health metrics
  const refreshHealthMetrics = useCallback(async () => {
    try {
      const response = await apiClient.get<HealthMetrics>('/health/health-metrics');
      setHealthMetrics(response);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch health metrics:', err);
      setError(err.message || 'Failed to fetch health metrics');
    }
  }, []);

  // Initialize health data
  const initializeHealth = useCallback(async () => {
    setLoading(true);
    await refreshHealth();
    setLoading(false);
  }, [refreshHealth]);

  // Computed properties
  const isHealthy = basicHealth?.status === 'ok' && 
    (!detailedHealth || detailedHealth.status === 'healthy');

  const hasWarnings = detailedHealth?.status === 'warning' || 
    (detailedHealth?.summary.warning || 0) > 0;

  const hasCriticalIssues = basicHealth?.status === 'error' || 
    detailedHealth?.status === 'critical' || 
    (detailedHealth?.summary.critical || 0) > 0;

  // Initialize on mount
  useEffect(() => {
    initializeHealth();
  }, [initializeHealth]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      await refreshHealth();
      
      // Only refresh detailed health and metrics if they were previously loaded
      if (detailedHealth) {
        await refreshDetailedHealth();
      }
      if (healthMetrics) {
        await refreshHealthMetrics();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [
    autoRefresh, 
    refreshInterval, 
    refreshHealth, 
    refreshDetailedHealth, 
    refreshHealthMetrics,
    detailedHealth,
    healthMetrics
  ]);

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Log health status changes for debugging
  useEffect(() => {
    if (basicHealth) {
      console.log('Health status updated:', {
        status: basicHealth.status,
        uptime: basicHealth.uptime,
        timestamp: basicHealth.timestamp
      });
    }
  }, [basicHealth]);

  useEffect(() => {
    if (detailedHealth) {
      console.log('Detailed health updated:', {
        status: detailedHealth.status,
        summary: detailedHealth.summary,
        timestamp: detailedHealth.timestamp
      });
    }
  }, [detailedHealth]);

  return {
    basicHealth,
    detailedHealth,
    healthMetrics,
    loading,
    error,
    refreshHealth,
    refreshDetailedHealth,
    refreshHealthMetrics,
    isHealthy,
    hasWarnings,
    hasCriticalIssues
  };
}