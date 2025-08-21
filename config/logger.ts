import pino from 'pino';
const pretty = require('pino-pretty');

interface LoggerConfig {
  level: string;
  prettyPrint: boolean;
  timestamp: boolean;
  redact: string[];
  serializers?: Record<string, any>;
}

const getLoggerConfig = (): LoggerConfig => {
  const environment = process.env.NODE_ENV || 'development';
  const envType = environment as 'development' | 'production' | 'test' | 'staging';
  const logLevel = process.env.LOG_LEVEL || 'info';
  
  const baseConfig: LoggerConfig = {
    level: logLevel,
    prettyPrint: environment === 'development',
    timestamp: true,
    redact: [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'privateKey',
      'mnemonic',
      'seed',
    ],
  };

  switch (envType) {
    case 'production':
      return {
        ...baseConfig,
        level: 'warn',
        prettyPrint: false,
        serializers: {
          req: pino.stdSerializers.req,
          res: pino.stdSerializers.res,
          err: pino.stdSerializers.err,
        },
      };
    
    case 'staging':
      return {
        ...baseConfig,
        level: 'info',
        prettyPrint: false,
      };
    
    case 'test':
      return {
        ...baseConfig,
        level: 'silent',
        prettyPrint: false,
      };
    
    default: // development
      return {
        ...baseConfig,
        level: 'debug',
        prettyPrint: true,
      };
  }
};

const createLogger = () => {
  const config = getLoggerConfig();
  const environment = process.env.NODE_ENV || 'development';
  
  const loggerOptions: any = {
    level: config.level,
    timestamp: config.timestamp,
    redact: config.redact,
    serializers: config.serializers,
  };

  if (config.prettyPrint && environment === 'development') {
    return pino(
      loggerOptions,
      pretty({
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
      })
    );
  }

  return pino(loggerOptions);
};

const logger = createLogger();

// Custom log methods for different contexts
export const createContextLogger = (context: string) => {
  return {
    debug: (message: string, meta?: any) => logger.debug({ context, ...meta }, message),
    info: (message: string, meta?: any) => logger.info({ context, ...meta }, message),
    warn: (message: string, meta?: any) => logger.warn({ context, ...meta }, message),
    error: (message: string, error?: Error, meta?: any) => {
      logger.error({ context, err: error, ...meta }, message);
    },
    fatal: (message: string, error?: Error, meta?: any) => {
      logger.fatal({ context, err: error, ...meta }, message);
    },
  };
};

// Specific loggers for different parts of the application
export const apiLogger = createContextLogger('API');
export const dbLogger = createContextLogger('DATABASE');
export const web3Logger = createContextLogger('WEB3');
export const authLogger = createContextLogger('AUTH');
export const cacheLogger = createContextLogger('CACHE');

// Request logging middleware helper
export const createRequestLogger = () => {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    req.requestId = requestId;
    req.logger = createContextLogger(`REQUEST:${requestId}`);
    
    req.logger.info('Request started', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      req.logger.info('Request completed', {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      });
    });
    
    next();
  };
};

// Performance logging
export const performanceLogger = {
  time: (label: string) => {
    console.time(label);
  },
  timeEnd: (label: string, meta?: any) => {
    console.timeEnd(label);
    logger.debug({ ...meta }, `Performance: ${label}`);
  },
};

// Error logging with stack trace
export const logError = (error: Error, context?: string, meta?: any) => {
  logger.error({
    err: error,
    context: context || 'UNKNOWN',
    stack: error.stack,
    ...meta,
  }, error.message);
};

// Audit logging for sensitive operations
export const auditLogger = {
  log: (action: string, userId?: string, meta?: any) => {
    logger.info({
      audit: true,
      action,
      userId,
      timestamp: new Date().toISOString(),
      ...meta,
    }, `Audit: ${action}`);
  },
};

export default logger;