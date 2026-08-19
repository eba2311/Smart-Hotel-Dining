/**
 * Email Service
 * Handles all email communications (order confirmations, receipts, alerts, etc.)
 * In production, integrate with services like SendGrid, AWS SES, or Mailgun
 */

import { config } from '../../config/env.js';

class EmailService {
  constructor() {
    // In production, initialize actual email provider
    // Example: this.transporter = nodemailer.createTransport({...})
    this.provider = process.env.EMAIL_PROVIDER || 'mock';
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@smarthotel.com';
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(customer, order, items) {
    const emailContent = this.generateOrderConfirmationEmail(customer, order, items);
    return this.send(customer.email, 'Order Confirmation', emailContent);
  }

  /**
   * Send order ready notification
   */
  async sendOrderReady(customer, orderId, estimatedPickup) {
    const emailContent = this.generateOrderReadyEmail(customer, orderId, estimatedPickup);
    return this.send(customer.email, 'Your Order is Ready!', emailContent);
  }

  /**
   * Send delivery confirmation
   */
  async sendDeliveryConfirmation(customer, orderId, deliveryTime) {
    const emailContent = this.generateDeliveryConfirmationEmail(customer, orderId, deliveryTime);
    return this.send(customer.email, 'Order Delivered', emailContent);
  }

  /**
   * Send low inventory alert to manager
   */
  async sendLowInventoryAlert(manager, ingredient, currentStock, reorderLevel) {
    const emailContent = this.generateInventoryAlertEmail(ingredient, currentStock, reorderLevel);
    return this.send(manager.email, `Low Stock Alert: ${ingredient.name}`, emailContent);
  }

  /**
   * Send daily analytics summary to manager
   */
  async sendDailySummary(manager, analytics) {
    const emailContent = this.generateDailySummaryEmail(analytics);
    return this.send(manager.email, 'Daily Business Summary', emailContent);
  }

  /**
   * Send password reset link
   */
  async sendPasswordReset(user, resetToken) {
    const resetLink = `${process.env.CLIENT_ORIGIN}/reset-password?token=${resetToken}`;
    const emailContent = this.generatePasswordResetEmail(user, resetLink);
    return this.send(user.email, 'Password Reset Request', emailContent);
  }

  /**
   * Send welcome email to new staff
   */
  async sendWelcomeEmail(user, tempPassword) {
    const emailContent = this.generateWelcomeEmail(user, tempPassword);
    return this.send(user.email, 'Welcome to Smart Hotel Dining', emailContent);
  }

  /**
   * Send payment failure notification
   */
  async sendPaymentFailure(customer, order, reason) {
    const emailContent = this.generatePaymentFailureEmail(customer, order, reason);
    return this.send(customer.email, 'Payment Failed - Action Required', emailContent);
  }

  /**
   * Send feedback thank you email
   */
  async sendFeedbackThanks(customer, sentiment) {
    const emailContent = this.generateFeedbackThanksEmail(customer, sentiment);
    return this.send(customer.email, 'Thank You for Your Feedback', emailContent);
  }

  /**
   * Core send method
   */
  async send(to, subject, htmlContent) {
    try {
      if (this.provider === 'mock') {
        return this.sendMock(to, subject, htmlContent);
      } else if (this.provider === 'sendgrid') {
        return this.sendWithSendGrid(to, subject, htmlContent);
      } else if (this.provider === 'aws-ses') {
        return this.sendWithAWSSES(to, subject, htmlContent);
      }
      return { success: false, message: 'Unknown email provider' };
    } catch (error) {
      console.error('❌ Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mock implementation (for testing)
   */
  async sendMock(to, subject, htmlContent) {
    console.log(`📧 [MOCK EMAIL] To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Content: ${htmlContent.substring(0, 100)}...`);
    return { success: true, message: 'Email sent (mock)' };
  }

  /**
   * SendGrid integration
   */
  async sendWithSendGrid(to, subject, htmlContent) {
    // Requires: npm install @sendgrid/mail
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // return sgMail.send({ to, from: this.fromEmail, subject, html: htmlContent });
    return { success: true, message: 'SendGrid not configured' };
  }

  /**
   * AWS SES integration
   */
  async sendWithAWSSES(to, subject, htmlContent) {
    // Requires: npm install aws-sdk
    // const AWS = require('aws-sdk');
    // const ses = new AWS.SES();
    // return ses.sendEmail({...}).promise();
    return { success: true, message: 'AWS SES not configured' };
  }

  // ==================== EMAIL TEMPLATES ====================

  generateOrderConfirmationEmail(customer, order, items) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #6366f1, #4f46e5); color: white; padding: 20px; border-radius: 8px; }
            .content { margin: 20px 0; }
            .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .total { font-weight: bold; font-size: 18px; margin-top: 20px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
            .button { background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Order Confirmed</h1>
              <p>Order ID: <strong>${order._id}</strong></p>
              <p>Time: ${new Date(order.createdAt).toLocaleString()}</p>
            </div>
            
            <div class="content">
              <h2>Hello ${customer.name || 'Guest'}!</h2>
              <p>Your order has been confirmed and sent to the kitchen.</p>
              
              <h3>Order Details:</h3>
              ${items.map(item => `
                <div class="item">
                  <span>${item.qty}x ${item.menuItem.name}</span>
                  <span>ETB ${(item.unitPrice * item.qty).toFixed(2)}</span>
                </div>
              `).join('')}
              
              <div class="total">
                Total: ETB ${order.total.toFixed(2)}
              </div>
              
              <p style="margin-top: 20px; color: #666;">
                <strong>Estimated preparation time:</strong> ${order.estimatedTime || '20-30'} minutes
              </p>
              
              <p>We'll notify you when your order is ready for pickup!</p>
              
              <a href="${process.env.CLIENT_ORIGIN}/track/${order._id}" class="button">Track Your Order</a>
            </div>
            
            <div class="footer">
              <p>Smart Hotel Dining | ${config.clientOrigin}</p>
              <p>Thank you for your order!</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  generateOrderReadyEmail(customer, orderId, estimatedPickup) {
    return `
      <h1>🍽️ Your Order is Ready!</h1>
      <p>Dear ${customer.name || 'Guest'},</p>
      <p>Your order (ID: ${orderId}) is now ready for pickup!</p>
      <p><strong>Pickup Location:</strong> Main Counter</p>
      <p><strong>Valid until:</strong> ${estimatedPickup}</p>
      <p>Please visit us soon, or it will be kept warm.</p>
      <p>Thank you for dining with us!</p>
    `;
  }

  generateDeliveryConfirmationEmail(customer, orderId, deliveryTime) {
    return `
      <h1>✓ Order Delivered</h1>
      <p>Your order (ID: ${orderId}) has been delivered.</p>
      <p><strong>Delivery Time:</strong> ${new Date(deliveryTime).toLocaleString()}</p>
      <p>We hope you enjoyed your meal! Please rate your experience.</p>
    `;
  }

  generateInventoryAlertEmail(ingredient, currentStock, reorderLevel) {
    return `
      <h1>⚠️ Low Stock Alert</h1>
      <p><strong>${ingredient.name}</strong> inventory is running low.</p>
      <p><strong>Current Stock:</strong> ${currentStock} ${ingredient.unit}</p>
      <p><strong>Reorder Level:</strong> ${reorderLevel} ${ingredient.unit}</p>
      <p>Please reorder immediately to avoid menu disruptions.</p>
    `;
  }

  generateDailySummaryEmail(analytics) {
    return `
      <h1>📊 Daily Business Summary</h1>
      <h2>${new Date().toLocaleDateString()}</h2>
      <ul>
        <li><strong>Total Orders:</strong> ${analytics.totalOrders}</li>
        <li><strong>Revenue:</strong> ETB ${analytics.revenue.toFixed(2)}</li>
        <li><strong>Average Order Value:</strong> ETB ${analytics.averageOrderValue.toFixed(2)}</li>
        <li><strong>Popular Items:</strong> ${analytics.topItems.map(i => i.name).join(', ')}</li>
        <li><strong>Customer Satisfaction:</strong> ${analytics.averageRating}/5.0</li>
      </ul>
      <p>View more details in your dashboard.</p>
    `;
  }

  generatePasswordResetEmail(user, resetLink) {
    return `
      <h1>Password Reset Request</h1>
      <p>Hi ${user.name},</p>
      <p>We received a request to reset your password. Click the link below:</p>
      <a href="${resetLink}" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Reset Password</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, ignore this email.</p>
    `;
  }

  generateWelcomeEmail(user, tempPassword) {
    return `
      <h1>Welcome to Smart Hotel Dining! 👋</h1>
      <p>Hello ${user.name},</p>
      <p>Your account has been created.</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Temporary Password:</strong> ${tempPassword}</p>
      <p><strong>Role:</strong> ${user.role}</p>
      <p>Please log in and change your password immediately.</p>
      <p>Login: ${process.env.CLIENT_ORIGIN}/login</p>
    `;
  }

  generatePaymentFailureEmail(customer, order, reason) {
    return `
      <h1>⚠️ Payment Failed</h1>
      <p>Dear ${customer.name},</p>
      <p>Your payment for order ${order._id} failed.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please try again or contact support.</p>
    `;
  }

  generateFeedbackThanksEmail(customer, sentiment) {
    return `
      <h1>Thank You for Your Feedback! 🙏</h1>
      <p>Dear ${customer.name},</p>
      <p>We appreciate your feedback on your recent order.</p>
      <p><strong>Your Sentiment:</strong> ${sentiment.overall} (${sentiment.score}/10)</p>
      <p>Your comments help us improve!</p>
    `;
  }
}

export default new EmailService();
