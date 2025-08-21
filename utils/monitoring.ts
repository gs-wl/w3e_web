import logger from '../config/logger';
import { performance } from '../config/monitoring';
import { CryptoUtils } from './crypto';
import { CacheManager } from './cache';
import { EmailService } from './email';
import { NotificationService } from './notification';

// Monitoring interfaces
export interface MonitoringConfig {
  enableHealthChecks: boolean;
  enableMetrics: boolean;
  enableAlerting: boolean;
  enablePerformanceTracking: boolean;
  healthCheckInterval: number;
  metricsRetentionDays: number;
  alertThresholds: AlertThresholds;
  notificationChannels: string[];
}

export interface AlertThresholds {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  responseTime: number;
  errorRate: number;
  requestRate: number;
}

export interface HealthCheck {
  id: string;
  name: string;
  description: string;
  type: 'http' | 'database' | 'service' | 'custom';
  endpoint?: string;
  timeout: number;
  interval: number;
  retries: number;
  enabled: boolean;
  lastCheck?: Date;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface HealthCheckResult {
  checkId: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime: number;
  timestamp: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  timestamp: Date;
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  application: ApplicationMetrics;
}

export interface CPUMetrics {
  usage: number;
  loadAverage: number[];
  cores: number;
}

export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  usage: number;
  heapUsed: number;
  heapTotal: number;
}

export interface DiskMetrics {
  total: number;
  used: number;
  free: number;
  usage: number;
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  connections: number;
}

export interface ApplicationMetrics {
  uptime: number;
  requestCount: number;
  errorCount: number;
  responseTime: number;
  activeConnections: number;
  queueSize: number;
  cacheHitRate: number;
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export interface MonitoringStats {
  totalHealthChecks: number;
  healthyChecks: number;
  unhealthyChecks: number;
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  averageResponseTime: number;
  uptime: number;
  lastUpdate: Date;
}

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface MonitoringReport {
  id: string;
  name: string;
  period: 'hour' | 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  healthChecks: HealthCheckResult[];
  metrics: SystemMetrics[];
  alerts: Alert[];
  summary: MonitoringStats;
  generatedAt: Date;
}

// Monitoring error class
export class MonitoringError extends Error {
  constructor(
    message: string,
    public code: string,
    public checkId?: string
  ) {
    super(message);
    this.name = 'MonitoringError';
  }
}

// Health checker
export class HealthChecker {
  private checks = new Map<string, HealthCheck>();
  private results = new Map<string, HealthCheckResult[]>();
  private timers = new Map<string, NodeJS.Timeout>();
  private config: Required<MonitoringConfig>;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      enableHealthChecks: true,
      enableMetrics: true,
      enableAlerting: true,
      enablePerformanceTracking: true,
      healthCheckInterval: 30000, // 30 seconds
      metricsRetentionDays: 7,
      alertThresholds: {
        cpuUsage: 80,
        memoryUsage: 85,
        diskUsage: 90,
        responseTime: 5000,
        errorRate: 5,
        requestRate: 1000,
      },
      notificationChannels: ['email'],
      ...config,
    };
  }

  /**
   * Register health check
   */
  registerCheck(check: Omit<HealthCheck, 'id' | 'status' | 'lastCheck'>): string {
    const checkId = CryptoUtils.generateUUID();
    
    const healthCheck: HealthCheck = {
      id: checkId,
      status: 'unknown',
      ...check,
    };
    
    this.checks.set(checkId, healthCheck);
    this.results.set(checkId, []);
    
    if (healthCheck.enabled && this.config.enableHealthChecks) {
      this.startCheck(checkId);
    }
    
    logger.info('Health check registered', {
      checkId,
      name: check.name,
      type: check.type,
    });
    
    return checkId;
  }

  /**
   * Unregister health check
   */
  unregisterCheck(checkId: string): void {
    this.stopCheck(checkId);
    this.checks.delete(checkId);
    this.results.delete(checkId);
    
    logger.info('Health check unregistered', { checkId });
  }

  /**
   * Run health check
   */
  async runCheck(checkId: string): Promise<HealthCheckResult> {
    const check = this.checks.get(checkId);
    if (!check) {
      throw new MonitoringError(
        'Health check not found',
        'CHECK_NOT_FOUND',
        checkId
      );
    }

    const timer = performance.startTimer('health_check_run');
    const startTime = Date.now();
    
    try {
      let result: HealthCheckResult;
      
      switch (check.type) {
        case 'http':
          result = await this.runHttpCheck(check);
          break;
        case 'database':
          result = await this.runDatabaseCheck(check);
          break;
        case 'service':
          result = await this.runServiceCheck(check);
          break;
        case 'custom':
          result = await this.runCustomCheck(check);
          break;
        default:
          throw new MonitoringError(
            `Unknown check type: ${check.type}`,
            'UNKNOWN_CHECK_TYPE',
            checkId
          );
      }
      
      // Update check status
      check.status = result.status;
      check.lastCheck = result.timestamp;
      check.responseTime = result.responseTime;
      check.error = result.error;
      
      // Store result
      const results = this.results.get(checkId) || [];
      results.push(result);
      
      // Keep only recent results
      const maxResults = 1000;
      if (results.length > maxResults) {
        results.splice(0, results.length - maxResults);
      }
      
      this.results.set(checkId, results);
      
      logger.debug('Health check completed', {
        checkId,
        status: result.status,
        responseTime: result.responseTime,
      });
      
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        checkId,
        status: 'unhealthy',
        responseTime,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
      
      // Update check status
      check.status = 'unhealthy';
      check.lastCheck = result.timestamp;
      check.responseTime = responseTime;
      check.error = result.error;
      
      // Store result
      const results = this.results.get(checkId) || [];
      results.push(result);
      this.results.set(checkId, results);
      
      logger.error('Health check failed', {
        checkId,
        error: result.error,
        responseTime,
      });
      
      return result;
    } finally {
      timer();
    }
  }

  /**
   * Run all health checks
   */
  async runAllChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    
    for (const checkId of this.checks.keys()) {
      try {
        const result = await this.runCheck(checkId);
        results.push(result);
      } catch (error) {
        logger.error('Failed to run health check', { checkId, error });
      }
    }
    
    return results;
  }

  /**
   * Get health check status
   */
  getCheckStatus(checkId: string): HealthCheck | undefined {
    return this.checks.get(checkId);
  }

  /**
   * Get all health checks
   */
  getAllChecks(): HealthCheck[] {
    return Array.from(this.checks.values());
  }

  /**
   * Get check results
   */
  getCheckResults(checkId: string, limit?: number): HealthCheckResult[] {
    const results = this.results.get(checkId) || [];
    return limit ? results.slice(-limit) : results;
  }

  /**
   * Get overall health status
   */
  getOverallHealth(): 'healthy' | 'unhealthy' | 'degraded' {
    const checks = Array.from(this.checks.values()).filter(c => c.enabled);
    
    if (checks.length === 0) {
      return 'healthy';
    }
    
    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    
    if (unhealthyCount === 0) {
      return 'healthy';
    } else if (healthyCount > unhealthyCount) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * Start check timer
   */
  private startCheck(checkId: string): void {
    const check = this.checks.get(checkId);
    if (!check) return;
    
    // Run initial check
    this.runCheck(checkId).catch(error => {
      logger.error('Initial health check failed', { checkId, error });
    });
    
    // Set up recurring check
    const timer = setInterval(() => {
      this.runCheck(checkId).catch(error => {
        logger.error('Scheduled health check failed', { checkId, error });
      });
    }, check.interval);
    
    this.timers.set(checkId, timer);
  }

  /**
   * Stop check timer
   */
  private stopCheck(checkId: string): void {
    const timer = this.timers.get(checkId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(checkId);
    }
  }

  /**
   * Run HTTP health check
   */
  private async runHttpCheck(check: HealthCheck): Promise<HealthCheckResult> {
    if (!check.endpoint) {
      throw new MonitoringError(
        'HTTP check requires endpoint',
        'MISSING_ENDPOINT',
        check.id
      );
    }

    const startTime = Date.now();
    
    try {
      // Mock HTTP request - replace with actual HTTP client
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      const responseTime = Date.now() - startTime;
      
      return {
        checkId: check.id,
        status: 'healthy',
        responseTime,
        timestamp: new Date(),
        metadata: {
          endpoint: check.endpoint,
          method: 'GET',
        },
      };
    } catch (error) {
      throw new MonitoringError(
        `HTTP check failed: ${error}`,
        'HTTP_CHECK_FAILED',
        check.id
      );
    }
  }

  /**
   * Run database health check
   */
  private async runDatabaseCheck(check: HealthCheck): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Mock database query - replace with actual database client
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      
      const responseTime = Date.now() - startTime;
      
      return {
        checkId: check.id,
        status: 'healthy',
        responseTime,
        timestamp: new Date(),
        metadata: {
          query: 'SELECT 1',
        },
      };
    } catch (error) {
      throw new MonitoringError(
        `Database check failed: ${error}`,
        'DATABASE_CHECK_FAILED',
        check.id
      );
    }
  }

  /**
   * Run service health check
   */
  private async runServiceCheck(check: HealthCheck): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Mock service check - replace with actual service client
      await new Promise(resolve => setTimeout(resolve, Math.random() * 75));
      
      const responseTime = Date.now() - startTime;
      
      return {
        checkId: check.id,
        status: 'healthy',
        responseTime,
        timestamp: new Date(),
        metadata: {
          service: check.name,
        },
      };
    } catch (error) {
      throw new MonitoringError(
        `Service check failed: ${error}`,
        'SERVICE_CHECK_FAILED',
        check.id
      );
    }
  }

  /**
   * Run custom health check
   */
  private async runCustomCheck(check: HealthCheck): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Custom check logic would be implemented here
      // For now, just simulate a check
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      const responseTime = Date.now() - startTime;
      
      return {
        checkId: check.id,
        status: 'healthy',
        responseTime,
        timestamp: new Date(),
        metadata: check.metadata,
      };
    } catch (error) {
      throw new MonitoringError(
        `Custom check failed: ${error}`,
        'CUSTOM_CHECK_FAILED',
        check.id
      );
    }
  }

  /**
   * Destroy health checker
   */
  destroy(): void {
    // Stop all timers
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    
    this.timers.clear();
    this.checks.clear();
    this.results.clear();
    
    logger.info('Health checker destroyed');
  }
}

// Metrics collector
export class MetricsCollector {
  private metrics = new Map<string, PerformanceMetric[]>();
  private systemMetrics: SystemMetrics[] = [];
  private config: Required<MonitoringConfig>;
  private collectionTimer?: NodeJS.Timeout;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      enableHealthChecks: true,
      enableMetrics: true,
      enableAlerting: true,
      enablePerformanceTracking: true,
      healthCheckInterval: 30000,
      metricsRetentionDays: 7,
      alertThresholds: {
        cpuUsage: 80,
        memoryUsage: 85,
        diskUsage: 90,
        responseTime: 5000,
        errorRate: 5,
        requestRate: 1000,
      },
      notificationChannels: ['email'],
      ...config,
    };

    if (this.config.enableMetrics) {
      this.startCollection();
    }
  }

  /**
   * Record metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string = '',
    tags: Record<string, string> = {}
  ): void {
    if (!this.config.enableMetrics) {
      return;
    }

    const metric: PerformanceMetric = {
      id: CryptoUtils.generateUUID(),
      name,
      value,
      unit,
      timestamp: new Date(),
      tags,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricList = this.metrics.get(name)!;
    metricList.push(metric);

    // Keep only recent metrics
    const maxMetrics = 10000;
    if (metricList.length > maxMetrics) {
      metricList.splice(0, metricList.length - maxMetrics);
    }

    logger.debug('Metric recorded', {
      name,
      value,
      unit,
      tags,
    });
  }

  /**
   * Get metrics
   */
  getMetrics(
    name?: string,
    startDate?: Date,
    endDate?: Date
  ): PerformanceMetric[] {
    let allMetrics: PerformanceMetric[] = [];

    if (name) {
      allMetrics = this.metrics.get(name) || [];
    } else {
      for (const metricList of this.metrics.values()) {
        allMetrics.push(...metricList);
      }
    }

    // Apply date filters
    if (startDate || endDate) {
      allMetrics = allMetrics.filter(metric => {
        if (startDate && metric.timestamp < startDate) return false;
        if (endDate && metric.timestamp > endDate) return false;
        return true;
      });
    }

    return allMetrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics(): Promise<SystemMetrics> {
    const timer = performance.startTimer('collect_system_metrics');
    
    try {
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        cpu: await this.collectCPUMetrics(),
        memory: await this.collectMemoryMetrics(),
        disk: await this.collectDiskMetrics(),
        network: await this.collectNetworkMetrics(),
        application: await this.collectApplicationMetrics(),
      };

      this.systemMetrics.push(metrics);

      // Keep only recent system metrics
      const maxSystemMetrics = 1000;
      if (this.systemMetrics.length > maxSystemMetrics) {
        this.systemMetrics.splice(0, this.systemMetrics.length - maxSystemMetrics);
      }

      logger.debug('System metrics collected', {
        cpuUsage: metrics.cpu.usage,
        memoryUsage: metrics.memory.usage,
        diskUsage: metrics.disk.usage,
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to collect system metrics', { error });
      throw new MonitoringError(
        'Failed to collect system metrics',
        'METRICS_COLLECTION_FAILED'
      );
    } finally {
      timer();
    }
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(
    startDate?: Date,
    endDate?: Date
  ): SystemMetrics[] {
    let metrics = [...this.systemMetrics];

    // Apply date filters
    if (startDate || endDate) {
      metrics = metrics.filter(metric => {
        if (startDate && metric.timestamp < startDate) return false;
        if (endDate && metric.timestamp > endDate) return false;
        return true;
      });
    }

    return metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.metricsRetentionDays);

    // Clear old performance metrics
    for (const [name, metricList] of this.metrics.entries()) {
      const filteredMetrics = metricList.filter(m => m.timestamp >= cutoffDate);
      this.metrics.set(name, filteredMetrics);
    }

    // Clear old system metrics
    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp >= cutoffDate);

    logger.info('Old metrics cleared', {
      cutoffDate,
      retentionDays: this.config.metricsRetentionDays,
    });
  }

  /**
   * Start metrics collection
   */
  private startCollection(): void {
    // Collect initial metrics
    this.collectSystemMetrics().catch(error => {
      logger.error('Initial metrics collection failed', { error });
    });

    // Set up recurring collection
    this.collectionTimer = setInterval(() => {
      this.collectSystemMetrics().catch(error => {
        logger.error('Scheduled metrics collection failed', { error });
      });
    }, 60000); // Collect every minute
  }

  /**
   * Collect CPU metrics
   */
  private async collectCPUMetrics(): Promise<CPUMetrics> {
    // Mock CPU metrics - replace with actual system calls
    return {
      usage: Math.random() * 100,
      loadAverage: [Math.random() * 2, Math.random() * 2, Math.random() * 2],
      cores: 4,
    };
  }

  /**
   * Collect memory metrics
   */
  private async collectMemoryMetrics(): Promise<MemoryMetrics> {
    // Get Node.js memory usage
    const memUsage = process.memoryUsage();
    
    // Mock system memory - replace with actual system calls
    const total = 8 * 1024 * 1024 * 1024; // 8GB
    const used = total * (0.3 + Math.random() * 0.4); // 30-70% usage
    const free = total - used;
    
    return {
      total,
      used,
      free,
      usage: (used / total) * 100,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
    };
  }

  /**
   * Collect disk metrics
   */
  private async collectDiskMetrics(): Promise<DiskMetrics> {
    // Mock disk metrics - replace with actual system calls
    const total = 500 * 1024 * 1024 * 1024; // 500GB
    const used = total * (0.2 + Math.random() * 0.6); // 20-80% usage
    const free = total - used;
    
    return {
      total,
      used,
      free,
      usage: (used / total) * 100,
    };
  }

  /**
   * Collect network metrics
   */
  private async collectNetworkMetrics(): Promise<NetworkMetrics> {
    // Mock network metrics - replace with actual system calls
    return {
      bytesIn: Math.floor(Math.random() * 1000000),
      bytesOut: Math.floor(Math.random() * 1000000),
      packetsIn: Math.floor(Math.random() * 10000),
      packetsOut: Math.floor(Math.random() * 10000),
      connections: Math.floor(Math.random() * 100),
    };
  }

  /**
   * Collect application metrics
   */
  private async collectApplicationMetrics(): Promise<ApplicationMetrics> {
    return {
      uptime: process.uptime(),
      requestCount: Math.floor(Math.random() * 10000),
      errorCount: Math.floor(Math.random() * 100),
      responseTime: Math.random() * 1000,
      activeConnections: Math.floor(Math.random() * 100),
      queueSize: Math.floor(Math.random() * 50),
      cacheHitRate: Math.random() * 100,
    };
  }

  /**
   * Destroy metrics collector
   */
  destroy(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = undefined;
    }
    
    this.metrics.clear();
    this.systemMetrics = [];
    
    logger.info('Metrics collector destroyed');
  }
}

// Alert manager
export class AlertManager {
  private alerts = new Map<string, Alert>();
  private config: Required<MonitoringConfig>;
  private emailService?: EmailService;
  private notificationService?: NotificationService;

  constructor(
    config: Partial<MonitoringConfig> = {},
    emailService?: EmailService,
    notificationService?: NotificationService
  ) {
    this.config = {
      enableHealthChecks: true,
      enableMetrics: true,
      enableAlerting: true,
      enablePerformanceTracking: true,
      healthCheckInterval: 30000,
      metricsRetentionDays: 7,
      alertThresholds: {
        cpuUsage: 80,
        memoryUsage: 85,
        diskUsage: 90,
        responseTime: 5000,
        errorRate: 5,
        requestRate: 1000,
      },
      notificationChannels: ['email'],
      ...config,
    };

    this.emailService = emailService;
    this.notificationService = notificationService;
  }

  /**
   * Create alert
   */
  async createAlert(
    type: Alert['type'],
    title: string,
    message: string,
    source: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    if (!this.config.enableAlerting) {
      return '';
    }

    const alertId = CryptoUtils.generateUUID();
    
    const alert: Alert = {
      id: alertId,
      type,
      title,
      message,
      source,
      timestamp: new Date(),
      resolved: false,
      metadata,
    };
    
    this.alerts.set(alertId, alert);
    
    // Send notifications
    await this.sendAlertNotifications(alert);
    
    logger.warn('Alert created', {
      alertId,
      type,
      title,
      source,
    });
    
    return alertId;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) {
      return;
    }
    
    alert.resolved = true;
    alert.resolvedAt = new Date();
    
    logger.info('Alert resolved', {
      alertId,
      title: alert.title,
      duration: alert.resolvedAt.getTime() - alert.timestamp.getTime(),
    });
  }

  /**
   * Get alerts
   */
  getAlerts(
    resolved?: boolean,
    type?: Alert['type'],
    source?: string
  ): Alert[] {
    let alerts = Array.from(this.alerts.values());
    
    // Apply filters
    if (resolved !== undefined) {
      alerts = alerts.filter(alert => alert.resolved === resolved);
    }
    
    if (type) {
      alerts = alerts.filter(alert => alert.type === type);
    }
    
    if (source) {
      alerts = alerts.filter(alert => alert.source === source);
    }
    
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Check thresholds
   */
  async checkThresholds(metrics: SystemMetrics): Promise<void> {
    const thresholds = this.config.alertThresholds;
    
    // Check CPU usage
    if (metrics.cpu.usage > thresholds.cpuUsage) {
      await this.createAlert(
        'warning',
        'High CPU Usage',
        `CPU usage is ${metrics.cpu.usage.toFixed(1)}%, exceeding threshold of ${thresholds.cpuUsage}%`,
        'system',
        { metric: 'cpu_usage', value: metrics.cpu.usage, threshold: thresholds.cpuUsage }
      );
    }
    
    // Check memory usage
    if (metrics.memory.usage > thresholds.memoryUsage) {
      await this.createAlert(
        'warning',
        'High Memory Usage',
        `Memory usage is ${metrics.memory.usage.toFixed(1)}%, exceeding threshold of ${thresholds.memoryUsage}%`,
        'system',
        { metric: 'memory_usage', value: metrics.memory.usage, threshold: thresholds.memoryUsage }
      );
    }
    
    // Check disk usage
    if (metrics.disk.usage > thresholds.diskUsage) {
      await this.createAlert(
        'critical',
        'High Disk Usage',
        `Disk usage is ${metrics.disk.usage.toFixed(1)}%, exceeding threshold of ${thresholds.diskUsage}%`,
        'system',
        { metric: 'disk_usage', value: metrics.disk.usage, threshold: thresholds.diskUsage }
      );
    }
    
    // Check response time
    if (metrics.application.responseTime > thresholds.responseTime) {
      await this.createAlert(
        'warning',
        'High Response Time',
        `Average response time is ${metrics.application.responseTime.toFixed(0)}ms, exceeding threshold of ${thresholds.responseTime}ms`,
        'application',
        { metric: 'response_time', value: metrics.application.responseTime, threshold: thresholds.responseTime }
      );
    }
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alert: Alert): Promise<void> {
    const channels = this.config.notificationChannels;
    
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailAlert(alert);
            break;
          case 'notification':
            await this.sendNotificationAlert(alert);
            break;
          default:
            logger.warn('Unknown notification channel', { channel });
        }
      } catch (error) {
        logger.error('Failed to send alert notification', {
          alertId: alert.id,
          channel,
          error,
        });
      }
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    if (!this.emailService) {
      logger.warn('Email service not configured for alerts');
      return;
    }

    const subject = `[${alert.type.toUpperCase()}] ${alert.title}`;
    const body = `
      Alert Details:
      - Type: ${alert.type}
      - Source: ${alert.source}
      - Time: ${alert.timestamp.toISOString()}
      - Message: ${alert.message}
      
      ${alert.metadata ? `Metadata: ${JSON.stringify(alert.metadata, null, 2)}` : ''}
    `;

    await this.emailService.sendEmail({
      to: 'admin@example.com', // Configure admin email
      subject,
      text: body,
    });
  }

  /**
   * Send notification alert
   */
  private async sendNotificationAlert(alert: Alert): Promise<void> {
    if (!this.notificationService) {
      logger.warn('Notification service not configured for alerts');
      return;
    }

    await this.notificationService.sendNotification({
      templateId: 'alert',
      variables: {
        alertId: alert.id,
        alertType: alert.type,
        source: alert.source,
        timestamp: alert.timestamp,
        metadata: alert.metadata,
        title: alert.title,
        message: alert.message,
      },
      priority: 'high',
      recipients: [{
        id: 'admin', // Configure admin user
        email: 'admin@example.com', // Configure admin email
      }],
    });
  }
}

// Monitoring service
export class MonitoringService {
  private config: Required<MonitoringConfig>;
  private healthChecker: HealthChecker;
  private metricsCollector: MetricsCollector;
  private alertManager: AlertManager;
  private cache: CacheManager;

  constructor(
    config: Partial<MonitoringConfig> = {},
    emailService?: EmailService,
    notificationService?: NotificationService,
    cache?: CacheManager
  ) {
    this.config = {
      enableHealthChecks: true,
      enableMetrics: true,
      enableAlerting: true,
      enablePerformanceTracking: true,
      healthCheckInterval: 30000,
      metricsRetentionDays: 7,
      alertThresholds: {
        cpuUsage: 80,
        memoryUsage: 85,
        diskUsage: 90,
        responseTime: 5000,
        errorRate: 5,
        requestRate: 1000,
      },
      notificationChannels: ['email'],
      ...config,
    };

    this.healthChecker = new HealthChecker(this.config);
    this.metricsCollector = new MetricsCollector(this.config);
    this.alertManager = new AlertManager(this.config, emailService, notificationService);
    this.cache = cache || new CacheManager();

    // Set up monitoring loop
    this.startMonitoring();
  }

  /**
   * Register health check
   */
  registerHealthCheck(check: Omit<HealthCheck, 'id' | 'status' | 'lastCheck'>): string {
    return this.healthChecker.registerCheck(check);
  }

  /**
   * Record metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string = '',
    tags: Record<string, string> = {}
  ): void {
    this.metricsCollector.recordMetric(name, value, unit, tags);
  }

  /**
   * Create alert
   */
  async createAlert(
    type: Alert['type'],
    title: string,
    message: string,
    source: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    return this.alertManager.createAlert(type, title, message, source, metadata);
  }

  /**
   * Get monitoring stats
   */
  getStats(): MonitoringStats {
    const healthChecks = this.healthChecker.getAllChecks();
    const alerts = this.alertManager.getAlerts();
    const systemMetrics = this.metricsCollector.getSystemMetrics();
    
    const healthyChecks = healthChecks.filter(c => c.status === 'healthy').length;
    const unhealthyChecks = healthChecks.filter(c => c.status === 'unhealthy').length;
    const activeAlerts = alerts.filter(a => !a.resolved).length;
    const resolvedAlerts = alerts.filter(a => a.resolved).length;
    
    const averageResponseTime = healthChecks.length > 0 ?
      healthChecks.reduce((sum, c) => sum + (c.responseTime || 0), 0) / healthChecks.length : 0;
    
    return {
      totalHealthChecks: healthChecks.length,
      healthyChecks,
      unhealthyChecks,
      totalAlerts: alerts.length,
      activeAlerts,
      resolvedAlerts,
      averageResponseTime,
      uptime: process.uptime(),
      lastUpdate: new Date(),
    };
  }

  /**
   * Generate monitoring report
   */
  async generateReport(
    name: string,
    period: MonitoringReport['period'],
    startDate?: Date,
    endDate?: Date
  ): Promise<MonitoringReport> {
    const timer = performance.startTimer('generate_monitoring_report');
    
    try {
      // Calculate date range if not provided
      if (!endDate) {
        endDate = new Date();
      }
      
      if (!startDate) {
        startDate = new Date(endDate);
        switch (period) {
          case 'hour':
            startDate.setHours(startDate.getHours() - 1);
            break;
          case 'day':
            startDate.setDate(startDate.getDate() - 1);
            break;
          case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        }
      }
      
      // Collect data
      const healthCheckResults: HealthCheckResult[] = [];
      for (const check of this.healthChecker.getAllChecks()) {
        const results = this.healthChecker.getCheckResults(check.id)
          .filter(r => r.timestamp >= startDate! && r.timestamp <= endDate!);
        healthCheckResults.push(...results);
      }
      
      const systemMetrics = this.metricsCollector.getSystemMetrics(startDate, endDate);
      const alerts = this.alertManager.getAlerts()
        .filter(a => a.timestamp >= startDate! && a.timestamp <= endDate!);
      
      const report: MonitoringReport = {
        id: CryptoUtils.generateUUID(),
        name,
        period,
        startDate,
        endDate,
        healthChecks: healthCheckResults,
        metrics: systemMetrics,
        alerts,
        summary: this.getStats(),
        generatedAt: new Date(),
      };
      
      logger.info('Monitoring report generated', {
        reportId: report.id,
        name,
        period,
        healthCheckCount: healthCheckResults.length,
        metricsCount: systemMetrics.length,
        alertCount: alerts.length,
      });
      
      return report;
    } catch (error) {
      logger.error('Failed to generate monitoring report', { error, name, period });
      throw new MonitoringError(
        'Failed to generate monitoring report',
        'REPORT_GENERATION_FAILED'
      );
    } finally {
      timer();
    }
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'unhealthy' | 'degraded';
    checks: HealthCheck[];
    alerts: Alert[];
    uptime: number;
  } {
    return {
      status: this.healthChecker.getOverallHealth(),
      checks: this.healthChecker.getAllChecks(),
      alerts: this.alertManager.getAlerts(false), // Only active alerts
      uptime: process.uptime(),
    };
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    // Set up periodic threshold checking
    setInterval(async () => {
      try {
        const metrics = await this.metricsCollector.collectSystemMetrics();
        await this.alertManager.checkThresholds(metrics);
      } catch (error) {
        logger.error('Monitoring loop error', { error });
      }
    }, 60000); // Check every minute
    
    // Set up periodic cleanup
    setInterval(() => {
      this.metricsCollector.clearOldMetrics();
    }, 24 * 60 * 60 * 1000); // Clean up daily
  }

  /**
   * Destroy monitoring service
   */
  destroy(): void {
    this.healthChecker.destroy();
    this.metricsCollector.destroy();
    
    logger.info('Monitoring service destroyed');
  }
}

// Monitoring utilities
export class MonitoringUtils {
  /**
   * Create HTTP health check
   */
  static createHttpCheck(
    name: string,
    endpoint: string,
    options: Partial<HealthCheck> = {}
  ): Omit<HealthCheck, 'id' | 'status' | 'lastCheck'> {
    return {
      name,
      description: `HTTP health check for ${endpoint}`,
      type: 'http',
      endpoint,
      timeout: 5000,
      interval: 30000,
      retries: 3,
      enabled: true,
      ...options,
    };
  }

  /**
   * Create database health check
   */
  static createDatabaseCheck(
    name: string,
    options: Partial<HealthCheck> = {}
  ): Omit<HealthCheck, 'id' | 'status' | 'lastCheck'> {
    return {
      name,
      description: `Database health check for ${name}`,
      type: 'database',
      timeout: 5000,
      interval: 60000,
      retries: 2,
      enabled: true,
      ...options,
    };
  }

  /**
   * Create service health check
   */
  static createServiceCheck(
    name: string,
    options: Partial<HealthCheck> = {}
  ): Omit<HealthCheck, 'id' | 'status' | 'lastCheck'> {
    return {
      name,
      description: `Service health check for ${name}`,
      type: 'service',
      timeout: 10000,
      interval: 60000,
      retries: 2,
      enabled: true,
      ...options,
    };
  }

  /**
   * Format bytes
   */
  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Format duration
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Calculate uptime percentage
   */
  static calculateUptime(
    healthCheckResults: HealthCheckResult[],
    period: number
  ): number {
    if (healthCheckResults.length === 0) {
      return 100;
    }
    
    const healthyResults = healthCheckResults.filter(r => r.status === 'healthy').length;
    return (healthyResults / healthCheckResults.length) * 100;
  }
}

// Default monitoring service instance
export const monitoring = new MonitoringService({
  enableHealthChecks: true,
  enableMetrics: true,
  enableAlerting: true,
  enablePerformanceTracking: true,
  healthCheckInterval: 30000,
  metricsRetentionDays: 7,
  alertThresholds: {
    cpuUsage: 80,
    memoryUsage: 85,
    diskUsage: 90,
    responseTime: 5000,
    errorRate: 5,
    requestRate: 1000,
  },
  notificationChannels: ['email'],
});

export default MonitoringService;