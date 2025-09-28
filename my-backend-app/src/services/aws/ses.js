const { SESClient, SendEmailCommand, SendRawEmailCommand } = require('@aws-sdk/client-ses');
const secretsManager = require('./secretsManager');

class SESService {
  constructor() {
    this.client = null;
    this.config = null;
    this.initialized = false;
  }

  /**
   * Initialize SES client with configuration from Secrets Manager
   */
  async initialize() {
    if (this.initialized) return;

    try {
      this.config = await secretsManager.getSESConfig();
      this.client = new SESClient({
        region: this.config.region,
      });
      this.initialized = true;
      console.log(`SES service initialized for region: ${this.config.region}`);
    } catch (error) {
      console.error('Failed to initialize SES service:', error);
      throw error;
    }
  }

  /**
   * Ensure the service is initialized before use
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Send a simple text or HTML email
   * @param {Object} params - Email parameters
   * @param {string|Array<string>} params.to - Recipient email(s)
   * @param {string} params.subject - Email subject
   * @param {string} params.text - Plain text body
   * @param {string} params.html - HTML body
   * @param {string} params.from - Sender email (optional, uses config default)
   * @param {Array<string>} params.cc - CC recipients (optional)
   * @param {Array<string>} params.bcc - BCC recipients (optional)
   * @returns {Promise<Object>} SES response
   */
  async sendEmail({ to, subject, text, html, from, cc, bcc }) {
    await this.ensureInitialized();

    if (!this.config.fromEmail && !from) {
      throw new Error('From email address is required. Configure it in AWS Secrets Manager or pass it as parameter.');
    }

    const fromAddress = from || `${this.config.fromName} <${this.config.fromEmail}>`;
    const toAddresses = Array.isArray(to) ? to : [to];

    const params = {
      Source: fromAddress,
      Destination: {
        ToAddresses: toAddresses,
        ...(cc && { CcAddresses: Array.isArray(cc) ? cc : [cc] }),
        ...(bcc && { BccAddresses: Array.isArray(bcc) ? bcc : [bcc] }),
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {},
      },
      ...(this.config.replyToEmail && {
        ReplyToAddresses: [this.config.replyToEmail],
      }),
      ...(this.config.configurationSetName && {
        ConfigurationSetName: this.config.configurationSetName,
      }),
    };

    // Add text body if provided
    if (text) {
      params.Message.Body.Text = {
        Data: text,
        Charset: 'UTF-8',
      };
    }

    // Add HTML body if provided
    if (html) {
      params.Message.Body.Html = {
        Data: html,
        Charset: 'UTF-8',
      };
    }

    if (!text && !html) {
      throw new Error('Either text or html body is required');
    }

    try {
      const command = new SendEmailCommand(params);
      const result = await this.client.send(command);
      
      console.log(`Email sent successfully to ${toAddresses.join(', ')}, MessageId: ${result.MessageId}`);
      return result;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send notification email for system events
   * @param {Object} params - Notification parameters
   * @param {string|Array<string>} params.to - Recipient email(s)
   * @param {string} params.type - Notification type (error, warning, info)
   * @param {string} params.title - Notification title
   * @param {string} params.message - Notification message
   * @param {Object} params.metadata - Additional metadata
   * @returns {Promise<Object>} SES response
   */
  async sendNotification({ to, type, title, message, metadata = {} }) {
    const typeColors = {
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8',
      success: '#28a745',
    };

    const color = typeColors[type] || typeColors.info;
    const subject = `[GitHub API ${type.toUpperCase()}] ${title}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="border-left: 4px solid ${color}; padding: 15px; background-color: #f8f9fa; margin-bottom: 20px;">
              <h2 style="margin: 0 0 10px 0; color: ${color};">${title}</h2>
              <p style="margin: 0; font-size: 14px; color: #666;">
                Type: ${type.toUpperCase()} | Time: ${new Date().toISOString()}
              </p>
            </div>
            
            <div style="background-color: #fff; padding: 20px; border-radius: 5px; border: 1px solid #dee2e6;">
              <h3>Message:</h3>
              <p>${message.replace(/\n/g, '<br>')}</p>
              
              ${Object.keys(metadata).length > 0 ? `
                <h3>Additional Information:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  ${Object.entries(metadata).map(([key, value]) => `
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 30%;">${key}:</td>
                      <td style="padding: 8px; border-bottom: 1px solid #eee;">${value}</td>
                    </tr>
                  `).join('')}
                </table>
              ` : ''}
            </div>
            
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              This is an automated notification from the GitHub API system.
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
${title}
Type: ${type.toUpperCase()}
Time: ${new Date().toISOString()}

Message:
${message}

${Object.keys(metadata).length > 0 ? `
Additional Information:
${Object.entries(metadata).map(([key, value]) => `${key}: ${value}`).join('\n')}
` : ''}

This is an automated notification from the GitHub API system.
    `;

    return this.sendEmail({
      to,
      subject,
      text,
      html,
    });
  }

  /**
   * Send error notification
   * @param {Object} params - Error notification parameters
   * @returns {Promise<Object>} SES response
   */
  async sendErrorNotification(params) {
    return this.sendNotification({ ...params, type: 'error' });
  }

  /**
   * Send warning notification
   * @param {Object} params - Warning notification parameters
   * @returns {Promise<Object>} SES response
   */
  async sendWarningNotification(params) {
    return this.sendNotification({ ...params, type: 'warning' });
  }

  /**
   * Send info notification
   * @param {Object} params - Info notification parameters
   * @returns {Promise<Object>} SES response
   */
  async sendInfoNotification(params) {
    return this.sendNotification({ ...params, type: 'info' });
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      region: this.config?.region,
      fromEmail: this.config?.fromEmail,
      configurationSetName: this.config?.configurationSetName,
    };
  }

  /**
   * Refresh configuration from Secrets Manager
   */
  async refreshConfig() {
    this.initialized = false;
    this.config = null;
    this.client = null;
    await this.initialize();
  }
}

// Export singleton instance
module.exports = new SESService();