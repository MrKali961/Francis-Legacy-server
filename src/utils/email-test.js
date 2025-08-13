// Test email service that doesn't actually send emails
class TestEmailService {
  constructor() {
    this.sentEmails = [];
    this.fromEmail = 'test@francislegacy.com';
    this.fromName = 'Francis Legacy Test';
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    const email = {
      to,
      subject,
      html: htmlContent,
      text: textContent || this.stripHtml(htmlContent),
      sentAt: new Date()
    };
    
    this.sentEmails.push(email);
    console.log(`📧 Test Email Sent to: ${to}, Subject: ${subject}`);
    
    return { success: true, messageId: `test-${Date.now()}` };
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  async sendWelcomeEmail(userEmail, firstName, tempPassword) {
    const subject = 'Welcome to Francis Legacy - Your Account Details';
    const htmlContent = `<h1>Welcome ${firstName}!</h1><p>Your password is: ${tempPassword}</p>`;
    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  async sendVerificationEmail(userEmail, firstName, verificationToken) {
    const subject = 'Verify Your Francis Legacy Account';
    const htmlContent = `<h1>Hello ${firstName}!</h1><p>Verification token: ${verificationToken}</p>`;
    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  async sendPasswordResetEmail(userEmail, firstName, resetToken) {
    const subject = 'Reset Your Francis Legacy Password';
    const htmlContent = `<h1>Hello ${firstName}!</h1><p>Reset token: ${resetToken}</p>`;
    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  async sendLoginVerificationCode(userEmail, firstName, code) {
    const subject = 'Your Francis Legacy Login Verification Code';
    const htmlContent = `<h1>Hello ${firstName}!</h1><p>Your code: ${code}</p>`;
    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  // Get sent emails for testing
  getSentEmails() {
    return this.sentEmails;
  }

  clearSentEmails() {
    this.sentEmails = [];
  }
}

// Export test email service
const testEmailService = new TestEmailService();
module.exports = testEmailService;