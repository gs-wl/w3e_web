import logger from '../config/logger';
import { performance } from '../config/monitoring';
import { CryptoUtils } from './crypto';
import { EmailService } from './email';
import { queueManager } from './queue';

// Notification interfaces
export interface NotificationConfig {
  enableEmail: boolean;
  enableSMS: boolean;
  enablePush: boolean;
  enableInApp: boolean;
  enableQueue: boolean;
  retryAttempts: number;
  retryDelay: number;
  batchSize: number;
  rateLimit: number;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject?: string;
  title: string;
  body: string;
  htmlBody?: string;
  variables: string[];
  metadata?: Record<string, any>;
}

export interface NotificationRecipient {
  id: string;
  email?: string;
  phone?: string;
  pushToken?: string;
  userId?: string;
  preferences?: NotificationPreferences;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours?: {
    start: string; // HH:mm format
    end: string;
    timezone: string;
  };
}

export interface NotificationData {
  templateId: string;
  recipients: NotificationRecipient[];
  variables?: Record<string, any>;
  priority: NotificationPriority;
  scheduledAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  id: string;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  error?: string;
  channels: {
    email?: ChannelResult;
    sms?: ChannelResult;
    push?: ChannelResult;
    inApp?: ChannelResult;
  };
}

export interface ChannelResult {
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
  messageId?: string;
}

export interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  channelStats: {
    email: ChannelStats;
    sms: ChannelStats;
    push: ChannelStats;
    inApp: ChannelStats;
  };
  deliveryRate: number;
  averageDeliveryTime: number;
}

export interface ChannelStats {
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
}

export type NotificationType = 'email' | 'sms' | 'push' | 'in-app' | 'all';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'pending' | 'processing' | 'sent' | 'delivered' | 'failed' | 'expired';

// Notification error class
export class NotificationError extends Error {
  constructor(
    message: string,
    public code: string,
    public notificationId?: string,
    public channel?: string
  ) {
    super(message);
    this.name = 'NotificationError';
  }
}

// Email channel implementation
export class EmailChannel {
  private emailService: EmailService;

  constructor(emailService: EmailService) {
    this.emailService = emailService;
  }

  async send(
    recipient: NotificationRecipient,
    template: NotificationTemplate,
    variables: Record<string, any> = {}
  ): Promise<ChannelResult> {
    try {
      if (!recipient.email) {
        throw new Error('Email address not provided');
      }

      const result = await this.emailService.sendEmail({
        to: recipient.email,
        subject: this.replaceVariables(template.subject || template.title, variables),
        text: this.replaceVariables(template.body, variables),
        html: template.htmlBody ? this.replaceVariables(template.htmlBody, variables) : undefined,
      });

      return {
        status: result.messageId ? 'sent' : 'failed',
        sentAt: new Date(),
        messageId: result.messageId,
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }
}

// SMS channel implementation (mock)
export class SMSChannel {
  async send(
    recipient: NotificationRecipient,
    template: NotificationTemplate,
    variables: Record<string, any> = {}
  ): Promise<ChannelResult> {
    try {
      if (!recipient.phone) {
        throw new Error('Phone number not provided');
      }

      // Mock SMS sending - replace with actual SMS service
      const message = this.replaceVariables(template.body, variables);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      logger.info('SMS sent (mock)', {
        phone: recipient.phone,
        message: message.substring(0, 50) + '...',
      });

      return {
        status: 'sent',
        sentAt: new Date(),
        messageId: CryptoUtils.generateUUID(),
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }
}

// Push notification channel implementation (mock)
export class PushChannel {
  async send(
    recipient: NotificationRecipient,
    template: NotificationTemplate,
    variables: Record<string, any> = {}
  ): Promise<ChannelResult> {
    try {
      if (!recipient.pushToken) {
        throw new Error('Push token not provided');
      }

      // Mock push notification sending - replace with actual push service
      const title = this.replaceVariables(template.title, variables);
      const body = this.replaceVariables(template.body, variables);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 150));
      
      logger.info('Push notification sent (mock)', {
        token: recipient.pushToken.substring(0, 20) + '...',
        title,
        body: body.substring(0, 50) + '...',
      });

      return {
        status: 'sent',
        sentAt: new Date(),
        messageId: CryptoUtils.generateUUID(),
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }
}

// In-app notification channel implementation
export class InAppChannel {
  private notifications = new Map<string, any>();

  async send(
    recipient: NotificationRecipient,
    template: NotificationTemplate,
    variables: Record<string, any> = {}
  ): Promise<ChannelResult> {
    try {
      if (!recipient.userId) {
        throw new Error('User ID not provided');
      }

      const notification = {
        id: CryptoUtils.generateUUID(),
        userId: recipient.userId,
        title: this.replaceVariables(template.title, variables),
        body: this.replaceVariables(template.body, variables),
        type: template.type,
        createdAt: new Date(),
        read: false,
        metadata: template.metadata,
      };

      this.notifications.set(notification.id, notification);

      logger.info('In-app notification created', {
        userId: recipient.userId,
        notificationId: notification.id,
        title: notification.title,
      });

      return {
        status: 'sent',
        sentAt: new Date(),
        messageId: notification.id,
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get notifications for user
   */
  getNotifications(userId: string, limit = 50): any[] {
    const userNotifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return userNotifications;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
      notification.readAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): boolean {
    return this.notifications.delete(notificationId);
  }

  private replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }
}

// Main notification service
export class NotificationService {
  private config: Required<NotificationConfig>;
  private templates = new Map<string, NotificationTemplate>();
  private notifications = new Map<string, NotificationResult>();
  private stats: NotificationStats;
  private emailChannel?: EmailChannel;
  private smsChannel: SMSChannel;
  private pushChannel: PushChannel;
  private inAppChannel: InAppChannel;
  private notificationQueue = queueManager.getQueue('notifications');

  constructor(
    config: Partial<NotificationConfig> = {},
    emailService?: EmailService
  ) {
    this.config = {
      enableEmail: true,
      enableSMS: true,
      enablePush: true,
      enableInApp: true,
      enableQueue: true,
      retryAttempts: 3,
      retryDelay: 1000,
      batchSize: 100,
      rateLimit: 1000,
      ...config,
    };

    this.stats = {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      channelStats: {
        email: { sent: 0, delivered: 0, failed: 0, deliveryRate: 0 },
        sms: { sent: 0, delivered: 0, failed: 0, deliveryRate: 0 },
        push: { sent: 0, delivered: 0, failed: 0, deliveryRate: 0 },
        inApp: { sent: 0, delivered: 0, failed: 0, deliveryRate: 0 },
      },
      deliveryRate: 0,
      averageDeliveryTime: 0,
    };

    // Initialize channels
    if (emailService && this.config.enableEmail) {
      this.emailChannel = new EmailChannel(emailService);
    }
    
    this.smsChannel = new SMSChannel();
    this.pushChannel = new PushChannel();
    this.inAppChannel = new InAppChannel();

    // Register queue processor
    if (this.config.enableQueue) {
      this.notificationQueue.registerProcessor('notification', this.processNotification.bind(this));
    }
  }

  /**
   * Register notification template
   */
  registerTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
    
    logger.info('Notification template registered', {
      templateId: template.id,
      name: template.name,
      type: template.type,
    });
  }

  /**
   * Get notification template
   */
  getTemplate(templateId: string): NotificationTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Send notification
   */
  async sendNotification(data: NotificationData): Promise<string> {
    const timer = performance.startTimer('notification_send');
    
    try {
      const notificationId = CryptoUtils.generateUUID();
      
      const notification: NotificationResult = {
        id: notificationId,
        status: 'pending',
        channels: {},
      };

      this.notifications.set(notificationId, notification);

      if (this.config.enableQueue && !data.scheduledAt) {
        // Send immediately via queue
        await this.notificationQueue.addJob('notification', {
          notificationId,
          data,
        }, {
          priority: this.getPriorityValue(data.priority),
        });
      } else if (data.scheduledAt) {
        // Schedule for later
        const delay = data.scheduledAt.getTime() - Date.now();
        if (delay > 0) {
          await this.notificationQueue.addJob('notification', {
            notificationId,
            data,
          }, {
            delay,
            priority: this.getPriorityValue(data.priority),
          });
        } else {
          // Scheduled time has passed, send immediately
          await this.processNotificationDirect(notificationId, data);
        }
      } else {
        // Send directly without queue
        await this.processNotificationDirect(notificationId, data);
      }

      logger.info('Notification queued', {
        notificationId,
        templateId: data.templateId,
        recipientCount: data.recipients.length,
        priority: data.priority,
      });

      return notificationId;
    } catch (error) {
      logger.error('Failed to send notification', { error, data });
      throw new NotificationError(
        `Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SEND_ERROR'
      );
    } finally {
      timer();
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(notifications: NotificationData[]): Promise<string[]> {
    const timer = performance.startTimer('notification_send_bulk');
    
    try {
      const notificationIds: string[] = [];
      
      // Process in batches
      for (let i = 0; i < notifications.length; i += this.config.batchSize) {
        const batch = notifications.slice(i, i + this.config.batchSize);
        const batchPromises = batch.map(data => this.sendNotification(data));
        const batchIds = await Promise.all(batchPromises);
        notificationIds.push(...batchIds);
        
        // Rate limiting between batches
        if (i + this.config.batchSize < notifications.length) {
          await new Promise(resolve => setTimeout(resolve, 1000 / this.config.rateLimit));
        }
      }

      logger.info('Bulk notifications queued', {
        totalNotifications: notifications.length,
        batchSize: this.config.batchSize,
      });

      return notificationIds;
    } catch (error) {
      logger.error('Failed to send bulk notifications', { error });
      throw new NotificationError(
        'Failed to send bulk notifications',
        'BULK_SEND_ERROR'
      );
    } finally {
      timer();
    }
  }

  /**
   * Get notification status
   */
  getNotificationStatus(notificationId: string): NotificationResult | undefined {
    return this.notifications.get(notificationId);
  }

  /**
   * Get in-app notifications for user
   */
  getInAppNotifications(userId: string, limit?: number): any[] {
    return this.inAppChannel.getNotifications(userId, limit);
  }

  /**
   * Mark in-app notification as read
   */
  markNotificationAsRead(notificationId: string): boolean {
    return this.inAppChannel.markAsRead(notificationId);
  }

  /**
   * Get notification statistics
   */
  getStats(): NotificationStats {
    // Calculate delivery rates
    for (const channel of Object.keys(this.stats.channelStats) as Array<keyof typeof this.stats.channelStats>) {
      const channelStats = this.stats.channelStats[channel];
      const total = channelStats.sent;
      channelStats.deliveryRate = total > 0 ? channelStats.delivered / total : 0;
    }

    const totalSent = this.stats.totalSent;
    this.stats.deliveryRate = totalSent > 0 ? this.stats.totalDelivered / totalSent : 0;

    return { ...this.stats };
  }

  /**
   * Process notification job
   */
  private async processNotification(job: any): Promise<void> {
    const { notificationId, data } = job.data;
    await this.processNotificationDirect(notificationId, data);
  }

  /**
   * Process notification directly
   */
  private async processNotificationDirect(
    notificationId: string,
    data: NotificationData
  ): Promise<void> {
    const timer = performance.startTimer('notification_process');
    
    try {
      const notification = this.notifications.get(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      const template = this.templates.get(data.templateId);
      if (!template) {
        throw new Error(`Template not found: ${data.templateId}`);
      }

      // Check if notification has expired
      if (data.expiresAt && data.expiresAt < new Date()) {
        notification.status = 'expired';
        return;
      }

      notification.status = 'processing';
      
      // Send to each recipient
      const sendPromises = data.recipients.map(recipient => 
        this.sendToRecipient(recipient, template, data.variables || {}, notification)
      );

      await Promise.all(sendPromises);

      // Update notification status
      const hasFailures = Object.values(notification.channels).some(
        channel => channel?.status === 'failed'
      );
      
      notification.status = hasFailures ? 'failed' : 'sent';
      notification.sentAt = new Date();

      // Update stats
      this.updateStats(notification);

      logger.info('Notification processed', {
        notificationId,
        status: notification.status,
        recipientCount: data.recipients.length,
      });
    } catch (error) {
      const notification = this.notifications.get(notificationId);
      if (notification) {
        notification.status = 'failed';
        notification.failedAt = new Date();
        notification.error = error instanceof Error ? error.message : 'Unknown error';
      }
      
      logger.error('Failed to process notification', {
        notificationId,
        error,
      });
      
      throw error;
    } finally {
      timer();
    }
  }

  /**
   * Send notification to individual recipient
   */
  private async sendToRecipient(
    recipient: NotificationRecipient,
    template: NotificationTemplate,
    variables: Record<string, any>,
    notification: NotificationResult
  ): Promise<void> {
    const preferences = recipient.preferences || {
      email: true,
      sms: true,
      push: true,
      inApp: true,
      frequency: 'immediate',
    };

    // Check quiet hours
    if (this.isInQuietHours(preferences)) {
      logger.info('Skipping notification due to quiet hours', {
        recipientId: recipient.id,
      });
      return;
    }

    // Send via enabled channels based on template type and preferences
    const channelPromises: Promise<void>[] = [];

    if ((template.type === 'email' || template.type === 'all') && 
        preferences.email && 
        this.config.enableEmail && 
        this.emailChannel) {
      channelPromises.push(
        this.sendViaChannel('email', recipient, template, variables, notification)
      );
    }

    if ((template.type === 'sms' || template.type === 'all') && 
        preferences.sms && 
        this.config.enableSMS) {
      channelPromises.push(
        this.sendViaChannel('sms', recipient, template, variables, notification)
      );
    }

    if ((template.type === 'push' || template.type === 'all') && 
        preferences.push && 
        this.config.enablePush) {
      channelPromises.push(
        this.sendViaChannel('push', recipient, template, variables, notification)
      );
    }

    if ((template.type === 'in-app' || template.type === 'all') && 
        preferences.inApp && 
        this.config.enableInApp) {
      channelPromises.push(
        this.sendViaChannel('inApp', recipient, template, variables, notification)
      );
    }

    await Promise.all(channelPromises);
  }

  /**
   * Send via specific channel
   */
  private async sendViaChannel(
    channel: 'email' | 'sms' | 'push' | 'inApp',
    recipient: NotificationRecipient,
    template: NotificationTemplate,
    variables: Record<string, any>,
    notification: NotificationResult
  ): Promise<void> {
    try {
      let result: ChannelResult;

      switch (channel) {
        case 'email':
          if (!this.emailChannel) throw new Error('Email channel not configured');
          result = await this.emailChannel.send(recipient, template, variables);
          break;
        case 'sms':
          result = await this.smsChannel.send(recipient, template, variables);
          break;
        case 'push':
          result = await this.pushChannel.send(recipient, template, variables);
          break;
        case 'inApp':
          result = await this.inAppChannel.send(recipient, template, variables);
          break;
        default:
          throw new Error(`Unknown channel: ${channel}`);
      }

      notification.channels[channel] = result;
    } catch (error) {
      notification.channels[channel] = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      logger.error(`Failed to send via ${channel}`, {
        error,
        recipientId: recipient.id,
        templateId: template.id,
      });
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours) {
      return false;
    }

    // Simple quiet hours check - in production, use proper timezone handling
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Get priority value for queue
   */
  private getPriorityValue(priority: NotificationPriority): number {
    switch (priority) {
      case 'urgent': return 100;
      case 'high': return 75;
      case 'normal': return 50;
      case 'low': return 25;
      default: return 50;
    }
  }

  /**
   * Update statistics
   */
  private updateStats(notification: NotificationResult): void {
    this.stats.totalSent++;
    
    let hasDelivery = false;
    let hasFailure = false;

    for (const [channel, result] of Object.entries(notification.channels)) {
      if (result) {
        const channelKey = channel as keyof typeof this.stats.channelStats;
        const channelStats = this.stats.channelStats[channelKey];
        
        channelStats.sent++;
        
        if (result.status === 'sent' || result.status === 'delivered') {
          channelStats.delivered++;
          hasDelivery = true;
        } else if (result.status === 'failed') {
          channelStats.failed++;
          hasFailure = true;
        }
      }
    }

    if (hasDelivery && !hasFailure) {
      this.stats.totalDelivered++;
    } else if (hasFailure) {
      this.stats.totalFailed++;
    }
  }
}

// Notification utilities
export class NotificationUtils {
  /**
   * Create email template
   */
  static createEmailTemplate(
    id: string,
    name: string,
    subject: string,
    body: string,
    htmlBody?: string
  ): NotificationTemplate {
    return {
      id,
      name,
      type: 'email',
      subject,
      title: subject,
      body,
      htmlBody,
      variables: this.extractVariables(body + (htmlBody || '')),
    };
  }

  /**
   * Create SMS template
   */
  static createSMSTemplate(
    id: string,
    name: string,
    body: string
  ): NotificationTemplate {
    return {
      id,
      name,
      type: 'sms',
      title: name,
      body,
      variables: this.extractVariables(body),
    };
  }

  /**
   * Create push notification template
   */
  static createPushTemplate(
    id: string,
    name: string,
    title: string,
    body: string
  ): NotificationTemplate {
    return {
      id,
      name,
      type: 'push',
      title,
      body,
      variables: this.extractVariables(title + body),
    };
  }

  /**
   * Extract variables from template text
   */
  static extractVariables(text: string): string[] {
    const matches = text.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    
    return [...new Set(matches.map(match => match.slice(2, -2)))];
  }

  /**
   * Validate notification data
   */
  static validateNotificationData(data: NotificationData): string[] {
    const errors: string[] = [];

    if (!data.templateId) {
      errors.push('Template ID is required');
    }

    if (!data.recipients || data.recipients.length === 0) {
      errors.push('At least one recipient is required');
    }

    if (data.scheduledAt && data.scheduledAt < new Date()) {
      errors.push('Scheduled time cannot be in the past');
    }

    if (data.expiresAt && data.expiresAt < new Date()) {
      errors.push('Expiration time cannot be in the past');
    }

    return errors;
  }

  /**
   * Create recipient from user data
   */
  static createRecipient(
    id: string,
    email?: string,
    phone?: string,
    pushToken?: string,
    userId?: string,
    preferences?: Partial<NotificationPreferences>
  ): NotificationRecipient {
    return {
      id,
      email,
      phone,
      pushToken,
      userId,
      preferences: {
        email: true,
        sms: true,
        push: true,
        inApp: true,
        frequency: 'immediate',
        ...preferences,
      },
    };
  }
}

// Pre-built notification templates
export const NotificationTemplates = {
  WELCOME: NotificationUtils.createEmailTemplate(
    'welcome',
    'Welcome Email',
    'Welcome to {{appName}}!',
    'Hi {{userName}},\n\nWelcome to {{appName}}! We\'re excited to have you on board.\n\nBest regards,\nThe {{appName}} Team'
  ),

  PASSWORD_RESET: NotificationUtils.createEmailTemplate(
    'password-reset',
    'Password Reset',
    'Reset your password',
    'Hi {{userName}},\n\nYou requested a password reset. Click the link below to reset your password:\n\n{{resetLink}}\n\nIf you didn\'t request this, please ignore this email.'
  ),

  ORDER_CONFIRMATION: NotificationUtils.createEmailTemplate(
    'order-confirmation',
    'Order Confirmation',
    'Order Confirmation #{{orderNumber}}',
    'Hi {{userName}},\n\nYour order #{{orderNumber}} has been confirmed.\n\nTotal: {{orderTotal}}\n\nThank you for your purchase!'
  ),

  PAYMENT_SUCCESS: NotificationUtils.createPushTemplate(
    'payment-success',
    'Payment Success',
    'Payment Successful',
    'Your payment of {{amount}} has been processed successfully.'
  ),

  SYSTEM_ALERT: NotificationUtils.createSMSTemplate(
    'system-alert',
    'System Alert',
    'ALERT: {{alertMessage}}. Please check your account immediately.'
  ),
};

export default NotificationService;