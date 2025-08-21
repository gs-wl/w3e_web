import { Pool } from 'pg';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

const getDatabaseConfig = (): DatabaseConfig => {
  const environment = process.env.NODE_ENV as 'development' | 'production' | 'test' | 'staging' || 'development';
  
  const baseConfig: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'rwa_defi',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
  };

  switch (environment) {
    case 'production':
      return {
        ...baseConfig,
        ssl: true,
        maxConnections: 50,
      };
    
    case 'staging':
      return {
        ...baseConfig,
        ssl: true,
        maxConnections: 30,
      };
    
    case 'test':
      return {
        ...baseConfig,
        database: process.env.DB_NAME_TEST || 'rwa_defi_test',
        maxConnections: 5,
      };
    
    default: // development
      return baseConfig;
  }
};

let pool: Pool | null = null;

export const getDbPool = (): Pool => {
  if (!pool) {
    const config = getDatabaseConfig();
    pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.maxConnections,
      idleTimeoutMillis: config.idleTimeoutMillis,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
    });

    // Handle pool errors
    pool.on('error', (err: Error) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  
  return pool;
};

export const closeDbPool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

export default getDatabaseConfig;