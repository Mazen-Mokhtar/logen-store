import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ICacheEntry, ICacheStats } from './interfaces/seo.interface';

export interface ICacheHooks {
  onSet?: (key: string, value: any, tags: string[]) => void;
  onGet?: (key: string, hit: boolean) => void;
  onDelete?: (key: string) => void;
  onInvalidate?: (tag: string, count: number) => void;
  onEvict?: (key: string, reason: 'lru' | 'expired' | 'manual') => void;
}

export interface ICacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  invalidations: number;
  startTime: number;
}

export interface ICacheWarmupStrategy {
  priority: 'high' | 'medium' | 'low';
  keys: string[];
  generator: () => Promise<Array<{ key: string; value: any; ttl?: number; tags?: string[] }>>;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, ICacheEntry>();
  private tagIndex = new Map<string, Set<string>>();
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;
  private readonly maxSize: number;
  private readonly defaultTtl: number;
  private readonly enableDetailedLogging: boolean;
  private readonly enableMetrics: boolean;
  
  // Enterprise features
  private hooks: ICacheHooks = {};
  private metrics: ICacheMetrics;
  private warmupStrategies = new Map<string, ICacheWarmupStrategy>();
  private invalidationQueue = new Set<string>();
  private compressionEnabled: boolean;
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(private configService: ConfigService) {
    this.maxSize = this.configService.get<number>('SEO_CACHE_MAX_SIZE', 1000);
    this.defaultTtl = this.configService.get<number>('SEO_CACHE_TTL', 3600000); // 1 hour
    this.enableDetailedLogging = this.configService.get<boolean>('SEO_CACHE_DETAILED_LOGGING', false);
    this.enableMetrics = this.configService.get<boolean>('SEO_CACHE_METRICS', true);
    this.compressionEnabled = this.configService.get<boolean>('SEO_CACHE_COMPRESSION', false);
    
    // Initialize metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      invalidations: 0,
      startTime: Date.now(),
    };
    
    // Setup periodic cleanup
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000); // Every 5 minutes
    
    this.logger.log('Cache service initialized with enterprise features');
  }

  /**
   * Register cache hooks for monitoring and debugging
   */
  registerHooks(hooks: ICacheHooks): void {
    this.hooks = { ...this.hooks, ...hooks };
    this.logger.debug('Cache hooks registered');
  }

  /**
   * Register warmup strategy
   */
  registerWarmupStrategy(name: string, strategy: ICacheWarmupStrategy): void {
    this.warmupStrategies.set(name, strategy);
    this.logger.debug(`Warmup strategy registered: ${name}`);
  }

  /**
   * Get value from cache with enhanced logging and metrics
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.recordMiss(key);
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.recordMiss(key, 'expired');
      return null;
    }

    // Update access order for LRU
    this.accessOrder.set(key, ++this.accessCounter);
    this.recordHit(key);
    
    return this.deserializeValue(entry.data) as T;
  }

  /**
   * Set value in cache with compression and hooks
   */
  set<T>(key: string, value: T, ttl?: number, tags: string[] = []): void {
    // Ensure we don't exceed max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const serializedValue = this.serializeValue(value);
    
    const entry: ICacheEntry<any> = {
      data: serializedValue,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
      tags,
      compressed: this.compressionEnabled,
      size: this.estimateEntrySize(key, serializedValue),
    };

    // Remove old entry if exists
    if (this.cache.has(key)) {
      this.removeFromTagIndex(key);
    }

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);

    // Update tag index
    tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    });

    // Record metrics and trigger hooks
    if (this.enableMetrics) this.metrics.sets++;
    this.hooks.onSet?.(key, value, tags);
    
    if (this.enableDetailedLogging) {
      this.logger.debug(`Cache set for key: ${key} with tags: ${tags.join(', ')}, size: ${entry.size} bytes`);
    }
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    this.removeFromTagIndex(key);
    
    if (deleted) {
      if (this.enableMetrics) this.metrics.deletes++;
      this.hooks.onDelete?.(key);
      
      if (this.enableDetailedLogging) {
        this.logger.debug(`Cache deleted for key: ${key}`);
      }
    }
    
    return deleted;
  }

  /**
   * Enhanced invalidation with batch processing and hooks
   */
  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys) {
      return 0;
    }

    let invalidatedCount = 0;
    const keysArray = Array.from(keys);
    
    // Batch process invalidations
    keysArray.forEach(key => {
      if (this.cache.delete(key)) {
        this.accessOrder.delete(key);
        invalidatedCount++;
      }
    });

    // Clean up tag index
    this.tagIndex.delete(tag);
    
    // Remove keys from other tags
    keysArray.forEach(key => {
      this.removeFromTagIndex(key, tag);
    });

    // Record metrics and trigger hooks
    if (this.enableMetrics) this.metrics.invalidations += invalidatedCount;
    this.hooks.onInvalidate?.(tag, invalidatedCount);

    this.logger.log(`Invalidated ${invalidatedCount} cache entries for tag: ${tag}`);
    return invalidatedCount;
  }

  /**
   * Invalidate multiple tags efficiently
   */
  invalidateByTags(tags: string[]): number {
    let totalInvalidated = 0;
    
    tags.forEach(tag => {
      totalInvalidated += this.invalidateByTag(tag);
    });
    
    return totalInvalidated;
  }

  /**
   * Queue invalidation for batch processing
   */
  queueInvalidation(tag: string): void {
    this.invalidationQueue.add(tag);
  }

  /**
   * Process queued invalidations
   */
  processInvalidationQueue(): number {
    const tags = Array.from(this.invalidationQueue);
    this.invalidationQueue.clear();
    
    return this.invalidateByTags(tags);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.tagIndex.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
    this.invalidationQueue.clear();
    
    this.logger.log(`Cleared ${size} cache entries`);
  }

  /**
   * Get enhanced cache statistics
   */
  getStats(): ICacheStats & { metrics: ICacheMetrics; uptime: number } {
    const totalEntries = this.cache.size;
    const memoryUsage = this.estimateMemoryUsage();
    const uptime = Date.now() - this.metrics.startTime;
    const totalRequests = this.metrics.hits + this.metrics.misses;
    
    return {
      totalEntries,
      hitRate: totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0,
      missRate: totalRequests > 0 ? (this.metrics.misses / totalRequests) * 100 : 0,
      memoryUsage,
      maxSize: this.maxSize,
      size: totalEntries,
      metrics: { ...this.metrics },
      uptime,
    };
  }

  /**
   * Get detailed cache health information
   */
  getHealthInfo(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
    stats: any;
  } {
    const stats = this.getStats();
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check memory usage
    if (stats.memoryUsage > 100 * 1024 * 1024) { // 100MB
      issues.push('High memory usage detected');
      recommendations.push('Consider reducing cache size or TTL');
      status = 'warning';
    }

    // Check hit rate
    if (stats.hitRate < 50 && stats.metrics.hits + stats.metrics.misses > 100) {
      issues.push('Low cache hit rate');
      recommendations.push('Review caching strategy and TTL settings');
      if (status === 'healthy') status = 'warning';
    }

    // Check cache utilization
    const utilization = (stats.size / stats.maxSize) * 100;
    if (utilization > 90) {
      issues.push('Cache near capacity');
      recommendations.push('Increase cache size or implement more aggressive eviction');
      status = 'critical';
    }

    return {
      status,
      issues,
      recommendations,
      stats,
    };
  }

  /**
   * Check if cache has key
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    
    if (this.isExpired(entry)) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get all cache keys with optional filtering
   */
  keys(pattern?: RegExp): string[] {
    const allKeys = Array.from(this.cache.keys());
    
    if (pattern) {
      return allKeys.filter(key => pattern.test(key));
    }
    
    return allKeys;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Enhanced warmup with priority-based loading
   */
  async warmup(warmupData?: Array<{ key: string; value: any; ttl?: number; tags?: string[] }>): Promise<void> {
    this.logger.log('Starting cache warmup');
    
    // Execute registered warmup strategies by priority
    const strategies = Array.from(this.warmupStrategies.entries())
      .sort(([, a], [, b]) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    for (const [name, strategy] of strategies) {
      try {
        this.logger.debug(`Executing warmup strategy: ${name}`);
        const data = await strategy.generator();
        
        for (const item of data) {
          this.set(item.key, item.value, item.ttl, item.tags || []);
        }
        
        this.logger.debug(`Completed warmup strategy: ${name} (${data.length} entries)`);
      } catch (error) {
        this.logger.error(`Failed to execute warmup strategy: ${name}`, error);
      }
    }
    
    // Process manual warmup data
    if (warmupData) {
      for (const item of warmupData) {
        this.set(item.key, item.value, item.ttl, item.tags || []);
      }
      this.logger.debug(`Manual warmup completed: ${warmupData.length} entries`);
    }
    
    this.logger.log('Cache warmup completed');
  }

  /**
   * Preload critical cache entries
   */
  async preloadCritical(keys: string[], generator: (key: string) => Promise<any>): Promise<void> {
    this.logger.log(`Preloading ${keys.length} critical cache entries`);
    
    const promises = keys.map(async (key) => {
      try {
        if (!this.has(key)) {
          const value = await generator(key);
          this.set(key, value, undefined, ['critical']);
        }
      } catch (error) {
        this.logger.error(`Failed to preload key: ${key}`, error);
      }
    });
    
    await Promise.all(promises);
    this.logger.log('Critical cache preloading completed');
  }

  /**
   * Export cache data for backup/migration
   */
  export(): Array<{ key: string; value: any; ttl: number; tags: string[]; timestamp: number }> {
    const exported: Array<{ key: string; value: any; ttl: number; tags: string[]; timestamp: number }> = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isExpired(entry)) {
        exported.push({
          key,
          value: this.deserializeValue(entry.data),
          ttl: entry.ttl,
          tags: entry.tags,
          timestamp: entry.timestamp,
        });
      }
    }
    
    return exported;
  }

  /**
   * Import cache data from backup
   */
  import(data: Array<{ key: string; value: any; ttl: number; tags: string[]; timestamp: number }>): void {
    let importedCount = 0;
    
    for (const item of data) {
      // Check if entry is still valid
      const age = Date.now() - item.timestamp;
      if (age < item.ttl) {
        const remainingTtl = item.ttl - age;
        this.set(item.key, item.value, remainingTtl, item.tags);
        importedCount++;
      }
    }
    
    this.logger.log(`Imported ${importedCount} cache entries`);
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Process any remaining invalidations
    this.processInvalidationQueue();
    
    this.logger.log('Cache service shutdown completed');
  }

  // Private methods

  private recordHit(key: string): void {
    if (this.enableMetrics) this.metrics.hits++;
    this.hooks.onGet?.(key, true);
    
    if (this.enableDetailedLogging) {
      this.logger.debug(`Cache hit for key: ${key}`);
    }
  }

  private recordMiss(key: string, reason?: string): void {
    if (this.enableMetrics) this.metrics.misses++;
    this.hooks.onGet?.(key, false);
    
    if (this.enableDetailedLogging) {
      this.logger.debug(`Cache miss for key: ${key}${reason ? ` (${reason})` : ''}`);
    }
  }

  private serializeValue(value: any): any {
    if (this.compressionEnabled && typeof value === 'string' && value.length > 1000) {
      // Simple compression simulation - in real implementation, use zlib
      return { __compressed: true, data: value };
    }
    return value;
  }

  private deserializeValue(value: any): any {
    if (value && typeof value === 'object' && value.__compressed) {
      return value.data;
    }
    return value;
  }

  private estimateEntrySize(key: string, value: any): number {
    return key.length * 2 + JSON.stringify(value).length * 2 + 64;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: ICacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruAccess = Infinity;

    for (const [key, access] of this.accessOrder.entries()) {
      if (access < lruAccess) {
        lruAccess = access;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
      if (this.enableMetrics) this.metrics.evictions++;
      this.hooks.onEvict?.(lruKey, 'lru');
      
      if (this.enableDetailedLogging) {
        this.logger.debug(`Evicted LRU entry: ${lruKey}`);
      }
    }
  }

  /**
   * Remove key from tag index
   */
  private removeFromTagIndex(key: string, excludeTag?: string): void {
    const entry = this.cache.get(key);
    if (!entry) return;

    entry.tags.forEach(tag => {
      if (tag !== excludeTag) {
        const tagKeys = this.tagIndex.get(tag);
        if (tagKeys) {
          tagKeys.delete(key);
          if (tagKeys.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      }
    });
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key);
        this.hooks.onEvict?.(key, 'expired');
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Estimate memory usage (enhanced calculation)
   */
  private estimateMemoryUsage(): number {
    let size = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      size += entry.size || this.estimateEntrySize(key, entry.data);
    }
    
    // Add overhead for indexes
    size += this.tagIndex.size * 64;
    size += this.accessOrder.size * 16;
    
    return size;
  }
}