import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import logger from '../config/logger';
import { performance } from '../config/monitoring';
import ValidationUtils from './validation';
import { CryptoUtils } from './crypto';

// File upload interfaces
export interface FileUploadConfig {
  uploadDir: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  generateUniqueNames: boolean;
  preserveOriginalName: boolean;
  createDirectories: boolean;
  enableVirusScan: boolean;
  enableCompression: boolean;
}

export interface UploadedFile {
  originalName: string;
  filename: string;
  path: string;
  size: number;
  mimeType: string;
  extension: string;
  hash: string;
  uploadedAt: Date;
  metadata?: Record<string, any>;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    quality?: number;
  };
  compress?: boolean;
  watermark?: {
    text?: string;
    image?: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  };
  generateThumbnail?: {
    width: number;
    height: number;
  };
}

export interface FileStats {
  totalUploads: number;
  totalSize: number;
  successfulUploads: number;
  failedUploads: number;
  averageFileSize: number;
  uploadsByType: Record<string, number>;
}

// File upload error class
export class FileUploadError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'FileUploadError';
  }
}

// File upload service
export class FileUploadService {
  private config: FileUploadConfig;
  private stats: FileStats;

  constructor(config: Partial<FileUploadConfig> = {}) {
    this.config = {
      uploadDir: './uploads',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/json',
      ],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.json'],
      generateUniqueNames: true,
      preserveOriginalName: false,
      createDirectories: true,
      enableVirusScan: false,
      enableCompression: false,
      ...config,
    };

    this.stats = {
      totalUploads: 0,
      totalSize: 0,
      successfulUploads: 0,
      failedUploads: 0,
      averageFileSize: 0,
      uploadsByType: {},
    };

    this.initializeUploadDirectory();
  }

  /**
   * Initialize upload directory
   */
  private initializeUploadDirectory(): void {
    try {
      if (this.config.createDirectories && !fs.existsSync(this.config.uploadDir)) {
        fs.mkdirSync(this.config.uploadDir, { recursive: true });
        logger.info('Upload directory created', { dir: this.config.uploadDir });
      }
    } catch (error) {
      logger.error('Failed to create upload directory', { error, dir: this.config.uploadDir });
      throw new FileUploadError(
        'Failed to initialize upload directory',
        'DIRECTORY_INIT_ERROR',
        error
      );
    }
  }

  /**
   * Upload file from buffer
   */
  async uploadFromBuffer(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options: FileProcessingOptions = {}
  ): Promise<UploadedFile> {
    const timer = performance.startTimer('file_upload_buffer');
    
    try {
      // Validate file
      const validation = this.validateFile(buffer, originalName, mimeType);
      if (!validation.isValid) {
        throw new FileUploadError(
          `File validation failed: ${validation.errors.join(', ')}`,
          'FILE_VALIDATION_ERROR',
          validation.errors
        );
      }

      // Generate filename
      const filename = this.generateFilename(originalName);
      const filePath = path.join(this.config.uploadDir, filename);

      // Process file if needed
      let processedBuffer = buffer;
      if (this.shouldProcessFile(mimeType, options)) {
        processedBuffer = await this.processFile(buffer, mimeType, options);
      }

      // Write file
      await fs.promises.writeFile(filePath, processedBuffer);

      // Generate file hash
      const hash = crypto.createHash('sha256').update(processedBuffer).digest('hex');

      // Create uploaded file object
      const uploadedFile: UploadedFile = {
        originalName,
        filename,
        path: filePath,
        size: processedBuffer.length,
        mimeType,
        extension: path.extname(originalName).toLowerCase(),
        hash,
        uploadedAt: new Date(),
        metadata: {
          processed: this.shouldProcessFile(mimeType, options),
          options,
        },
      };

      // Update stats
      this.updateStats(uploadedFile, true);

      logger.info('File uploaded successfully', {
        filename,
        size: uploadedFile.size,
        mimeType,
      });

      return uploadedFile;
    } catch (error) {
      this.updateStats({ size: buffer.length, mimeType } as UploadedFile, false);
      logger.error('File upload failed', { error, originalName });
      
      if (error instanceof FileUploadError) {
        throw error;
      }
      
      throw new FileUploadError(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPLOAD_ERROR',
        error
      );
    } finally {
      timer();
    }
  }

  /**
   * Upload file from path
   */
  async uploadFromPath(
    filePath: string,
    options: FileProcessingOptions = {}
  ): Promise<UploadedFile> {
    const timer = performance.startTimer('file_upload_path');
    
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new FileUploadError(
          `File not found: ${filePath}`,
          'FILE_NOT_FOUND'
        );
      }

      // Read file
      const buffer = await fs.promises.readFile(filePath);
      const originalName = path.basename(filePath);
      const mimeType = this.getMimeType(originalName);

      return await this.uploadFromBuffer(buffer, originalName, mimeType, options);
    } catch (error) {
      logger.error('File upload from path failed', { error, filePath });
      
      if (error instanceof FileUploadError) {
        throw error;
      }
      
      throw new FileUploadError(
        `Failed to upload file from path: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPLOAD_PATH_ERROR',
        error
      );
    } finally {
      timer();
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(
    files: Array<{ buffer: Buffer; originalName: string; mimeType: string }>,
    options: FileProcessingOptions = {}
  ): Promise<UploadedFile[]> {
    const timer = performance.startTimer('file_upload_multiple');
    const results: UploadedFile[] = [];
    
    try {
      for (const file of files) {
        try {
          const uploadedFile = await this.uploadFromBuffer(
            file.buffer,
            file.originalName,
            file.mimeType,
            options
          );
          results.push(uploadedFile);
        } catch (error) {
          logger.error('Failed to upload file in batch', {
            error,
            filename: file.originalName,
          });
          // Continue with other files
        }
      }
      
      logger.info('Multiple file upload completed', {
        total: files.length,
        successful: results.length,
        failed: files.length - results.length,
      });
      
      return results;
    } catch (error) {
      logger.error('Multiple file upload failed', { error });
      throw new FileUploadError(
        'Failed to upload multiple files',
        'MULTIPLE_UPLOAD_ERROR',
        error
      );
    } finally {
      timer();
    }
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(filename: string): Promise<boolean> {
    const timer = performance.startTimer('file_delete');
    
    try {
      const filePath = path.join(this.config.uploadDir, filename);
      
      if (!fs.existsSync(filePath)) {
        return false;
      }
      
      await fs.promises.unlink(filePath);
      
      logger.info('File deleted successfully', { filename });
      return true;
    } catch (error) {
      logger.error('File deletion failed', { error, filename });
      throw new FileUploadError(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DELETE_ERROR',
        error
      );
    } finally {
      timer();
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(filename: string): Promise<UploadedFile | null> {
    try {
      const filePath = path.join(this.config.uploadDir, filename);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const stats = await fs.promises.stat(filePath);
      const buffer = await fs.promises.readFile(filePath);
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      const extension = path.extname(filename).toLowerCase();
      
      return {
        originalName: filename,
        filename,
        path: filePath,
        size: stats.size,
        mimeType: this.getMimeType(filename),
        extension,
        hash,
        uploadedAt: stats.birthtime,
      };
    } catch (error) {
      logger.error('Failed to get file info', { error, filename });
      return null;
    }
  }

  /**
   * List uploaded files
   */
  async listFiles(filter?: { mimeType?: string; extension?: string }): Promise<UploadedFile[]> {
    try {
      const files = await fs.promises.readdir(this.config.uploadDir);
      const fileInfos: UploadedFile[] = [];
      
      for (const filename of files) {
        const fileInfo = await this.getFileInfo(filename);
        if (fileInfo) {
          // Apply filter
          if (filter) {
            if (filter.mimeType && fileInfo.mimeType !== filter.mimeType) {
              continue;
            }
            if (filter.extension && fileInfo.extension !== filter.extension) {
              continue;
            }
          }
          
          fileInfos.push(fileInfo);
        }
      }
      
      return fileInfos;
    } catch (error) {
      logger.error('Failed to list files', { error });
      throw new FileUploadError(
        'Failed to list files',
        'LIST_ERROR',
        error
      );
    }
  }

  /**
   * Get upload statistics
   */
  getStats(): FileStats {
    return {
      ...this.stats,
      averageFileSize: this.stats.totalUploads > 0 
        ? this.stats.totalSize / this.stats.totalUploads 
        : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalUploads: 0,
      totalSize: 0,
      successfulUploads: 0,
      failedUploads: 0,
      averageFileSize: 0,
      uploadsByType: {},
    };
  }

  /**
   * Validate file
   */
  private validateFile(buffer: Buffer, filename: string, mimeType: string): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    if (buffer.length > this.config.maxFileSize) {
      errors.push(`File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`);
    }

    // Check MIME type
    if (!this.config.allowedMimeTypes.includes(mimeType)) {
      errors.push(`MIME type '${mimeType}' is not allowed`);
    }

    // Check file extension
    const extension = path.extname(filename).toLowerCase();
    if (!this.config.allowedExtensions.includes(extension)) {
      errors.push(`File extension '${extension}' is not allowed`);
    }

    // Check filename (basic validation)
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      errors.push('Invalid filename');
    }

    // Check for empty file
    if (buffer.length === 0) {
      errors.push('File is empty');
    }

    // Virus scan (placeholder)
    if (this.config.enableVirusScan) {
      // In production, integrate with antivirus service
      warnings.push('Virus scan not implemented');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate unique filename
   */
  private generateFilename(originalName: string): string {
    if (!this.config.generateUniqueNames && this.config.preserveOriginalName) {
      return originalName;
    }

    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    
    if (this.config.generateUniqueNames) {
      const timestamp = Date.now();
      const random = CryptoUtils.generateRandomString(8);
      return `${timestamp}_${random}${extension}`;
    }
    
    return `${baseName}_${Date.now()}${extension}`;
  }

  /**
   * Get MIME type from filename
   */
  private getMimeType(filename: string): string {
    const extension = path.extname(filename).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.csv': 'text/csv',
      '.xml': 'application/xml',
      '.zip': 'application/zip',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Check if file should be processed
   */
  private shouldProcessFile(mimeType: string, options: FileProcessingOptions): boolean {
    const isImage = mimeType.startsWith('image/');
    return isImage && (
      !!options.resize || 
      !!options.compress || 
      !!options.watermark || 
      !!options.generateThumbnail
    );
  }

  /**
   * Process file (placeholder for image processing)
   */
  private async processFile(
    buffer: Buffer,
    mimeType: string,
    options: FileProcessingOptions
  ): Promise<Buffer> {
    // This is a placeholder implementation
    // In production, you would use libraries like Sharp for image processing
    
    logger.info('File processing requested', { mimeType, options });
    
    // For now, just return the original buffer
    // TODO: Implement actual image processing
    return buffer;
  }

  /**
   * Update upload statistics
   */
  private updateStats(file: UploadedFile, success: boolean): void {
    this.stats.totalUploads++;
    this.stats.totalSize += file.size;
    
    if (success) {
      this.stats.successfulUploads++;
    } else {
      this.stats.failedUploads++;
    }
    
    // Update uploads by type
    const mimeType = file.mimeType;
    this.stats.uploadsByType[mimeType] = (this.stats.uploadsByType[mimeType] || 0) + 1;
  }
}

// File utilities
export class FileUtils {
  /**
   * Get file size in human readable format
   */
  static formatFileSize(bytes: number): string {
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
   * Get file extension from filename
   */
  static getExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  /**
   * Get filename without extension
   */
  static getBaseName(filename: string): string {
    return path.basename(filename, path.extname(filename));
  }

  /**
   * Check if file is image
   */
  static isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Check if file is video
   */
  static isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  /**
   * Check if file is audio
   */
  static isAudio(mimeType: string): boolean {
    return mimeType.startsWith('audio/');
  }

  /**
   * Check if file is document
   */
  static isDocument(mimeType: string): boolean {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];
    
    return documentTypes.includes(mimeType);
  }

  /**
   * Generate file hash
   */
  static async generateFileHash(filePath: string, algorithm: string = 'sha256'): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Copy file
   */
  static async copyFile(source: string, destination: string): Promise<void> {
    try {
      await fs.promises.copyFile(source, destination);
    } catch (error) {
      throw new FileUploadError(
        `Failed to copy file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COPY_ERROR',
        error
      );
    }
  }

  /**
   * Move file
   */
  static async moveFile(source: string, destination: string): Promise<void> {
    try {
      await fs.promises.rename(source, destination);
    } catch (error) {
      throw new FileUploadError(
        `Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MOVE_ERROR',
        error
      );
    }
  }

  /**
   * Create directory if it doesn't exist
   */
  static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new FileUploadError(
        `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DIRECTORY_ERROR',
        error
      );
    }
  }

  /**
   * Clean up old files
   */
  static async cleanupOldFiles(
    directory: string,
    maxAge: number = 7 * 24 * 60 * 60 * 1000 // 7 days
  ): Promise<number> {
    try {
      const files = await fs.promises.readdir(directory);
      const now = Date.now();
      let deletedCount = 0;
      
      for (const filename of files) {
        const filePath = path.join(directory, filename);
        const stats = await fs.promises.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.promises.unlink(filePath);
          deletedCount++;
        }
      }
      
      return deletedCount;
    } catch (error) {
      throw new FileUploadError(
        `Failed to cleanup old files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CLEANUP_ERROR',
        error
      );
    }
  }
}

export default FileUploadService;