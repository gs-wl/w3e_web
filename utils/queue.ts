import logger from '../config/logger';
import { performance } from '../config/monitoring';
import { CryptoUtils } from './crypto';

// Queue interfaces
export interface QueueConfig {
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  enableLogging: boolean;
  enableMetrics: boolean;
  deadLetterQueue?: boolean;
}

export interface Job<T = any> {
  id: string;
  type: string;
  data: T;
  priority: number;
  attempts: number;
  maxAttempts: number;
  delay: number;
  timeout: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  result?: any;
  metadata?: Record<string, any>;
}

export interface JobOptions {
  priority?: number;
  delay?: number;
  timeout?: number;
  maxAttempts?: number;
  metadata?: Record<string, any>;
}

export interface QueueStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  activeJobs: number;
  waitingJobs: number;
  delayedJobs: number;
  processingRate: number;
  averageProcessingTime: number;
}

export interface JobProcessor<T = any> {
  (job: Job<T>): Promise<any>;
}

export interface QueueEvents {
  'job:added': (job: Job) => void;
  'job:started': (job: Job) => void;
  'job:completed': (job: Job, result: any) => void;
  'job:failed': (job: Job, error: Error) => void;
  'job:retry': (job: Job) => void;
  'queue:empty': () => void;
  'queue:error': (error: Error) => void;
}

// Queue error class
export class QueueError extends Error {
  constructor(
    message: string,
    public code: string,
    public jobId?: string
  ) {
    super(message);
    this.name = 'QueueError';
  }
}

// Job queue implementation
export class JobQueue {
  private config: Required<QueueConfig>;
  private jobs = new Map<string, Job>();
  private waitingJobs: Job[] = [];
  private activeJobs = new Map<string, Job>();
  private delayedJobs = new Map<string, NodeJS.Timeout>();
  private processors = new Map<string, JobProcessor>();
  private stats: QueueStats;
  private eventListeners = new Map<keyof QueueEvents, Function[]>();
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = {
      maxConcurrency: 5,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
      enableLogging: true,
      enableMetrics: true,
      deadLetterQueue: true,
      ...config,
    };

    this.stats = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      activeJobs: 0,
      waitingJobs: 0,
      delayedJobs: 0,
      processingRate: 0,
      averageProcessingTime: 0,
    };

    this.startProcessing();
  }

  /**
   * Add job to queue
   */
  async addJob<T>(
    type: string,
    data: T,
    options: JobOptions = {}
  ): Promise<string> {
    const timer = performance.startTimer('queue_add_job');
    
    try {
      const job: Job<T> = {
        id: CryptoUtils.generateUUID(),
        type,
        data,
        priority: options.priority || 0,
        attempts: 0,
        maxAttempts: options.maxAttempts || this.config.retryAttempts,
        delay: options.delay || 0,
        timeout: options.timeout || this.config.timeout,
        createdAt: new Date(),
        metadata: options.metadata,
      };

      this.jobs.set(job.id, job);
      this.stats.totalJobs++;

      if (job.delay > 0) {
        // Schedule delayed job
        const timeout = setTimeout(() => {
          this.delayedJobs.delete(job.id);
          this.addToWaitingQueue(job);
        }, job.delay);
        
        this.delayedJobs.set(job.id, timeout);
        this.stats.delayedJobs++;
      } else {
        this.addToWaitingQueue(job);
      }

      this.emit('job:added', job);

      if (this.config.enableLogging) {
        logger.info('Job added to queue', {
          jobId: job.id,
          type: job.type,
          priority: job.priority,
          delay: job.delay,
        });
      }

      return job.id;
    } catch (error) {
      logger.error('Failed to add job to queue', { error, type, data });
      throw new QueueError(
        `Failed to add job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ADD_JOB_ERROR'
      );
    } finally {
      timer();
    }
  }

  /**
   * Register job processor
   */
  registerProcessor<T>(type: string, processor: JobProcessor<T>): void {
    this.processors.set(type, processor);
    
    if (this.config.enableLogging) {
      logger.info('Job processor registered', { type });
    }
  }

  /**
   * Remove job processor
   */
  removeProcessor(type: string): boolean {
    const removed = this.processors.delete(type);
    
    if (removed && this.config.enableLogging) {
      logger.info('Job processor removed', { type });
    }
    
    return removed;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = this.jobs.get(jobId);
      if (!job) {
        return false;
      }

      // Remove from delayed jobs
      const delayedTimeout = this.delayedJobs.get(jobId);
      if (delayedTimeout) {
        clearTimeout(delayedTimeout);
        this.delayedJobs.delete(jobId);
        this.stats.delayedJobs--;
      }

      // Remove from waiting queue
      const waitingIndex = this.waitingJobs.findIndex(j => j.id === jobId);
      if (waitingIndex !== -1) {
        this.waitingJobs.splice(waitingIndex, 1);
        this.stats.waitingJobs--;
      }

      // Cannot cancel active jobs (they need to complete or timeout)
      if (this.activeJobs.has(jobId)) {
        return false;
      }

      this.jobs.delete(jobId);

      if (this.config.enableLogging) {
        logger.info('Job cancelled', { jobId });
      }

      return true;
    } catch (error) {
      logger.error('Failed to cancel job', { error, jobId });
      return false;
    }
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    try {
      const job = this.jobs.get(jobId);
      if (!job || !job.failedAt) {
        return false;
      }

      // Reset job state
      job.attempts = 0;
      job.error = undefined;
      job.failedAt = undefined;
      job.processedAt = undefined;

      this.addToWaitingQueue(job);
      this.emit('job:retry', job);

      if (this.config.enableLogging) {
        logger.info('Job retried', { jobId });
      }

      return true;
    } catch (error) {
      logger.error('Failed to retry job', { error, jobId });
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    return {
      ...this.stats,
      activeJobs: this.activeJobs.size,
      waitingJobs: this.waitingJobs.length,
      delayedJobs: this.delayedJobs.size,
    };
  }

  /**
   * Clear all jobs
   */
  async clear(): Promise<void> {
    try {
      // Clear delayed jobs
      for (const timeout of this.delayedJobs.values()) {
        clearTimeout(timeout);
      }
      this.delayedJobs.clear();

      // Clear waiting jobs
      this.waitingJobs.length = 0;

      // Clear all jobs (active jobs will complete naturally)
      this.jobs.clear();

      // Reset stats
      this.stats = {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        activeJobs: 0,
        waitingJobs: 0,
        delayedJobs: 0,
        processingRate: 0,
        averageProcessingTime: 0,
      };

      if (this.config.enableLogging) {
        logger.info('Queue cleared');
      }
    } catch (error) {
      logger.error('Failed to clear queue', { error });
      throw new QueueError(
        'Failed to clear queue',
        'CLEAR_ERROR'
      );
    }
  }

  /**
   * Pause queue processing
   */
  pause(): void {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    if (this.config.enableLogging) {
      logger.info('Queue processing paused');
    }
  }

  /**
   * Resume queue processing
   */
  resume(): void {
    if (!this.isProcessing) {
      this.startProcessing();
      
      if (this.config.enableLogging) {
        logger.info('Queue processing resumed');
      }
    }
  }

  /**
   * Add event listener
   */
  on<K extends keyof QueueEvents>(event: K, listener: QueueEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof QueueEvents>(event: K, listener: QueueEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit<K extends keyof QueueEvents>(event: K, ...args: Parameters<QueueEvents[K]>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          (listener as any)(...args);
        } catch (error) {
          logger.error('Event listener error', { error, event });
        }
      }
    }
  }

  /**
   * Start processing jobs
   */
  private startProcessing(): void {
    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processJobs().catch(error => {
        logger.error('Job processing error', { error });
        this.emit('queue:error', error);
      });
    }, 100); // Check every 100ms
  }

  /**
   * Process waiting jobs
   */
  private async processJobs(): Promise<void> {
    if (!this.isProcessing || this.activeJobs.size >= this.config.maxConcurrency) {
      return;
    }

    // Sort jobs by priority (higher priority first)
    this.waitingJobs.sort((a, b) => b.priority - a.priority);

    const job = this.waitingJobs.shift();
    if (!job) {
      if (this.activeJobs.size === 0) {
        this.emit('queue:empty');
      }
      return;
    }

    this.stats.waitingJobs--;
    await this.processJob(job);
  }

  /**
   * Process individual job
   */
  private async processJob(job: Job): Promise<void> {
    const timer = performance.startTimer('queue_process_job');
    
    try {
      const processor = this.processors.get(job.type);
      if (!processor) {
        throw new Error(`No processor registered for job type: ${job.type}`);
      }

      job.attempts++;
      job.processedAt = new Date();
      this.activeJobs.set(job.id, job);
      this.stats.activeJobs++;

      this.emit('job:started', job);

      if (this.config.enableLogging) {
        logger.info('Processing job', {
          jobId: job.id,
          type: job.type,
          attempt: job.attempts,
        });
      }

      // Set timeout for job processing
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Job timeout after ${job.timeout}ms`));
        }, job.timeout);
      });

      // Process job with timeout
      const result = await Promise.race([
        processor(job),
        timeoutPromise,
      ]);

      // Job completed successfully
      job.result = result;
      job.completedAt = new Date();
      this.activeJobs.delete(job.id);
      this.stats.activeJobs--;
      this.stats.completedJobs++;

      this.emit('job:completed', job, result);

      if (this.config.enableLogging) {
        logger.info('Job completed', {
          jobId: job.id,
          type: job.type,
          processingTime: job.completedAt.getTime() - job.processedAt!.getTime(),
        });
      }
    } catch (error) {
      await this.handleJobFailure(job, error as Error);
    } finally {
      timer();
    }
  }

  /**
   * Handle job failure
   */
  private async handleJobFailure(job: Job, error: Error): Promise<void> {
    job.error = error.message;
    this.activeJobs.delete(job.id);
    this.stats.activeJobs--;

    if (job.attempts < job.maxAttempts) {
      // Retry job with exponential backoff
      const delay = this.config.retryDelay * Math.pow(2, job.attempts - 1);
      
      setTimeout(() => {
        this.addToWaitingQueue(job);
      }, delay);

      if (this.config.enableLogging) {
        logger.warn('Job failed, retrying', {
          jobId: job.id,
          type: job.type,
          attempt: job.attempts,
          maxAttempts: job.maxAttempts,
          retryDelay: delay,
          error: error.message,
        });
      }
    } else {
      // Job failed permanently
      job.failedAt = new Date();
      this.stats.failedJobs++;

      this.emit('job:failed', job, error);

      if (this.config.enableLogging) {
        logger.error('Job failed permanently', {
          jobId: job.id,
          type: job.type,
          attempts: job.attempts,
          error: error.message,
        });
      }

      // Move to dead letter queue if enabled
      if (this.config.deadLetterQueue) {
        // In production, implement actual dead letter queue storage
        logger.info('Job moved to dead letter queue', { jobId: job.id });
      }
    }
  }

  /**
   * Add job to waiting queue
   */
  private addToWaitingQueue(job: Job): void {
    this.waitingJobs.push(job);
    this.stats.waitingJobs++;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.pause();
    
    // Clear all delayed jobs
    for (const timeout of this.delayedJobs.values()) {
      clearTimeout(timeout);
    }
    
    this.delayedJobs.clear();
    this.waitingJobs.length = 0;
    this.jobs.clear();
    this.processors.clear();
    this.eventListeners.clear();

    if (this.config.enableLogging) {
      logger.info('Queue destroyed');
    }
  }
}

// Queue manager for multiple queues
export class QueueManager {
  private queues = new Map<string, JobQueue>();
  private defaultConfig: Partial<QueueConfig>;

  constructor(defaultConfig: Partial<QueueConfig> = {}) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * Create or get queue
   */
  getQueue(name: string, config?: Partial<QueueConfig>): JobQueue {
    if (!this.queues.has(name)) {
      const queueConfig = { ...this.defaultConfig, ...config };
      this.queues.set(name, new JobQueue(queueConfig));
    }
    
    return this.queues.get(name)!;
  }

  /**
   * Remove queue
   */
  removeQueue(name: string): boolean {
    const queue = this.queues.get(name);
    if (queue) {
      queue.destroy();
      this.queues.delete(name);
      return true;
    }
    return false;
  }

  /**
   * Get all queue names
   */
  getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  /**
   * Get stats for all queues
   */
  getAllStats(): Record<string, QueueStats> {
    const stats: Record<string, QueueStats> = {};
    
    for (const [name, queue] of this.queues.entries()) {
      stats[name] = queue.getStats();
    }
    
    return stats;
  }

  /**
   * Pause all queues
   */
  pauseAll(): void {
    for (const queue of this.queues.values()) {
      queue.pause();
    }
  }

  /**
   * Resume all queues
   */
  resumeAll(): void {
    for (const queue of this.queues.values()) {
      queue.resume();
    }
  }

  /**
   * Clear all queues
   */
  async clearAll(): Promise<void> {
    const promises = Array.from(this.queues.values()).map(queue => queue.clear());
    await Promise.all(promises);
  }

  /**
   * Destroy all queues
   */
  destroy(): void {
    for (const queue of this.queues.values()) {
      queue.destroy();
    }
    this.queues.clear();
  }
}

// Queue utilities
export class QueueUtils {
  /**
   * Create priority queue
   */
  static createPriorityQueue(config?: Partial<QueueConfig>): JobQueue {
    return new JobQueue({
      maxConcurrency: 3,
      retryAttempts: 2,
      ...config,
    });
  }

  /**
   * Create batch processing queue
   */
  static createBatchQueue(config?: Partial<QueueConfig>): JobQueue {
    return new JobQueue({
      maxConcurrency: 10,
      retryAttempts: 1,
      timeout: 60000,
      ...config,
    });
  }

  /**
   * Create email queue
   */
  static createEmailQueue(config?: Partial<QueueConfig>): JobQueue {
    return new JobQueue({
      maxConcurrency: 2,
      retryAttempts: 3,
      retryDelay: 5000,
      timeout: 30000,
      ...config,
    });
  }

  /**
   * Create file processing queue
   */
  static createFileProcessingQueue(config?: Partial<QueueConfig>): JobQueue {
    return new JobQueue({
      maxConcurrency: 1,
      retryAttempts: 2,
      timeout: 120000, // 2 minutes
      ...config,
    });
  }

  /**
   * Create notification queue
   */
  static createNotificationQueue(config?: Partial<QueueConfig>): JobQueue {
    return new JobQueue({
      maxConcurrency: 5,
      retryAttempts: 3,
      retryDelay: 2000,
      ...config,
    });
  }

  /**
   * Calculate queue health score
   */
  static calculateHealthScore(stats: QueueStats): number {
    const totalProcessed = stats.completedJobs + stats.failedJobs;
    if (totalProcessed === 0) return 100;
    
    const successRate = stats.completedJobs / totalProcessed;
    const queueLoad = stats.waitingJobs / (stats.waitingJobs + stats.activeJobs + 1);
    
    return Math.round((successRate * 0.7 + (1 - queueLoad) * 0.3) * 100);
  }

  /**
   * Estimate processing time
   */
  static estimateProcessingTime(
    queuePosition: number,
    averageProcessingTime: number,
    concurrency: number
  ): number {
    return Math.ceil(queuePosition / concurrency) * averageProcessingTime;
  }
}

// Default queue manager instance
export const queueManager = new QueueManager({
  maxConcurrency: 5,
  retryAttempts: 3,
  retryDelay: 1000,
  timeout: 30000,
  enableLogging: true,
  enableMetrics: true,
});

export default JobQueue;