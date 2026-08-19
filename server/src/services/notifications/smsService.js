/**
 * SMS Service
 * Handles SMS notifications (order status, OTP, alerts, etc.)
 * In production, integrate with Twilio, AWS SNS, or local provider
 */

class SMSService {
  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'mock';
    this.apiKey = process.env.SMS_API_KEY;
    this.senderId = process.env.SMS_SENDER_ID || 'SmartHotel';
  }

  /**
   * Send order confirmation SMS
   */
  async sendOrderConfirmationSMS(phone, orderId, estimatedTime) {
    const message = `Your order #${orderId} confirmed! Estimated time: ${estimatedTime} mins. Track: ${process.env.CLIENT_ORIGIN}/track/${orderId}`;
    return this.send(phone, message);
  }

  /**
   * Send order ready SMS
   */
  async sendOrderReadySMS(phone, orderId) {
    const message = `🍽️ Your order #${orderId} is ready for pickup!`;
    return this.send(phone, message);
  }

  /**
   * Send order delivered SMS
   */
  async sendOrderDeliveredSMS(phone, orderId) {
    const message = `✓ Your order #${orderId} has been delivered. Please rate: ${process.env.CLIENT_ORIGIN}/feedback/${orderId}`;
    return this.send(phone, message);
  }

  /**
   * Send OTP for 2FA
   */
  async sendOTP(phone, otp, expiryMinutes = 5) {
    const message = `Your Smart Hotel OTP: ${otp}. Valid for ${expiryMinutes} minutes. Never share this.`;
    return this.send(phone, message);
  }

  /**
   * Send service request confirmation
   */
  async sendServiceRequestSMS(phone, requestId, service) {
    const message = `Service request #${requestId} (${service}) received. We'll assist shortly!`;
    return this.send(phone, message);
  }

  /**
   * Send low inventory alert to manager
   */
  async sendLowInventoryAlert(phone, itemName, currentStock) {
    const message = `⚠️ Low stock alert: ${itemName} (${currentStock} left). Reorder ASAP.`;
    return this.send(phone, message);
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(phone, orderId, amount) {
    const message = `Payment reminder: Order #${orderId} worth ETB ${amount} is pending. Complete payment to proceed.`;
    return this.send(phone, message);
  }

  /**
   * Core send method
   */
  async send(phone, message) {
    try {
      if (!phone || !phone.trim()) {
        return { success: false, message: 'Invalid phone number' };
      }

      if (this.provider === 'mock') {
        return this.sendMock(phone, message);
      } else if (this.provider === 'twilio') {
        return this.sendWithTwilio(phone, message);
      } else if (this.provider === 'aws-sns') {
        return this.sendWithAWSSNS(phone, message);
      }

      return { success: false, message: 'Unknown SMS provider' };
    } catch (error) {
      console.error('❌ SMS send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mock implementation (for testing)
   */
  async sendMock(phone, message) {
    console.log(`📱 [MOCK SMS] To: ${phone}`);
    console.log(`   Message: ${message}`);
    return { success: true, message: 'SMS sent (mock)', sid: `mock-${Date.now()}` };
  }

  /**
   * Twilio integration
   */
  async sendWithTwilio(phone, message) {
    try {
      // Requires: npm install twilio
      // const twilio = require('twilio');
      // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      // const response = await client.messages.create({
      //   body: message,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: phone
      // });
      // return { success: true, sid: response.sid };
      return { success: true, message: 'Twilio not configured' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * AWS SNS integration
   */
  async sendWithAWSSNS(phone, message) {
    try {
      // Requires: npm install aws-sdk
      // const AWS = require('aws-sdk');
      // const sns = new AWS.SNS();
      // const response = await sns.publish({
      //   Message: message,
      //   PhoneNumber: phone
      // }).promise();
      // return { success: true, messageId: response.MessageId };
      return { success: true, message: 'AWS SNS not configured' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Format phone number to E.164 standard
   */
  formatPhoneNumber(phone) {
    // Supports Ethiopian (+251), US (+1), etc.
    let formatted = phone.replace(/\D/g, '');
    if (formatted.startsWith('0')) formatted = '251' + formatted.substring(1);
    if (!formatted.startsWith('+')) formatted = '+' + formatted;
    return formatted;
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phone) {
    const e164Regex = /^\+?[1-9]\d{1,14}$/;
    return e164Regex.test(phone.replace(/\D/g, ''));
  }
}

export default new SMSService();
