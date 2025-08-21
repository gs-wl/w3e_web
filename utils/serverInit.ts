// Server initialization utilities
import cacheCleanupScheduler from './cacheCleanup';

let isInitialized = false;

/**
 * Initialize server-side background processes
 */
export function initializeServer() {
  if (isInitialized) {
    console.log('Server already initialized, skipping...');
    return;
  }

  console.log('Initializing server background processes...');
  
  try {
    // Start cache cleanup scheduler
    cacheCleanupScheduler.start();
    console.log('✓ Cache cleanup scheduler started');
    
    isInitialized = true;
    console.log('✓ Server initialization complete');
  } catch (error) {
    console.error('✗ Error during server initialization:', error);
  }
}

/**
 * Graceful shutdown of background processes
 */
export function shutdownServer() {
  console.log('Shutting down server background processes...');
  
  try {
    cacheCleanupScheduler.stop();
    console.log('✓ Cache cleanup scheduler stopped');
    
    isInitialized = false;
    console.log('✓ Server shutdown complete');
  } catch (error) {
    console.error('✗ Error during server shutdown:', error);
  }
}

// Auto-initialize in production and development
if (typeof window === 'undefined') { // Server-side only
  initializeServer();
  
  // Setup graceful shutdown handlers
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    shutdownServer();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    shutdownServer();
    process.exit(0);
  });
  
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdownServer();
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdownServer();
    process.exit(1);
  });
}

export { cacheCleanupScheduler };