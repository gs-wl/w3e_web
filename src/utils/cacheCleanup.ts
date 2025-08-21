import { cleanupExpiredCache } from './newsCache';

class CacheCleanupScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private cleanupIntervalHours: number;

  constructor(cleanupIntervalHours: number = 6) {
    this.cleanupIntervalHours = cleanupIntervalHours;
  }

  /**
   * Start the background cleanup job
   */
  start(): void {
    if (this.isRunning) {
      console.log('Cache cleanup scheduler is already running');
      return;
    }

    console.log(`Starting cache cleanup scheduler (runs every ${this.cleanupIntervalHours} hours)`);
    
    // Run cleanup immediately on start
    this.runCleanup();
    
    // Schedule periodic cleanup
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, this.cleanupIntervalHours * 60 * 60 * 1000); // Convert hours to milliseconds
    
    this.isRunning = true;
  }

  /**
   * Stop the background cleanup job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Cache cleanup scheduler stopped');
  }

  /**
   * Check if the scheduler is running
   */
  getStatus(): { isRunning: boolean; intervalHours: number } {
    return {
      isRunning: this.isRunning,
      intervalHours: this.cleanupIntervalHours
    };
  }

  /**
   * Run the cleanup function
   */
  private async runCleanup(): Promise<void> {
    try {
      const result = await cleanupExpiredCache();
      const timestamp = new Date().toISOString();
      
      if (result.cleaned) {
        console.log(`[${timestamp}] Cache cleanup: ${result.message}`);
      } else {
        console.log(`[${timestamp}] Cache cleanup check: ${result.message}`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Cache cleanup error:`, error);
    }
  }

  /**
   * Manually trigger cleanup
   */
  async triggerCleanup(): Promise<{ cleaned: boolean; message: string }> {
    return await cleanupExpiredCache();
  }
}

// Create a singleton instance
const cacheCleanupScheduler = new CacheCleanupScheduler(6); // Run every 6 hours

export default cacheCleanupScheduler;
export { CacheCleanupScheduler };

// Auto-start the scheduler in production
if (process.env.NODE_ENV === 'production') {
  cacheCleanupScheduler.start();
  console.log('Cache cleanup scheduler auto-started for production environment');
}

// Graceful shutdown
process.on('SIGINT', () => {
  cacheCleanupScheduler.stop();
});

process.on('SIGTERM', () => {
  cacheCleanupScheduler.stop();
});