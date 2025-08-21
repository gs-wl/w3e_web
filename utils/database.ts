// Database utilities for connection management and query operations

import { dbLogger } from '../config/logger';
import { performance } from '../config/monitoring';

// Database connection types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
  maxRetries?: number;
}

// Query result types
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  fields?: any[];
  command?: string;
}

// Transaction interface
export interface Transaction {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// Database error types
export class DatabaseError extends Error {
  public readonly code?: string;
  public readonly detail?: string;
  public readonly constraint?: string;

  constructor(message: string, code?: string, detail?: string, constraint?: string) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.detail = detail;
    this.constraint = constraint;
  }
}

// Query builder interface
export interface QueryBuilder {
  select(columns?: string | string[]): QueryBuilder;
  from(table: string): QueryBuilder;
  where(condition: string, ...params: any[]): QueryBuilder;
  whereIn(column: string, values: any[]): QueryBuilder;
  whereNotIn(column: string, values: any[]): QueryBuilder;
  whereBetween(column: string, min: any, max: any): QueryBuilder;
  whereNull(column: string): QueryBuilder;
  whereNotNull(column: string): QueryBuilder;
  join(table: string, condition: string): QueryBuilder;
  leftJoin(table: string, condition: string): QueryBuilder;
  rightJoin(table: string, condition: string): QueryBuilder;
  innerJoin(table: string, condition: string): QueryBuilder;
  groupBy(columns: string | string[]): QueryBuilder;
  having(condition: string, ...params: any[]): QueryBuilder;
  orderBy(column: string, direction?: 'ASC' | 'DESC'): QueryBuilder;
  limit(count: number): QueryBuilder;
  offset(count: number): QueryBuilder;
  insert(data: Record<string, any>): QueryBuilder;
  update(data: Record<string, any>): QueryBuilder;
  delete(): QueryBuilder;
  build(): { sql: string; params: any[] };
  execute<T = any>(): Promise<QueryResult<T>>;
}

// Base database connection class
export abstract class DatabaseConnection {
  protected config: DatabaseConfig;
  protected isConnected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  abstract beginTransaction(): Promise<Transaction>;
  abstract ping(): Promise<boolean>;

  /**
   * Execute query with performance tracking
   */
  async executeQuery<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const timer = performance.startTimer('database-query');
    const queryId = this.generateQueryId();

    try {
      dbLogger.debug('Executing query', {
        queryId,
        sql: this.sanitizeQuery(sql),
        paramCount: params?.length || 0,
      });

      const result = await this.query<T>(sql, params);

      const duration = timer();
      dbLogger.info('Query executed successfully', {
        queryId,
        duration,
        rowCount: result.rowCount,
      });

      return result;
    } catch (error) {
      const duration = timer();
      dbLogger.error('Query execution failed', error instanceof Error ? error : new Error(String(error)), {
        queryId,
        duration,
        sql: this.sanitizeQuery(sql),
      });
      throw error;
    }
  }

  /**
   * Execute transaction with automatic rollback on error
   */
  async executeTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    const transaction = await this.beginTransaction();
    const transactionId = this.generateQueryId();

    try {
      dbLogger.debug('Starting transaction', { transactionId });
      
      const result = await callback(transaction);
      
      await transaction.commit();
      dbLogger.info('Transaction committed successfully', { transactionId });
      
      return result;
    } catch (error) {
      dbLogger.error('Transaction failed, rolling back', error instanceof Error ? error : new Error(String(error)), {
        transactionId,
      });
      
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        dbLogger.error('Rollback failed', rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError)), {
          transactionId,
        });
      }
      
      throw error;
    }
  }

  /**
   * Check if connection is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      return await this.ping();
    } catch {
      return false;
    }
  }

  /**
   * Generate unique query ID for tracking
   */
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(sql: string): string {
    // Remove potential sensitive data patterns
    return sql
      .replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token = '[REDACTED]'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret = '[REDACTED]'");
  }
}

// SQL Query Builder implementation
export class SQLQueryBuilder implements QueryBuilder {
  private selectClause: string = '';
  private fromClause: string = '';
  private whereClause: string = '';
  private joinClause: string = '';
  private groupByClause: string = '';
  private havingClause: string = '';
  private orderByClause: string = '';
  private limitClause: string = '';
  private offsetClause: string = '';
  private insertClause: string = '';
  private updateClause: string = '';
  private deleteClause: string = '';
  private params: any[] = [];
  private paramIndex: number = 1;
  private connection?: DatabaseConnection;

  constructor(connection?: DatabaseConnection) {
    this.connection = connection;
  }

  select(columns: string | string[] = '*'): QueryBuilder {
    if (Array.isArray(columns)) {
      this.selectClause = `SELECT ${columns.join(', ')}`;
    } else {
      this.selectClause = `SELECT ${columns}`;
    }
    return this;
  }

  from(table: string): QueryBuilder {
    this.fromClause = `FROM ${table}`;
    return this;
  }

  where(condition: string, ...params: any[]): QueryBuilder {
    const paramPlaceholders = params.map(() => `$${this.paramIndex++}`).join(', ');
    const processedCondition = condition.replace(/\?/g, () => `$${this.paramIndex - params.length + this.params.length}`);
    
    if (this.whereClause) {
      this.whereClause += ` AND ${processedCondition}`;
    } else {
      this.whereClause = `WHERE ${processedCondition}`;
    }
    
    this.params.push(...params);
    return this;
  }

  whereIn(column: string, values: any[]): QueryBuilder {
    if (values.length === 0) {
      return this.where('1 = 0'); // Always false condition
    }
    
    const placeholders = values.map(() => `$${this.paramIndex++}`).join(', ');
    const condition = `${column} IN (${placeholders})`;
    
    if (this.whereClause) {
      this.whereClause += ` AND ${condition}`;
    } else {
      this.whereClause = `WHERE ${condition}`;
    }
    
    this.params.push(...values);
    return this;
  }

  whereNotIn(column: string, values: any[]): QueryBuilder {
    if (values.length === 0) {
      return this; // No condition needed
    }
    
    const placeholders = values.map(() => `$${this.paramIndex++}`).join(', ');
    const condition = `${column} NOT IN (${placeholders})`;
    
    if (this.whereClause) {
      this.whereClause += ` AND ${condition}`;
    } else {
      this.whereClause = `WHERE ${condition}`;
    }
    
    this.params.push(...values);
    return this;
  }

  whereBetween(column: string, min: any, max: any): QueryBuilder {
    const condition = `${column} BETWEEN $${this.paramIndex++} AND $${this.paramIndex++}`;
    
    if (this.whereClause) {
      this.whereClause += ` AND ${condition}`;
    } else {
      this.whereClause = `WHERE ${condition}`;
    }
    
    this.params.push(min, max);
    return this;
  }

  whereNull(column: string): QueryBuilder {
    const condition = `${column} IS NULL`;
    
    if (this.whereClause) {
      this.whereClause += ` AND ${condition}`;
    } else {
      this.whereClause = `WHERE ${condition}`;
    }
    
    return this;
  }

  whereNotNull(column: string): QueryBuilder {
    const condition = `${column} IS NOT NULL`;
    
    if (this.whereClause) {
      this.whereClause += ` AND ${condition}`;
    } else {
      this.whereClause = `WHERE ${condition}`;
    }
    
    return this;
  }

  join(table: string, condition: string): QueryBuilder {
    this.joinClause += ` JOIN ${table} ON ${condition}`;
    return this;
  }

  leftJoin(table: string, condition: string): QueryBuilder {
    this.joinClause += ` LEFT JOIN ${table} ON ${condition}`;
    return this;
  }

  rightJoin(table: string, condition: string): QueryBuilder {
    this.joinClause += ` RIGHT JOIN ${table} ON ${condition}`;
    return this;
  }

  innerJoin(table: string, condition: string): QueryBuilder {
    this.joinClause += ` INNER JOIN ${table} ON ${condition}`;
    return this;
  }

  groupBy(columns: string | string[]): QueryBuilder {
    if (Array.isArray(columns)) {
      this.groupByClause = `GROUP BY ${columns.join(', ')}`;
    } else {
      this.groupByClause = `GROUP BY ${columns}`;
    }
    return this;
  }

  having(condition: string, ...params: any[]): QueryBuilder {
    const processedCondition = condition.replace(/\?/g, () => `$${this.paramIndex++}`);
    
    if (this.havingClause) {
      this.havingClause += ` AND ${processedCondition}`;
    } else {
      this.havingClause = `HAVING ${processedCondition}`;
    }
    
    this.params.push(...params);
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    if (this.orderByClause) {
      this.orderByClause += `, ${column} ${direction}`;
    } else {
      this.orderByClause = `ORDER BY ${column} ${direction}`;
    }
    return this;
  }

  limit(count: number): QueryBuilder {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.offsetClause = `OFFSET ${count}`;
    return this;
  }

  insert(data: Record<string, any>): QueryBuilder {
    const columns = Object.keys(data);
    const placeholders = columns.map(() => `$${this.paramIndex++}`);
    
    this.insertClause = `INSERT INTO ${this.fromClause.replace('FROM ', '')} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    this.params.push(...Object.values(data));
    
    return this;
  }

  update(data: Record<string, any>): QueryBuilder {
    const setPairs = Object.keys(data).map(key => `${key} = $${this.paramIndex++}`);
    
    this.updateClause = `UPDATE ${this.fromClause.replace('FROM ', '')} SET ${setPairs.join(', ')}`;
    this.params.push(...Object.values(data));
    
    return this;
  }

  delete(): QueryBuilder {
    this.deleteClause = `DELETE ${this.fromClause}`;
    return this;
  }

  build(): { sql: string; params: any[] } {
    let sql = '';
    
    if (this.insertClause) {
      sql = this.insertClause;
    } else if (this.updateClause) {
      sql = [this.updateClause, this.whereClause].filter(Boolean).join(' ');
    } else if (this.deleteClause) {
      sql = [this.deleteClause, this.whereClause].filter(Boolean).join(' ');
    } else {
      sql = [
        this.selectClause,
        this.fromClause,
        this.joinClause,
        this.whereClause,
        this.groupByClause,
        this.havingClause,
        this.orderByClause,
        this.limitClause,
        this.offsetClause,
      ].filter(Boolean).join(' ');
    }
    
    return { sql: sql.trim(), params: this.params };
  }

  async execute<T = any>(): Promise<QueryResult<T>> {
    if (!this.connection) {
      throw new Error('No database connection provided');
    }
    
    const { sql, params } = this.build();
    return this.connection.executeQuery<T>(sql, params);
  }
}

// Database utilities
export class DatabaseUtils {
  /**
   * Escape SQL identifier (table/column names)
   */
  static escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Escape SQL string value
   */
  static escapeString(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
  }

  /**
   * Build pagination query
   */
  static buildPaginationQuery(
    baseQuery: string,
    page: number,
    limit: number,
    orderBy?: string
  ): string {
    const offset = (page - 1) * limit;
    let query = baseQuery;
    
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    return query;
  }

  /**
   * Build search query with full-text search
   */
  static buildSearchQuery(
    table: string,
    searchColumns: string[],
    searchTerm: string,
    additionalWhere?: string
  ): { sql: string; params: any[] } {
    const searchConditions = searchColumns
      .map(column => `${column} ILIKE $1`)
      .join(' OR ');
    
    let whereClause = `(${searchConditions})`;
    const params = [`%${searchTerm}%`];
    
    if (additionalWhere) {
      whereClause += ` AND ${additionalWhere}`;
    }
    
    const sql = `SELECT * FROM ${table} WHERE ${whereClause}`;
    return { sql, params };
  }

  /**
   * Build upsert query (INSERT ... ON CONFLICT)
   */
  static buildUpsertQuery(
    table: string,
    data: Record<string, any>,
    conflictColumns: string[],
    updateColumns?: string[]
  ): { sql: string; params: any[] } {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    
    let sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    sql += ` ON CONFLICT (${conflictColumns.join(', ')})`;
    
    if (updateColumns && updateColumns.length > 0) {
      const updatePairs = updateColumns.map(col => `${col} = EXCLUDED.${col}`);
      sql += ` DO UPDATE SET ${updatePairs.join(', ')}`;
    } else {
      sql += ' DO NOTHING';
    }
    
    return { sql, params: values };
  }

  /**
   * Validate database configuration
   */
  static validateConfig(config: DatabaseConfig): void {
    const required = ['host', 'port', 'database', 'username', 'password'];
    const missing = required.filter(key => !config[key as keyof DatabaseConfig]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required database configuration: ${missing.join(', ')}`);
    }
    
    if (config.port < 1 || config.port > 65535) {
      throw new Error('Database port must be between 1 and 65535');
    }
  }

  /**
   * Generate migration SQL
   */
  static generateMigrationSQL(
    tableName: string,
    columns: Record<string, string>,
    constraints?: string[]
  ): string {
    const columnDefinitions = Object.entries(columns)
      .map(([name, type]) => `  ${name} ${type}`)
      .join(',\n');
    
    let sql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n${columnDefinitions}`;
    
    if (constraints && constraints.length > 0) {
      sql += ',\n  ' + constraints.join(',\n  ');
    }
    
    sql += '\n);';
    return sql;
  }
}

// Connection pool manager
export class ConnectionPool {
  private connections: DatabaseConnection[] = [];
  private availableConnections: DatabaseConnection[] = [];
  private usedConnections: Set<DatabaseConnection> = new Set();
  private config: DatabaseConfig;
  private maxSize: number;
  private minSize: number;

  constructor(config: DatabaseConfig, maxSize: number = 10, minSize: number = 2) {
    this.config = config;
    this.maxSize = maxSize;
    this.minSize = minSize;
  }

  async initialize(): Promise<void> {
    // Initialize minimum connections
    for (let i = 0; i < this.minSize; i++) {
      const connection = await this.createConnection();
      this.connections.push(connection);
      this.availableConnections.push(connection);
    }
  }

  async getConnection(): Promise<DatabaseConnection> {
    if (this.availableConnections.length > 0) {
      const connection = this.availableConnections.pop()!;
      this.usedConnections.add(connection);
      return connection;
    }
    
    if (this.connections.length < this.maxSize) {
      const connection = await this.createConnection();
      this.connections.push(connection);
      this.usedConnections.add(connection);
      return connection;
    }
    
    // Wait for a connection to become available
    return new Promise((resolve) => {
      const checkForConnection = () => {
        if (this.availableConnections.length > 0) {
          const connection = this.availableConnections.pop()!;
          this.usedConnections.add(connection);
          resolve(connection);
        } else {
          setTimeout(checkForConnection, 10);
        }
      };
      checkForConnection();
    });
  }

  releaseConnection(connection: DatabaseConnection): void {
    if (this.usedConnections.has(connection)) {
      this.usedConnections.delete(connection);
      this.availableConnections.push(connection);
    }
  }

  async closeAll(): Promise<void> {
    await Promise.all(this.connections.map(conn => conn.disconnect()));
    this.connections = [];
    this.availableConnections = [];
    this.usedConnections.clear();
  }

  private async createConnection(): Promise<DatabaseConnection> {
    // This would be implemented by specific database drivers
    throw new Error('createConnection must be implemented by database-specific pool');
  }

  getStats() {
    return {
      total: this.connections.length,
      available: this.availableConnections.length,
      used: this.usedConnections.size,
      maxSize: this.maxSize,
      minSize: this.minSize,
    };
  }
}

// Export query builder factory
export const createQueryBuilder = (connection?: DatabaseConnection): QueryBuilder => {
  return new SQLQueryBuilder(connection);
};

export default DatabaseUtils;