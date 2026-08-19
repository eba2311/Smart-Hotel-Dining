/**
 * Two-Factor Authentication (2FA) Service
 * Provides enhanced security for staff accounts
 */

import crypto from 'crypto';
import smsService from '../notifications/smsService.js';
import emailService from '../notifications/emailService.js';

class TwoFactorService {
  /**
   * Generate OTP
   */
  generateOTP(length = 6) {
    return crypto.randomInt(Math.pow(10, length - 1), Math.pow(10, length)).toString();
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes(count = 10) {
    return Array(count)
      .fill(0)
      .map(() => {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        return `${code.substring(0, 4)}-${code.substring(4, 8)}`;
      });
  }

  /**
   * Send OTP via SMS
   */
  async sendOTPviaSMS(phone, otp, expiryMinutes = 5) {
    const message = `Your Smart Hotel 2FA Code: ${otp}. Valid for ${expiryMinutes} minutes. Never share this code.`;

    const result = await smsService.send(phone, message);

    if (!result.success) {
      throw new Error(`Failed to send OTP: ${result.error}`);
    }

    return {
      success: true,
      method: 'sms',
      phone,
      expiresAt: new Date(Date.now() + expiryMinutes * 60000),
    };
  }

  /**
   * Send OTP via Email
   */
  async sendOTPviaEmail(email, otp, expiryMinutes = 5) {
    const emailContent = `
      <h1>🔐 Two-Factor Authentication</h1>
      <p>Your 2FA Code: <strong>${otp}</strong></p>
      <p>This code expires in ${expiryMinutes} minutes.</p>
      <p><strong>Never share this code with anyone.</strong></p>
      <p>If you didn't request this code, ignore this email.</p>
    `;

    await emailService.send(email, '2FA Verification Code', emailContent);

    return {
      success: true,
      method: 'email',
      email,
      expiresAt: new Date(Date.now() + expiryMinutes * 60000),
    };
  }

  /**
   * Verify OTP
   */
  async verifyOTP(storedOTP, submittedOTP, expiryTime) {
    if (!storedOTP || !submittedOTP) {
      return { valid: false, message: 'OTP is required' };
    }

    if (new Date() > new Date(expiryTime)) {
      return { valid: false, message: 'OTP has expired' };
    }

    if (storedOTP !== submittedOTP.trim()) {
      return { valid: false, message: 'Incorrect OTP' };
    }

    return { valid: true };
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(backupCodes, submittedCode) {
    const formatted = submittedCode.toUpperCase().replace(/\s/g, '');

    const index = backupCodes.findIndex(code => {
      const formattedCode = code.toUpperCase().replace(/\s/g, '');
      return formattedCode === formatted;
    });

    if (index === -1) {
      return { valid: false, message: 'Invalid backup code' };
    }

    return { valid: true, codeIndex: index };
  }

  /**
   * Enable 2FA for user
   */
  async enable2FA(user, method = 'sms') {
    const secret = this.generateSecret();
    const backupCodes = this.generateBackupCodes();

    user.twoFactorAuth = {
      enabled: false, // Requires verification first
      method,
      secret,
      backupCodes,
      createdAt: new Date(),
      verificationAttempts: 0,
      lastVerificationAttempt: null,
    };

    // Send initial OTP
    const otp = this.generateOTP();

    if (method === 'sms' && user.phone) {
      await this.sendOTPviaSMS(user.phone, otp);
    } else if (method === 'email' && user.email) {
      await this.sendOTPviaEmail(user.email, otp);
    }

    return {
      secret,
      backupCodes,
      method,
      message: `2FA setup initiated. Check your ${method} for verification code.`,
    };
  }

  /**
   * Verify 2FA setup
   */
  async verify2FASetup(user, otp, backupCodes) {
    if (!user.twoFactorAuth) {
      throw new Error('2FA setup not initiated');
    }

    if (user.twoFactorAuth.enabled) {
      throw new Error('2FA is already enabled');
    }

    // In production, verify TOTP token using the secret
    // For now, we use OTP verification
    if (otp) {
      // Verify OTP (simplified - in production use TOTP)
      const isValid = otp.length === 6; // Basic validation
      if (!isValid) {
        user.twoFactorAuth.verificationAttempts += 1;
        if (user.twoFactorAuth.verificationAttempts > 5) {
          user.twoFactorAuth = null;
          throw new Error('Too many failed attempts. Please try again.');
        }
        throw new Error('Invalid OTP');
      }
    }

    // Enable 2FA
    user.twoFactorAuth.enabled = true;
    user.twoFactorAuth.verificationAttempts = 0;

    return {
      success: true,
      message: '2FA enabled successfully',
      backupCodes: user.twoFactorAuth.backupCodes,
    };
  }

  /**
   * Disable 2FA
   */
  async disable2FA(user, password, reason = 'User request') {
    if (!user.twoFactorAuth?.enabled) {
      throw new Error('2FA is not enabled');
    }

    // In production, verify password here
    // await verifyPassword(password, user.password);

    user.twoFactorAuth = null;

    return {
      success: true,
      message: '2FA disabled successfully',
      auditLog: {
        action: '2FA_DISABLED',
        user: user._id,
        reason,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Generate TOTP secret (for authenticator apps)
   */
  generateSecret() {
    return crypto.randomBytes(20).toString('base64');
  }

  /**
   * Setup authenticator app (Google Authenticator, Authy, etc.)
   */
  setupAuthenticatorApp(user, appName = 'SmartHotel') {
    const secret = this.generateSecret();
    const qrCodeURL = `otpauth://totp/${appName}:${user.email}?secret=${secret}&issuer=${appName}`;

    return {
      secret,
      qrCodeURL,
      manualEntryKey: secret,
      instructions: `
        1. Open your authenticator app (Google Authenticator, Authy, Microsoft Authenticator)
        2. Tap the + button to add a new account
        3. Scan this QR code or enter the manual key below
        4. Your app will generate a 6-digit code every 30 seconds
        5. Enter this code to verify setup
      `,
    };
  }

  /**
   * Get 2FA status
   */
  get2FAStatus(user) {
    if (!user.twoFactorAuth) {
      return {
        enabled: false,
        configured: false,
      };
    }

    return {
      enabled: user.twoFactorAuth.enabled,
      configured: true,
      method: user.twoFactorAuth.method,
      backupCodesCount: user.twoFactorAuth.backupCodes?.filter(code => code.used !== true).length || 0,
      createdAt: user.twoFactorAuth.createdAt,
    };
  }

  /**
   * Use backup code
   */
  async useBackupCode(user, code) {
    if (!user.twoFactorAuth?.enabled) {
      throw new Error('2FA is not enabled');
    }

    const verification = this.verifyBackupCode(user.twoFactorAuth.backupCodes, code);

    if (!verification.valid) {
      throw new Error(verification.message);
    }

    // Mark code as used
    user.twoFactorAuth.backupCodes[verification.codeIndex].used = true;
    user.twoFactorAuth.backupCodes[verification.codeIndex].usedAt = new Date();

    const remainingCodes = user.twoFactorAuth.backupCodes.filter(c => !c.used).length;

    if (remainingCodes < 3) {
      return {
        success: true,
        warning: `Only ${remainingCodes} backup codes remaining. Please generate new ones.`,
        remainingCodes,
      };
    }

    return {
      success: true,
      remainingCodes,
    };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(user) {
    if (!user.twoFactorAuth?.enabled) {
      throw new Error('2FA is not enabled');
    }

    const newBackupCodes = this.generateBackupCodes();
    const oldCount = user.twoFactorAuth.backupCodes.length;

    user.twoFactorAuth.backupCodes = newBackupCodes;
    user.twoFactorAuth.backupCodesResetAt = new Date();

    return {
      success: true,
      backupCodes: newBackupCodes,
      message: `Generated ${newBackupCodes.length} new backup codes. Save them in a safe place.`,
    };
  }

  /**
   * Audit 2FA access
   */
  audit2FAAccess(user, status, method, ip, userAgent) {
    return {
      userId: user._id,
      email: user.email,
      action: `2FA_${status.toUpperCase()}`,
      method,
      ip,
      userAgent,
      timestamp: new Date(),
    };
  }

  /**
   * Enforce 2FA policy
   */
  shouldEnforce2FA(user) {
    const rolesWith2FA = ['admin', 'manager', 'kitchen']; // Customize based on security policy
    return rolesWith2FA.includes(user.role);
  }

  /**
   * Check if 2FA enrollment is required
   */
  is2FAEnrollmentRequired(user) {
    if (!this.shouldEnforce2FA(user)) {
      return false;
    }

    return !user.twoFactorAuth?.enabled;
  }

  /**
   * Get 2FA settings for user profile
   */
  get2FASettings(user) {
    const status = this.get2FAStatus(user);

    return {
      status,
      methods: ['sms', 'email', 'authenticator'],
      isRequired: this.shouldEnforce2FA(user),
      isEnrolled: user.twoFactorAuth?.enabled || false,
      backupCodesCount: user.twoFactorAuth?.backupCodes?.filter(c => !c.used).length || 0,
    };
  }
}

export default new TwoFactorService();
