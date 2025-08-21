// import nodemailer from 'nodemailer'; // Commented out - install with: npm install nodemailer @types/nodemailer
import logger from '../config/logger';
import { performance } from '../config/monitoring';
import ValidationUtils from './validation';
import { CryptoUtils } from './crypto';

// Mock nodemailer interface for development
interface MockTransporter {
  sendMail(options: any): Promise<any>;
  verify(callback: (error: any) => void): void;
  close(): void;
}

const nodemailer = {
  createTransporter: (config: any): MockTransporter => ({
    sendMail: async (options: any) => ({
      messageId: 'mock-message-id',
      accepted: [options.to].flat(),
      rejected: [],
      pending: [],
      response: 'Mock email sent',
    }),
    verify: (callback: (error: any) => void) => callback(null),
    close: () => {},
  }),
};

// Email interfaces
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  replyTo?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  cid?: string;
}

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  priority?: 'high' | 'normal' | 'low';
  headers?: Record<string, string>;
  template?: string;
  templateData?: Record<string, any>;
}

export interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  pending: string[];
  response: string;
}

export interface EmailStats {
  sent: number;
  failed: number;
  bounced: number;
  delivered: number;
  opened: number;
  clicked: number;
}

// Email error class
export class EmailError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'EmailError';
  }
}

// Email service class
export class EmailService {
  private transporter!: MockTransporter;
  private config: EmailConfig;
  private templates = new Map<string, EmailTemplate>();
  private stats: EmailStats;

  constructor(config: EmailConfig) {
    this.config = config;
    this.stats = {
      sent: 0,
      failed: 0,
      bounced: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
    };

    this.createTransporter();
  }

  /**
   * Create nodemailer transporter
   */
  private createTransporter(): void {
    try {
      this.transporter = nodemailer.createTransporter({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 14, // 14 emails per second max
      });

      // Verify connection
      this.transporter.verify((error: any) => {
        if (error) {
          logger.error('Email transporter verification failed', { error });
        } else {
          logger.info('Email transporter ready');
        }
      });
    } catch (error) {
      logger.error('Failed to create email transporter', { error });
      throw new EmailError(
        'Failed to initialize email service',
        'TRANSPORTER_INIT_ERROR',
        error
      );
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const timer = performance.startTimer('email_send');
    
    try {
      // Validate email addresses
      this.validateEmailAddresses(options);

      // Prepare email content
      const mailOptions = await this.prepareMailOptions(options);

      // Send email
      const result = await this.transporter.sendMail(mailOptions);

      // Update stats
      this.stats.sent++;

      logger.info('Email sent successfully', {
        messageId: result.messageId,
        to: options.to,
        subject: options.subject,
      });

      return {
        messageId: result.messageId,
        accepted: result.accepted || [],
        rejected: result.rejected || [],
        pending: result.pending || [],
        response: result.response,
      };
    } catch (error) {
      this.stats.failed++;
      logger.error('Failed to send email', { error, options });
      
      throw new EmailError(
        `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EMAIL_SEND_ERROR',
        error
      );
    } finally {
      timer();
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(emails: EmailOptions[]): Promise<EmailResult[]> {
    const timer = performance.startTimer('email_bulk_send');
    const results: EmailResult[] = [];
    
    try {
      // Process emails in batches to avoid overwhelming the server
      const batchSize = 10;
      
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        const batchPromises = batch.map(email => 
          this.sendEmail(email).catch(error => {
            logger.error('Bulk email failed', { error, email });
            return null;
          })
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(result => result !== null) as EmailResult[]);
        
        // Small delay between batches
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      logger.info('Bulk email sending completed', {
        total: emails.length,
        successful: results.length,
        failed: emails.length - results.length,
      });
      
      return results;
    } catch (error) {
      logger.error('Bulk email sending failed', { error });
      throw new EmailError(
        'Failed to send bulk emails',
        'BULK_EMAIL_ERROR',
        error
      );
    } finally {
      timer();
    }
  }

  /**
   * Register email template
   */
  registerTemplate(name: string, template: EmailTemplate): void {
    try {
      this.templates.set(name, template);
      logger.debug('Email template registered', { name });
    } catch (error) {
      throw new EmailError(
        `Failed to register template: ${name}`,
        'TEMPLATE_REGISTER_ERROR',
        error
      );
    }
  }

  /**
   * Get email template
   */
  getTemplate(name: string): EmailTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * Remove email template
   */
  removeTemplate(name: string): boolean {
    return this.templates.delete(name);
  }

  /**
   * Get email statistics
   */
  getStats(): EmailStats {
    return { ...this.stats };
  }

  /**
   * Reset email statistics
   */
  resetStats(): void {
    this.stats = {
      sent: 0,
      failed: 0,
      bounced: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
    };
  }

  /**
   * Close email service
   */
  async close(): Promise<void> {
    try {
      if (this.transporter) {
        this.transporter.close();
        logger.info('Email service closed');
      }
    } catch (error) {
      logger.error('Error closing email service', { error });
    }
  }

  /**
   * Validate email addresses
   */
  private validateEmailAddresses(options: EmailOptions): void {
    const validateEmail = (email: string) => {
      if (!ValidationUtils.isValidEmail(email)) {
        throw new EmailError(
          `Invalid email address: ${email}`,
          'INVALID_EMAIL_ADDRESS'
        );
      }
    };

    // Validate 'to' addresses
    if (Array.isArray(options.to)) {
      options.to.forEach(validateEmail);
    } else {
      validateEmail(options.to);
    }

    // Validate 'cc' addresses
    if (options.cc) {
      if (Array.isArray(options.cc)) {
        options.cc.forEach(validateEmail);
      } else {
        validateEmail(options.cc);
      }
    }

    // Validate 'bcc' addresses
    if (options.bcc) {
      if (Array.isArray(options.bcc)) {
        options.bcc.forEach(validateEmail);
      } else {
        validateEmail(options.bcc);
      }
    }
  }

  /**
   * Prepare mail options for nodemailer
   */
  private async prepareMailOptions(options: EmailOptions): Promise<any> {
    let html = options.html;
    let text = options.text;
    let subject = options.subject;

    // Use template if specified
    if (options.template) {
      const template = this.getTemplate(options.template);
      if (!template) {
        throw new EmailError(
          `Template not found: ${options.template}`,
          'TEMPLATE_NOT_FOUND'
        );
      }

      // Replace template variables
      if (options.templateData) {
        html = this.replaceTemplateVariables(template.html, options.templateData);
        text = template.text ? this.replaceTemplateVariables(template.text, options.templateData) : undefined;
        subject = this.replaceTemplateVariables(template.subject, options.templateData);
      } else {
        html = template.html;
        text = template.text;
        subject = template.subject;
      }
    }

    const mailOptions: any = {
      from: this.config.from,
      replyTo: this.config.replyTo,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject,
      html,
      text,
      attachments: options.attachments,
      headers: options.headers,
    };

    // Set priority
    if (options.priority) {
      mailOptions.priority = options.priority;
      if (options.priority === 'high') {
        mailOptions.headers = {
          ...mailOptions.headers,
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
        };
      }
    }

    return mailOptions;
  }

  /**
   * Replace template variables
   */
  private replaceTemplateVariables(template: string, data: Record<string, any>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    return result;
  }
}

// Email template builder
export class EmailTemplateBuilder {
  private template: Partial<EmailTemplate> = {};

  /**
   * Set template subject
   */
  subject(subject: string): this {
    this.template.subject = subject;
    return this;
  }

  /**
   * Set template HTML content
   */
  html(html: string): this {
    this.template.html = html;
    return this;
  }

  /**
   * Set template text content
   */
  text(text: string): this {
    this.template.text = text;
    return this;
  }

  /**
   * Add attachment
   */
  attachment(attachment: EmailAttachment): this {
    if (!this.template.attachments) {
      this.template.attachments = [];
    }
    this.template.attachments.push(attachment);
    return this;
  }

  /**
   * Build the template
   */
  build(): EmailTemplate {
    if (!this.template.subject || !this.template.html) {
      throw new EmailError(
        'Template must have subject and html content',
        'INVALID_TEMPLATE'
      );
    }

    return this.template as EmailTemplate;
  }
}

// Email utilities
export class EmailUtils {
  /**
   * Extract email address from string
   */
  static extractEmail(input: string): string | null {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = input.match(emailRegex);
    return match ? match[0] : null;
  }

  /**
   * Parse email address with name
   */
  static parseEmailAddress(input: string): { name?: string; email: string } | null {
    // Format: "Name <email@domain.com>" or "email@domain.com"
    const namedEmailRegex = /^(.+?)\s*<([^>]+)>$/;
    const match = input.match(namedEmailRegex);
    
    if (match) {
      return {
        name: match[1].trim().replace(/^["']|["']$/g, ''),
        email: match[2].trim(),
      };
    }
    
    const email = this.extractEmail(input);
    return email ? { email } : null;
  }

  /**
   * Format email address with name
   */
  static formatEmailAddress(email: string, name?: string): string {
    if (name) {
      return `"${name}" <${email}>`;
    }
    return email;
  }

  /**
   * Generate unsubscribe token
   */
  static generateUnsubscribeToken(email: string, secret: string): string {
    const data = `${email}:${Date.now()}`;
    return CryptoUtils.generateHMAC(data, secret);
  }

  /**
   * Verify unsubscribe token
   */
  static verifyUnsubscribeToken(
    email: string,
    token: string,
    secret: string,
    maxAge: number = 86400000 // 24 hours
  ): boolean {
    try {
      const data = `${email}:${Date.now()}`;
      const expectedToken = CryptoUtils.generateHMAC(data, secret);
      
      // This is a simplified verification
      // In production, you'd need to store and verify the timestamp
      return CryptoUtils.verifyHMAC(data, token, secret);
    } catch {
      return false;
    }
  }

  /**
   * Generate email tracking pixel
   */
  static generateTrackingPixel(emailId: string, baseUrl: string): string {
    const trackingUrl = `${baseUrl}/track/open/${emailId}`;
    return `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
  }

  /**
   * Generate click tracking URL
   */
  static generateClickTrackingUrl(
    originalUrl: string,
    emailId: string,
    baseUrl: string
  ): string {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `${baseUrl}/track/click/${emailId}?url=${encodedUrl}`;
  }

  /**
   * Sanitize email content
   */
  static sanitizeContent(content: string): string {
    // Remove potentially dangerous HTML tags and attributes
    return content
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/<object[^>]*>.*?<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/javascript:/gi, '');
  }

  /**
   * Convert HTML to plain text
   */
  static htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }
}

// Pre-built email templates
export const EmailTemplates = {
  welcome: new EmailTemplateBuilder()
    .subject('Welcome to {{appName}}!')
    .html(`
      <h1>Welcome {{userName}}!</h1>
      <p>Thank you for joining {{appName}}. We're excited to have you on board.</p>
      <p>To get started, please verify your email address by clicking the button below:</p>
      <a href="{{verificationUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
      <p>If you have any questions, feel free to contact our support team.</p>
      <p>Best regards,<br>The {{appName}} Team</p>
    `)
    .text(`
      Welcome {{userName}}!
      
      Thank you for joining {{appName}}. We're excited to have you on board.
      
      To get started, please verify your email address by visiting: {{verificationUrl}}
      
      If you have any questions, feel free to contact our support team.
      
      Best regards,
      The {{appName}} Team
    `)
    .build(),

  passwordReset: new EmailTemplateBuilder()
    .subject('Reset Your Password')
    .html(`
      <h1>Password Reset Request</h1>
      <p>Hi {{userName}},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <a href="{{resetUrl}}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>This link will expire in {{expirationTime}}.</p>
      <p>If you didn't request this password reset, please ignore this email.</p>
      <p>Best regards,<br>The {{appName}} Team</p>
    `)
    .text(`
      Password Reset Request
      
      Hi {{userName}},
      
      We received a request to reset your password. Visit the following link to create a new password:
      {{resetUrl}}
      
      This link will expire in {{expirationTime}}.
      
      If you didn't request this password reset, please ignore this email.
      
      Best regards,
      The {{appName}} Team
    `)
    .build(),

  notification: new EmailTemplateBuilder()
    .subject('{{subject}}')
    .html(`
      <h1>{{title}}</h1>
      <p>{{message}}</p>
      {{#if actionUrl}}
      <a href="{{actionUrl}}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">{{actionText}}</a>
      {{/if}}
      <p>Best regards,<br>The {{appName}} Team</p>
    `)
    .text(`
      {{title}}
      
      {{message}}
      
      {{#if actionUrl}}
      {{actionText}}: {{actionUrl}}
      {{/if}}
      
      Best regards,
      The {{appName}} Team
    `)
    .build(),
};

export default EmailService;