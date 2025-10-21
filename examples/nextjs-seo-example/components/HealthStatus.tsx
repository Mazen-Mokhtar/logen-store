import { useState, useEffect } from 'react';
import { useHealth } from '../hooks/useHealth';

export function HealthStatus() {
  const { 
    basicHealth, 
    detailedHealth, 
    healthMetrics, 
    loading, 
    error, 
    refreshHealth,
    refreshDetailedHealth,
    refreshHealthMetrics
  } = useHealth();
  
  const [showDetails, setShowDetails] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshHealth();
      if (showDetails) refreshDetailedHealth();
      if (showMetrics) refreshHealthMetrics();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, showDetails, showMetrics, refreshHealth, refreshDetailedHealth, refreshHealthMetrics]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'ok':
        return '#22c55e'; // green
      case 'warning':
        return '#f59e0b'; // amber
      case 'critical':
      case 'error':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'ok':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'critical':
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading && !basicHealth) {
    return (
      <div className="health-status loading">
        <div className="loading-spinner" />
        <span>Loading health status...</span>
      </div>
    );
  }

  if (error && !basicHealth) {
    return (
      <div className="health-status error">
        <span className="error-icon">❌</span>
        <div className="error-content">
          <h3>Health Check Failed</h3>
          <p>{error}</p>
          <button onClick={refreshHealth} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="health-status">
      {/* Basic Health Status */}
      <div className="health-card basic">
        <div className="health-header">
          <div className="status-indicator">
            <span className="status-icon">
              {getStatusIcon(basicHealth?.status || 'unknown')}
            </span>
            <span 
              className="status-text"
              style={{ color: getStatusColor(basicHealth?.status || 'unknown') }}
            >
              {basicHealth?.status?.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>
          <div className="health-actions">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`auto-refresh ${autoRefresh ? 'active' : ''}`}
              title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
            >
              {autoRefresh ? '⏸️' : '▶️'}
            </button>
            <button onClick={refreshHealth} className="refresh-button" title="Refresh">
              🔄
            </button>
          </div>
        </div>

        {basicHealth && (
          <div className="health-info">
            <div className="info-item">
              <span className="label">Uptime:</span>
              <span className="value">{formatUptime(basicHealth.uptime)}</span>
            </div>
            <div className="info-item">
              <span className="label">Version:</span>
              <span className="value">{basicHealth.version}</span>
            </div>
            <div className="info-item">
              <span className="label">Environment:</span>
              <span className="value">{basicHealth.environment}</span>
            </div>
            <div className="info-item">
              <span className="label">Last Check:</span>
              <span className="value">
                {new Date(basicHealth.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Toggle Buttons */}
      <div className="toggle-buttons">
        <button
          onClick={() => {
            setShowDetails(!showDetails);
            if (!showDetails && !detailedHealth) {
              refreshDetailedHealth();
            }
          }}
          className={`toggle-button ${showDetails ? 'active' : ''}`}
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
        <button
          onClick={() => {
            setShowMetrics(!showMetrics);
            if (!showMetrics && !healthMetrics) {
              refreshHealthMetrics();
            }
          }}
          className={`toggle-button ${showMetrics ? 'active' : ''}`}
        >
          {showMetrics ? 'Hide' : 'Show'} Metrics
        </button>
      </div>

      {/* Detailed Health Status */}
      {showDetails && detailedHealth && (
        <div className="health-card detailed">
          <h3>Detailed Health Status</h3>
          <div className="health-checks">
            {Object.entries(detailedHealth.checks).map(([key, check]) => (
              <div key={key} className="health-check">
                <div className="check-header">
                  <span className="check-icon">
                    {getStatusIcon(check.status)}
                  </span>
                  <span className="check-name">{key}</span>
                  <span 
                    className="check-status"
                    style={{ color: getStatusColor(check.status) }}
                  >
                    {check.status.toUpperCase()}
                  </span>
                </div>
                {check.responseTime && (
                  <div className="check-detail">
                    Response Time: {check.responseTime}ms
                  </div>
                )}
                {check.message && (
                  <div className="check-detail">
                    {check.message}
                  </div>
                )}
                {check.details && typeof check.details === 'object' && (
                  <div className="check-details">
                    {Object.entries(check.details).map(([detailKey, detailValue]) => (
                      <div key={detailKey} className="detail-item">
                        <span className="detail-key">{detailKey}:</span>
                        <span className="detail-value">
                          {typeof detailValue === 'object' 
                            ? JSON.stringify(detailValue, null, 2)
                            : String(detailValue)
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health Metrics */}
      {showMetrics && healthMetrics && (
        <div className="health-card metrics">
          <h3>System Metrics</h3>
          <div className="metrics-grid">
            {/* Memory Metrics */}
            <div className="metric-group">
              <h4>Memory</h4>
              <div className="metric-item">
                <span className="metric-label">Heap Used:</span>
                <span className="metric-value">
                  {formatBytes(healthMetrics.memory.heapUsed)} 
                  ({formatPercentage(healthMetrics.memory.heapUsedPercent)})
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Heap Total:</span>
                <span className="metric-value">
                  {formatBytes(healthMetrics.memory.heapTotal)}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">RSS:</span>
                <span className="metric-value">
                  {formatBytes(healthMetrics.memory.rss)}
                </span>
              </div>
            </div>

            {/* CPU Metrics */}
            <div className="metric-group">
              <h4>CPU</h4>
              <div className="metric-item">
                <span className="metric-label">Usage:</span>
                <span className="metric-value">
                  {formatPercentage(healthMetrics.cpu.usage)}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Load Average:</span>
                <span className="metric-value">
                  {healthMetrics.cpu.loadAverage.join(', ')}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Cores:</span>
                <span className="metric-value">
                  {healthMetrics.cpu.cores}
                </span>
              </div>
            </div>

            {/* Application Metrics */}
            {healthMetrics.application && (
              <div className="metric-group">
                <h4>Application</h4>
                {Object.entries(healthMetrics.application).map(([key, value]) => (
                  <div key={key} className="metric-item">
                    <span className="metric-label">{key}:</span>
                    <span className="metric-value">
                      {typeof value === 'number' ? value.toLocaleString() : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .health-status {
          max-width: 800px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .health-status.loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 20px;
          color: #666;
        }

        .health-status.error {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #f3f3f3;
          border-top: 2px solid #0070f3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-content h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
        }

        .error-content p {
          margin: 0 0 12px 0;
          font-size: 14px;
        }

        .retry-button {
          background: #dc2626;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .retry-button:hover {
          background: #b91c1c;
        }

        .health-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .health-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-icon {
          font-size: 20px;
        }

        .status-text {
          font-weight: 600;
          font-size: 16px;
        }

        .health-actions {
          display: flex;
          gap: 8px;
        }

        .auto-refresh,
        .refresh-button {
          background: none;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 6px 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .auto-refresh:hover,
        .refresh-button:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .auto-refresh.active {
          background: #dbeafe;
          border-color: #3b82f6;
          color: #1d4ed8;
        }

        .health-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .info-item:last-child {
          border-bottom: none;
        }

        .label {
          font-weight: 500;
          color: #6b7280;
        }

        .value {
          font-weight: 600;
          color: #111827;
        }

        .toggle-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .toggle-button {
          background: #f9fafb;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .toggle-button:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .toggle-button.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .health-card h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .health-checks {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .health-check {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 12px;
          background: #fafafa;
        }

        .check-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .check-name {
          font-weight: 500;
          flex: 1;
          text-transform: capitalize;
        }

        .check-status {
          font-size: 12px;
          font-weight: 600;
        }

        .check-detail {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .check-details {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
        }

        .detail-item {
          display: flex;
          gap: 8px;
          margin-bottom: 4px;
          font-size: 12px;
        }

        .detail-key {
          font-weight: 500;
          color: #6b7280;
          min-width: 80px;
        }

        .detail-value {
          color: #111827;
          word-break: break-all;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .metric-group h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .metric-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid #f3f4f6;
          font-size: 13px;
        }

        .metric-item:last-child {
          border-bottom: none;
        }

        .metric-label {
          color: #6b7280;
          font-weight: 500;
        }

        .metric-value {
          color: #111827;
          font-weight: 600;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        }

        /* Mobile responsive */
        @media (max-width: 640px) {
          .health-info {
            grid-template-columns: 1fr;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .toggle-buttons {
            flex-direction: column;
          }

          .health-header {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .loading-spinner {
            animation: none;
          }

          .toggle-button,
          .auto-refresh,
          .refresh-button {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}