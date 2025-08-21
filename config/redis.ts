// Redis configuration - install ioredis: npm install ioredis @types/ioredis
// import Redis from 'ioredis';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
  family: number;
  keyPrefix?: string;
}

const getRedisConfig = (): RedisConfig => {
  const environment = process.env.NODE_ENV || 'development';
  const envType = environment as 'development' | 'production' | 'test' | 'staging';
  
  const baseConfig: RedisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
  };

  switch (envType) {
    case 'production':
      return {
        ...baseConfig,
        keyPrefix: 'rwa:prod:',
        maxRetriesPerRequest: 5,
      };
    
    case 'staging':
      return {
        ...baseConfig,
        keyPrefix: 'rwa:staging:',
        db: 1,
      };
    
    case 'test':
      return {
        ...baseConfig,
        keyPrefix: 'rwa:test:',
        db: 2,
      };
    
    default: // development
      return {
        ...baseConfig,
        keyPrefix: 'rwa:dev:',
      };
  }
};

let redisClient: any | null = null;

export const getRedisClient = (): any => {
  if (!redisClient) {
    const config = getRedisConfig();
    
    // Uncomment when ioredis is installed
    /*
    redisClient = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      retryDelayOnFailover: config.retryDelayOnFailover,
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      lazyConnect: config.lazyConnect,
      keepAlive: config.keepAlive,
      family: config.family,
      keyPrefix: config.keyPrefix,
    });
    */
    
    // Placeholder until ioredis is installed
    redisClient = {} as any;

    // Handle Redis events
    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
    });

    redisClient.on('error', (err: Error) => {
      console.error('Redis connection error:', err);
    });

    redisClient.on('close', () => {
      console.log('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });
  }
  
  return redisClient;
};

export const closeRedisConnection = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

// Cache utility functions
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  },

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const client = getRedisClient();
    const serialized = JSON.stringify(value);
    if (ttl) {
      await client.setex(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }
  },

  async del(key: string): Promise<void> {
    const client = getRedisClient();
    await client.del(key);
  },

  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  },

  async expire(key: string, ttl: number): Promise<void> {
    const client = getRedisClient();
    await client.expire(key, ttl);
  },

  async flushPattern(pattern: string): Promise<void> {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  },
};

export default getRedisConfig;