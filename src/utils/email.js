const nodemailer = require('nodemailer');
require('dotenv').config();

// Email configuration
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // Production email configuration (AWS SES recommended)
    return nodemailer.createTransport({
      service: 'SES',
      auth: {
        user: process.env.AWS_SES_ACCESS_KEY,
        pass: process.env.AWS_SES_SECRET_KEY,
      },
      region: process.env.AWS_REGION || 'us-east-1',
    });
  } else {
    // Development configuration (using Gmail or other SMTP)
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
};

class EmailService {
  constructor() {
    this.transporter = createTransporter();
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@francislegacy.com';
    this.fromName = process.env.FROM_NAME || 'Francis Legacy';
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  // Welcome email for new family members
  async sendWelcomeEmail(userEmail, firstName, tempPassword) {
    const subject = 'Welcome to Francis Legacy - Your Account Details';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .credentials { background: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .btn { display: inline-block; background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Francis Legacy</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName},</h2>
            <p>You've been invited to join the Francis Legacy family website! Your account has been created by an administrator.</p>
            
            <div class="credentials">
              <h3>Your Login Credentials:</h3>
              <p><strong>Email:</strong> ${userEmail}</p>
              <p><strong>Temporary Password:</strong> ${tempPassword}</p>
            </div>
            
            <p><strong>Important:</strong> Please change your password after your first login for security.</p>
            
            <p>As a family member, you can:</p>
            <ul>
              <li>Submit news articles for review</li>
              <li>Upload family photos and documents to the archive</li>
              <li>Update your profile information</li>
              <li>Browse the family tree and history</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="btn">Login to Your Account</a>
            </div>
          </div>
          <div class="footer">
            <p>This email was sent from Francis Legacy. If you have any questions, please contact the administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Email verification
  async sendVerificationEmail(userEmail, firstName, verificationToken) {
    const subject = 'Verify Your Francis Legacy Account';
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .btn { display: inline-block; background: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName},</h2>
            <p>Please verify your email address to complete your Francis Legacy account setup.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" class="btn">Verify Email Address</a>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3498db;">${verificationUrl}</p>
            
            <p><strong>This link will expire in 24 hours.</strong></p>
          </div>
          <div class="footer">
            <p>If you didn't request this verification, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Password reset email
  async sendPasswordResetEmail(userEmail, firstName, resetToken) {
    const subject = 'Reset Your Francis Legacy Password';
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .btn { display: inline-block; background: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName},</h2>
            <p>You requested to reset your password for your Francis Legacy account.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="btn">Reset Password</a>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3498db;">${resetUrl}</p>
            
            <p><strong>This link will expire in 1 hour.</strong></p>
            
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>This email was sent from Francis Legacy for security purposes.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // One-time verification code for family member login
  async sendLoginVerificationCode(userEmail, firstName, code) {
    const subject = 'Your Francis Legacy Login Verification Code';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .code { background: white; font-size: 24px; font-weight: bold; text-align: center; padding: 20px; border-radius: 5px; margin: 20px 0; letter-spacing: 3px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Login Verification Code</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName},</h2>
            <p>Here's your one-time verification code to complete your login:</p>
            
            <div class="code">${code}</div>
            
            <p>Enter this code on the verification page to access your account.</p>
            
            <p><strong>This code will expire in 10 minutes.</strong></p>
            
            <p>If you didn't attempt to log in, please contact the administrator immediately.</p>
          </div>
          <div class="footer">
            <p>This is an automated security message from Francis Legacy.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }
}

// Export singleton instance
const emailService = new EmailService();
module.exports = emailService;