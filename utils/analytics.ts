import logger from '../config/logger';
import { performance } from '../config/monitoring';
import { CryptoUtils } from './crypto';
import { CacheManager } from './cache';

// Analytics interfaces
export interface AnalyticsConfig {
  enableTracking: boolean;
  enableUserTracking: boolean;
  enablePerformanceTracking: boolean;
  enableErrorTracking: boolean;
  batchSize: number;
  flushInterval: number;
  retentionDays: number;
  anonymizeIPs: boolean;
  enableRealTime: boolean;
}

export interface AnalyticsEvent {
  id: string;
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  properties: Record<string, any>;
  context: AnalyticsContext;
}

export interface AnalyticsContext {
  userAgent?: string;
  ip?: string;
  country?: string;
  city?: string;
  device?: DeviceInfo;
  browser?: BrowserInfo;
  page?: PageInfo;
  referrer?: string;
  utm?: UTMParameters;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  osVersion: string;
  brand?: string;
  model?: string;
  screenResolution?: string;
}

export interface BrowserInfo {
  name: string;
  version: string;
  language: string;
  timezone: string;
  cookieEnabled: boolean;
}

export interface PageInfo {
  url: string;
  title: string;
  path: string;
  search: string;
  hash: string;
  loadTime?: number;
}

export interface UTMParameters {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface UserSession {
  id: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pageViews: number;
  events: number;
  bounced: boolean;
  converted: boolean;
  context: AnalyticsContext;
}

export interface AnalyticsMetrics {
  totalEvents: number;
  totalUsers: number;
  totalSessions: number;
  averageSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  topEvents: EventMetric[];
  topPages: PageMetric[];
  userGrowth: GrowthMetric[];
  performanceMetrics: PerformanceMetric[];
}

export interface EventMetric {
  type: string;
  count: number;
  percentage: number;
  trend: number;
}

export interface PageMetric {
  path: string;
  views: number;
  uniqueViews: number;
  averageTime: number;
  bounceRate: number;
}

export interface GrowthMetric {
  date: string;
  newUsers: number;
  returningUsers: number;
  totalUsers: number;
  growth: number;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  percentile95?: number;
  percentile99?: number;
}

export interface AnalyticsQuery {
  startDate: Date;
  endDate: Date;
  filters?: AnalyticsFilter[];
  groupBy?: string[];
  metrics?: string[];
  limit?: number;
  offset?: number;
}

export interface AnalyticsFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: any;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  description: string;
  query: AnalyticsQuery;
  data: any[];
  generatedAt: Date;
  format: 'json' | 'csv' | 'pdf';
}

// Analytics error class
export class AnalyticsError extends Error {
  constructor(
    message: string,
    public code: string,
    public eventId?: string
  ) {
    super(message);
    this.name = 'AnalyticsError';
  }
}

// Event tracker
export class EventTracker {
  private events: AnalyticsEvent[] = [];
  private config: Required<AnalyticsConfig>;
  private flushTimer?: NodeJS.Timeout;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enableTracking: true,
      enableUserTracking: true,
      enablePerformanceTracking: true,
      enableErrorTracking: true,
      batchSize: 100,
      flushInterval: 30000, // 30 seconds
      retentionDays: 90,
      anonymizeIPs: true,
      enableRealTime: false,
      ...config,
    };

    if (this.config.enableTracking) {
      this.startFlushTimer();
    }
  }

  /**
   * Track event
   */
  track(
    type: string,
    category: string,
    action: string,
    properties: Record<string, any> = {},
    context: Partial<AnalyticsContext> = {}
  ): string {
    if (!this.config.enableTracking) {
      return '';
    }

    const timer = performance.startTimer('analytics_track_event');
    
    try {
      const event: AnalyticsEvent = {
        id: CryptoUtils.generateUUID(),
        type,
        category,
        action,
        label: properties.label,
        value: properties.value,
        userId: properties.userId,
        sessionId: this.getSessionId(),
        timestamp: new Date(),
        properties,
        context: {
          userAgent: context.userAgent,
          ip: this.config.anonymizeIPs ? this.anonymizeIP(context.ip) : context.ip,
          country: context.country,
          city: context.city,
          device: context.device,
          browser: context.browser,
          page: context.page,
          referrer: context.referrer,
          utm: context.utm,
          ...context,
        },
      };

      this.events.push(event);

      // Flush if batch size reached
      if (this.events.length >= this.config.batchSize) {
        this.flush();
      }

      // Real-time processing
      if (this.config.enableRealTime) {
        this.processEventRealTime(event);
      }

      logger.debug('Event tracked', {
        eventId: event.id,
        type,
        category,
        action,
      });

      return event.id;
    } catch (error) {
      logger.error('Failed to track event', { error, type, category, action });
      throw new AnalyticsError(
        'Failed to track event',
        'TRACK_ERROR'
      );
    } finally {
      timer();
    }
  }

  /**
   * Track page view
   */
  trackPageView(
    url: string,
    title: string,
    properties: Record<string, any> = {},
    context: Partial<AnalyticsContext> = {}
  ): string {
    const pageInfo: PageInfo = {
      url,
      title,
      path: new URL(url).pathname,
      search: new URL(url).search,
      hash: new URL(url).hash,
      loadTime: properties.loadTime,
    };

    return this.track(
      'page_view',
      'navigation',
      'view',
      { ...properties, page: pageInfo },
      { ...context, page: pageInfo }
    );
  }

  /**
   * Track user action
   */
  trackUserAction(
    action: string,
    element: string,
    properties: Record<string, any> = {},
    context: Partial<AnalyticsContext> = {}
  ): string {
    return this.track(
      'user_action',
      'interaction',
      action,
      { ...properties, element },
      context
    );
  }

  /**
   * Track conversion
   */
  trackConversion(
    goal: string,
    value?: number,
    properties: Record<string, any> = {},
    context: Partial<AnalyticsContext> = {}
  ): string {
    return this.track(
      'conversion',
      'goal',
      goal,
      { ...properties, value },
      context
    );
  }

  /**
   * Track error
   */
  trackError(
    error: Error,
    properties: Record<string, any> = {},
    context: Partial<AnalyticsContext> = {}
  ): string {
    if (!this.config.enableErrorTracking) {
      return '';
    }

    return this.track(
      'error',
      'system',
      'error_occurred',
      {
        ...properties,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
      },
      context
    );
  }

  /**
   * Track performance metric
   */
  trackPerformance(
    name: string,
    value: number,
    unit: string,
    properties: Record<string, any> = {},
    context: Partial<AnalyticsContext> = {}
  ): string {
    if (!this.config.enablePerformanceTracking) {
      return '';
    }

    return this.track(
      'performance',
      'metric',
      name,
      {
        ...properties,
        metricName: name,
        metricValue: value,
        metricUnit: unit,
      },
      context
    );
  }

  /**
   * Flush events
   */
  async flush(): Promise<void> {
    if (this.events.length === 0) {
      return;
    }

    const timer = performance.startTimer('analytics_flush_events');
    
    try {
      const eventsToFlush = [...this.events];
      this.events = [];

      // In production, send to analytics service
      await this.sendEvents(eventsToFlush);

      logger.debug('Events flushed', {
        eventCount: eventsToFlush.length,
      });
    } catch (error) {
      logger.error('Failed to flush events', { error });
      // Re-add events back to queue on failure
      this.events.unshift(...this.events);
    } finally {
      timer();
    }
  }

  /**
   * Get pending events count
   */
  getPendingEventsCount(): number {
    return this.events.length;
  }

  /**
   * Clear pending events
   */
  clearPendingEvents(): void {
    this.events = [];
  }

  /**
   * Destroy tracker
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    
    // Flush remaining events
    this.flush().catch(error => {
      logger.error('Failed to flush events on destroy', { error });
    });
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        logger.error('Scheduled flush failed', { error });
      });
    }, this.config.flushInterval);
  }

  /**
   * Send events to analytics service
   */
  private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
    // Mock implementation - replace with actual analytics service
    logger.info('Sending events to analytics service', {
      eventCount: events.length,
      events: events.map(e => ({
        id: e.id,
        type: e.type,
        category: e.category,
        action: e.action,
        timestamp: e.timestamp,
      })),
    });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Process event in real-time
   */
  private processEventRealTime(event: AnalyticsEvent): void {
    // Real-time processing logic
    logger.debug('Processing event in real-time', {
      eventId: event.id,
      type: event.type,
    });
  }

  /**
   * Get session ID
   */
  private getSessionId(): string {
    // In browser environment, use sessionStorage
    // In server environment, generate or use from request
    return CryptoUtils.generateUUID();
  }

  /**
   * Anonymize IP address
   */
  private anonymizeIP(ip?: string): string | undefined {
    if (!ip) return undefined;
    
    // IPv4: Remove last octet
    if (ip.includes('.')) {
      const parts = ip.split('.');
      return parts.slice(0, 3).join('.') + '.0';
    }
    
    // IPv6: Remove last 80 bits
    if (ip.includes(':')) {
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + '::0';
    }
    
    return ip;
  }
}

// Analytics service
export class AnalyticsService {
  private config: Required<AnalyticsConfig>;
  private eventTracker: EventTracker;
  private cache: CacheManager;
  private events = new Map<string, AnalyticsEvent>();
  private sessions = new Map<string, UserSession>();
  private metrics: AnalyticsMetrics;

  constructor(
    config: Partial<AnalyticsConfig> = {},
    cache?: CacheManager
  ) {
    this.config = {
      enableTracking: true,
      enableUserTracking: true,
      enablePerformanceTracking: true,
      enableErrorTracking: true,
      batchSize: 100,
      flushInterval: 30000,
      retentionDays: 90,
      anonymizeIPs: true,
      enableRealTime: false,
      ...config,
    };

    this.eventTracker = new EventTracker(this.config);
    this.cache = cache || new CacheManager();
    
    this.metrics = {
      totalEvents: 0,
      totalUsers: 0,
      totalSessions: 0,
      averageSessionDuration: 0,
      bounceRate: 0,
      conversionRate: 0,
      topEvents: [],
      topPages: [],
      userGrowth: [],
      performanceMetrics: [],
    };
  }

  /**
   * Track event
   */
  track(
    type: string,
    category: string,
    action: string,
    properties: Record<string, any> = {},
    context: Partial<AnalyticsContext> = {}
  ): string {
    const eventId = this.eventTracker.track(type, category, action, properties, context);
    
    // Store event for analytics
    if (eventId) {
      const event: AnalyticsEvent = {
        id: eventId,
        type,
        category,
        action,
        label: properties.label,
        value: properties.value,
        userId: properties.userId,
        sessionId: this.eventTracker['getSessionId'](),
        timestamp: new Date(),
        properties,
        context: context as AnalyticsContext,
      };
      
      this.events.set(eventId, event);
      this.updateMetrics(event);
    }
    
    return eventId;
  }

  /**
   * Start user session
   */
  startSession(
    userId?: string,
    context: Partial<AnalyticsContext> = {}
  ): string {
    const sessionId = CryptoUtils.generateUUID();
    
    const session: UserSession = {
      id: sessionId,
      userId,
      startTime: new Date(),
      pageViews: 0,
      events: 0,
      bounced: true,
      converted: false,
      context: context as AnalyticsContext,
    };
    
    this.sessions.set(sessionId, session);
    
    logger.debug('Session started', {
      sessionId,
      userId,
    });
    
    return sessionId;
  }

  /**
   * End user session
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    
    session.endTime = new Date();
    session.duration = session.endTime.getTime() - session.startTime.getTime();
    
    // Update bounce status
    session.bounced = session.pageViews <= 1 && session.events <= 1;
    
    logger.debug('Session ended', {
      sessionId,
      duration: session.duration,
      pageViews: session.pageViews,
      events: session.events,
      bounced: session.bounced,
    });
  }

  /**
   * Get analytics metrics
   */
  getMetrics(query?: AnalyticsQuery): AnalyticsMetrics {
    if (query) {
      return this.calculateMetrics(query);
    }
    
    return { ...this.metrics };
  }

  /**
   * Get events
   */
  getEvents(query: AnalyticsQuery): AnalyticsEvent[] {
    let events = Array.from(this.events.values());
    
    // Apply date filter
    events = events.filter(event => 
      event.timestamp >= query.startDate && 
      event.timestamp <= query.endDate
    );
    
    // Apply filters
    if (query.filters) {
      events = events.filter(event => 
        query.filters!.every(filter => this.applyFilter(event, filter))
      );
    }
    
    // Apply limit and offset
    const offset = query.offset || 0;
    const limit = query.limit || 1000;
    
    return events.slice(offset, offset + limit);
  }

  /**
   * Get sessions
   */
  getSessions(query: AnalyticsQuery): UserSession[] {
    let sessions = Array.from(this.sessions.values());
    
    // Apply date filter
    sessions = sessions.filter(session => 
      session.startTime >= query.startDate && 
      session.startTime <= query.endDate
    );
    
    // Apply filters
    if (query.filters) {
      sessions = sessions.filter(session => 
        query.filters!.every(filter => this.applySessionFilter(session, filter))
      );
    }
    
    // Apply limit and offset
    const offset = query.offset || 0;
    const limit = query.limit || 1000;
    
    return sessions.slice(offset, offset + limit);
  }

  /**
   * Generate report
   */
  async generateReport(
    name: string,
    description: string,
    query: AnalyticsQuery,
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<AnalyticsReport> {
    const timer = performance.startTimer('analytics_generate_report');
    
    try {
      const reportId = CryptoUtils.generateUUID();
      
      // Get data based on query
      const events = this.getEvents(query);
      const sessions = this.getSessions(query);
      const metrics = this.calculateMetrics(query);
      
      const data = {
        events,
        sessions,
        metrics,
        summary: {
          totalEvents: events.length,
          totalSessions: sessions.length,
          dateRange: {
            start: query.startDate,
            end: query.endDate,
          },
        },
      };
      
      const report: AnalyticsReport = {
        id: reportId,
        name,
        description,
        query,
        data: format === 'json' ? [data] : this.formatReportData(data, format),
        generatedAt: new Date(),
        format,
      };
      
      logger.info('Analytics report generated', {
        reportId,
        name,
        format,
        eventCount: events.length,
        sessionCount: sessions.length,
      });
      
      return report;
    } catch (error) {
      logger.error('Failed to generate analytics report', { error, name, query });
      throw new AnalyticsError(
        'Failed to generate report',
        'REPORT_ERROR'
      );
    } finally {
      timer();
    }
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics(): any {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentEvents = Array.from(this.events.values())
      .filter(event => event.timestamp >= oneHourAgo);
    
    const activeSessions = Array.from(this.sessions.values())
      .filter(session => !session.endTime || session.endTime >= oneHourAgo);
    
    return {
      activeUsers: new Set(activeSessions.map(s => s.userId).filter(Boolean)).size,
      activeSessions: activeSessions.length,
      eventsLastHour: recentEvents.length,
      topPages: this.getTopPages(recentEvents),
      topEvents: this.getTopEvents(recentEvents),
      timestamp: now,
    };
  }

  /**
   * Clear old data
   */
  clearOldData(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    
    // Clear old events
    for (const [eventId, event] of this.events.entries()) {
      if (event.timestamp < cutoffDate) {
        this.events.delete(eventId);
      }
    }
    
    // Clear old sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.startTime < cutoffDate) {
        this.sessions.delete(sessionId);
      }
    }
    
    logger.info('Old analytics data cleared', {
      cutoffDate,
      retentionDays: this.config.retentionDays,
    });
  }

  /**
   * Update metrics
   */
  private updateMetrics(event: AnalyticsEvent): void {
    this.metrics.totalEvents++;
    
    // Update session
    const session = this.sessions.get(event.sessionId);
    if (session) {
      session.events++;
      
      if (event.type === 'page_view') {
        session.pageViews++;
      }
      
      if (event.type === 'conversion') {
        session.converted = true;
      }
    }
  }

  /**
   * Calculate metrics for query
   */
  private calculateMetrics(query: AnalyticsQuery): AnalyticsMetrics {
    const events = this.getEvents(query);
    const sessions = this.getSessions(query);
    
    const uniqueUsers = new Set(sessions.map(s => s.userId).filter(Boolean)).size;
    const totalSessions = sessions.length;
    const bouncedSessions = sessions.filter(s => s.bounced).length;
    const convertedSessions = sessions.filter(s => s.converted).length;
    
    const averageSessionDuration = sessions.length > 0 ? 
      sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length : 0;
    
    return {
      totalEvents: events.length,
      totalUsers: uniqueUsers,
      totalSessions,
      averageSessionDuration,
      bounceRate: totalSessions > 0 ? bouncedSessions / totalSessions : 0,
      conversionRate: totalSessions > 0 ? convertedSessions / totalSessions : 0,
      topEvents: this.getTopEvents(events),
      topPages: this.getTopPages(events),
      userGrowth: this.calculateUserGrowth(sessions),
      performanceMetrics: this.getPerformanceMetrics(events),
    };
  }

  /**
   * Apply filter to event
   */
  private applyFilter(event: AnalyticsEvent, filter: AnalyticsFilter): boolean {
    const value = this.getEventFieldValue(event, filter.field);
    
    switch (filter.operator) {
      case 'eq': return value === filter.value;
      case 'ne': return value !== filter.value;
      case 'gt': return value > filter.value;
      case 'gte': return value >= filter.value;
      case 'lt': return value < filter.value;
      case 'lte': return value <= filter.value;
      case 'in': return Array.isArray(filter.value) && filter.value.includes(value);
      case 'nin': return Array.isArray(filter.value) && !filter.value.includes(value);
      case 'contains': return typeof value === 'string' && value.includes(filter.value);
      default: return true;
    }
  }

  /**
   * Apply filter to session
   */
  private applySessionFilter(session: UserSession, filter: AnalyticsFilter): boolean {
    const value = this.getSessionFieldValue(session, filter.field);
    
    switch (filter.operator) {
      case 'eq': return value === filter.value;
      case 'ne': return value !== filter.value;
      case 'gt': return value > filter.value;
      case 'gte': return value >= filter.value;
      case 'lt': return value < filter.value;
      case 'lte': return value <= filter.value;
      case 'in': return Array.isArray(filter.value) && filter.value.includes(value);
      case 'nin': return Array.isArray(filter.value) && !filter.value.includes(value);
      case 'contains': return typeof value === 'string' && value.includes(filter.value);
      default: return true;
    }
  }

  /**
   * Get event field value
   */
  private getEventFieldValue(event: AnalyticsEvent, field: string): any {
    const parts = field.split('.');
    let value: any = event;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Get session field value
   */
  private getSessionFieldValue(session: UserSession, field: string): any {
    const parts = field.split('.');
    let value: any = session;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Get top events
   */
  private getTopEvents(events: AnalyticsEvent[]): EventMetric[] {
    const eventCounts = new Map<string, number>();
    
    for (const event of events) {
      const key = `${event.category}:${event.action}`;
      eventCounts.set(key, (eventCounts.get(key) || 0) + 1);
    }
    
    const total = events.length;
    
    return Array.from(eventCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? count / total : 0,
        trend: 0, // Calculate trend based on historical data
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Get top pages
   */
  private getTopPages(events: AnalyticsEvent[]): PageMetric[] {
    const pageViews = events.filter(e => e.type === 'page_view');
    const pageCounts = new Map<string, { views: number; uniqueViews: Set<string>; totalTime: number }>();
    
    for (const event of pageViews) {
      const path = event.context.page?.path || 'unknown';
      const existing = pageCounts.get(path) || { views: 0, uniqueViews: new Set(), totalTime: 0 };
      
      existing.views++;
      if (event.sessionId) {
        existing.uniqueViews.add(event.sessionId);
      }
      existing.totalTime += event.properties.loadTime || 0;
      
      pageCounts.set(path, existing);
    }
    
    return Array.from(pageCounts.entries())
      .map(([path, data]) => ({
        path,
        views: data.views,
        uniqueViews: data.uniqueViews.size,
        averageTime: data.views > 0 ? data.totalTime / data.views : 0,
        bounceRate: 0, // Calculate based on session data
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }

  /**
   * Calculate user growth
   */
  private calculateUserGrowth(sessions: UserSession[]): GrowthMetric[] {
    const dailyUsers = new Map<string, { new: Set<string>; returning: Set<string> }>();
    const seenUsers = new Set<string>();
    
    for (const session of sessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())) {
      if (!session.userId) continue;
      
      const date = session.startTime.toISOString().split('T')[0];
      const existing = dailyUsers.get(date) || { new: new Set(), returning: new Set() };
      
      if (seenUsers.has(session.userId)) {
        existing.returning.add(session.userId);
      } else {
        existing.new.add(session.userId);
        seenUsers.add(session.userId);
      }
      
      dailyUsers.set(date, existing);
    }
    
    return Array.from(dailyUsers.entries())
      .map(([date, data]) => {
        const newUsers = data.new.size;
        const returningUsers = data.returning.size;
        const totalUsers = newUsers + returningUsers;
        
        return {
          date,
          newUsers,
          returningUsers,
          totalUsers,
          growth: 0, // Calculate based on previous day
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get performance metrics
   */
  private getPerformanceMetrics(events: AnalyticsEvent[]): PerformanceMetric[] {
    const performanceEvents = events.filter(e => e.type === 'performance');
    const metrics = new Map<string, number[]>();
    
    for (const event of performanceEvents) {
      const name = event.properties.metricName;
      const value = event.properties.metricValue;
      
      if (name && typeof value === 'number') {
        if (!metrics.has(name)) {
          metrics.set(name, []);
        }
        metrics.get(name)!.push(value);
      }
    }
    
    return Array.from(metrics.entries())
      .map(([name, values]) => {
        const sorted = values.sort((a, b) => a - b);
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const p95Index = Math.floor(sorted.length * 0.95);
        const p99Index = Math.floor(sorted.length * 0.99);
        
        return {
          name,
          value: avg,
          unit: 'ms', // Default unit
          timestamp: new Date(),
          percentile95: sorted[p95Index],
          percentile99: sorted[p99Index],
        };
      });
  }

  /**
   * Format report data
   */
  private formatReportData(data: any, format: 'csv' | 'pdf'): any[] {
    if (format === 'csv') {
      // Convert to CSV format
      return data.events.map((event: AnalyticsEvent) => ({
        id: event.id,
        type: event.type,
        category: event.category,
        action: event.action,
        timestamp: event.timestamp.toISOString(),
        userId: event.userId,
        sessionId: event.sessionId,
      }));
    }
    
    // PDF format would require additional processing
    return [data];
  }
}

// Analytics utilities
export class AnalyticsUtils {
  /**
   * Parse user agent
   */
  static parseUserAgent(userAgent: string): { browser: BrowserInfo; device: DeviceInfo } {
    // Simple user agent parsing - in production, use a proper library
    const browser: BrowserInfo = {
      name: 'Unknown',
      version: '0.0.0',
      language: 'en',
      timezone: 'UTC',
      cookieEnabled: true,
    };
    
    const device: DeviceInfo = {
      type: 'desktop',
      os: 'Unknown',
      osVersion: '0.0.0',
    };
    
    // Basic parsing
    if (userAgent.includes('Chrome')) {
      browser.name = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      browser.name = 'Firefox';
    } else if (userAgent.includes('Safari')) {
      browser.name = 'Safari';
    }
    
    if (userAgent.includes('Mobile')) {
      device.type = 'mobile';
    } else if (userAgent.includes('Tablet')) {
      device.type = 'tablet';
    }
    
    if (userAgent.includes('Windows')) {
      device.os = 'Windows';
    } else if (userAgent.includes('Mac')) {
      device.os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      device.os = 'Linux';
    }
    
    return { browser, device };
  }

  /**
   * Extract UTM parameters
   */
  static extractUTMParameters(url: string): UTMParameters {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    return {
      source: params.get('utm_source') || undefined,
      medium: params.get('utm_medium') || undefined,
      campaign: params.get('utm_campaign') || undefined,
      term: params.get('utm_term') || undefined,
      content: params.get('utm_content') || undefined,
    };
  }

  /**
   * Generate analytics query
   */
  static createQuery(
    startDate: Date,
    endDate: Date,
    options: Partial<AnalyticsQuery> = {}
  ): AnalyticsQuery {
    return {
      startDate,
      endDate,
      filters: [],
      groupBy: [],
      metrics: [],
      limit: 1000,
      offset: 0,
      ...options,
    };
  }

  /**
   * Add filter to query
   */
  static addFilter(
    query: AnalyticsQuery,
    field: string,
    operator: AnalyticsFilter['operator'],
    value: any
  ): AnalyticsQuery {
    return {
      ...query,
      filters: [...(query.filters || []), { field, operator, value }],
    };
  }

  /**
   * Calculate conversion funnel
   */
  static calculateFunnel(
    events: AnalyticsEvent[],
    steps: string[]
  ): Array<{ step: string; users: number; conversionRate: number }> {
    const userSteps = new Map<string, Set<string>>();
    
    // Track which steps each user completed
    for (const event of events) {
      if (!event.userId) continue;
      
      const stepKey = `${event.category}:${event.action}`;
      if (steps.includes(stepKey)) {
        if (!userSteps.has(event.userId)) {
          userSteps.set(event.userId, new Set());
        }
        userSteps.get(event.userId)!.add(stepKey);
      }
    }
    
    const totalUsers = userSteps.size;
    const funnel: Array<{ step: string; users: number; conversionRate: number }> = [];
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      let usersAtStep = 0;
      
      for (const [userId, completedSteps] of userSteps.entries()) {
        // Check if user completed this step and all previous steps
        const completedAllPrevious = steps.slice(0, i + 1).every(s => completedSteps.has(s));
        if (completedAllPrevious) {
          usersAtStep++;
        }
      }
      
      funnel.push({
        step,
        users: usersAtStep,
        conversionRate: totalUsers > 0 ? usersAtStep / totalUsers : 0,
      });
    }
    
    return funnel;
  }
}

// Default analytics service instance
export const analytics = new AnalyticsService({
  enableTracking: true,
  enableUserTracking: true,
  enablePerformanceTracking: true,
  enableErrorTracking: true,
  batchSize: 100,
  flushInterval: 30000,
  retentionDays: 90,
  anonymizeIPs: true,
  enableRealTime: false,
});

export default AnalyticsService;