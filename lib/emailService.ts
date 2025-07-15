// Email service utility for sending OTP emails using Resend

import { Resend } from 'resend';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private resend: Resend | null = null;
  private isDevelopment = process.env.NODE_ENV === 'development';

  constructor() {
    // Initialize Resend only if API key is available
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
  }  
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      // Default from email using Resend's test domain
      const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
      
      // Check if Resend is configured
      if (!this.resend || !process.env.RESEND_API_KEY) {
        if (this.isDevelopment) {
          // In development, log the email if no API key is configured
          console.log('\n=== EMAIL SERVICE (DEVELOPMENT - NO API KEY) ===');
          console.log(`From: ${fromEmail}`);
          console.log(`To: ${options.to}`);
          console.log(`Subject: ${options.subject}`);
          console.log(`HTML Content:\n${options.html}`);
          console.log('===================================\n');
          return { success: true };
        } else {
          return { 
            success: false, 
            error: 'Email service not configured. Please set RESEND_API_KEY environment variable.' 
          };
        }
      }

      // Send email using Resend
      await this.resend.emails.send({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      });

      console.log(`Email sent successfully to: ${options.to}`);
      return { success: true };
      
    } catch (error) {
            console.error('Email sending error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error'
      };
    }
  }
  generateOTPEmailTemplate(otpCode: string, email: string): string {
    const logoUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.com/images/refractlogo/darklogo.png' // Replace with your actual domain
      : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIGZpbGw9IiMwMDdiZmYiLz48dGV4dCB4PSI1MCIgeT0iNTUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjIwIiBmb250LXdlaWdodD0iYm9sZCI+UjwvdGV4dD48L3N2Zz4=';
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - Refract</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px 0;
            margin: 0;
          }
          
          .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          }
          
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 40px 30px;
            text-align: center;
            position: relative;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/></pattern></defs><rect width="100" height="20" fill="url(%23grid)"/></svg>');
            opacity: 0.3;
          }
          
          .logo-container {
            position: relative;
            z-index: 2;
            margin-bottom: 20px;
          }
          
          .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 15px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 255, 255, 0.2);
          }
          
          .logo img {
            width: 50px;
            height: 50px;
            object-fit: contain;
          }
          
          .brand-name {
            color: white;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            letter-spacing: -0.5px;
          }
          
          .header-subtitle {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            font-weight: 400;
            position: relative;
            z-index: 2;
          }
          
          .content {
            padding: 50px 40px;
          }
          
          .greeting {
            font-size: 18px;
            color: #1a1a1a;
            margin-bottom: 20px;
            font-weight: 500;
          }
          
          .message {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 40px;
            line-height: 1.7;
          }
          
          .highlight-email {
            color: #667eea;
            font-weight: 600;
            background: rgba(102, 126, 234, 0.1);
            padding: 2px 6px;
            border-radius: 6px;
          }
          
          .otp-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            margin: 40px 0;
            position: relative;
            overflow: hidden;
          }
          
          .otp-section::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: shimmer 3s ease-in-out infinite;
          }
          
          @keyframes shimmer {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(180deg); }
          }
          
          .otp-label {
            color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 15px;
            position: relative;
            z-index: 2;
          }
          
          .otp-code {
            color: white;
            font-size: 48px;
            font-weight: 800;
            letter-spacing: 12px;
            margin-bottom: 15px;
            text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            font-family: 'Courier New', monospace;
            position: relative;
            z-index: 2;
          }
          
          .otp-timer {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            font-weight: 500;
            position: relative;
            z-index: 2;
          }
          
          .instructions {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 16px;
            padding: 30px;
            margin: 30px 0;
            border-left: 5px solid #667eea;
          }
          
          .instructions-title {
            color: #667eea;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .instructions-list {
            list-style: none;
            padding: 0;
          }
          
          .instructions-list li {
            color: #4a5568;
            font-size: 15px;
            margin-bottom: 12px;
            padding-left: 25px;
            position: relative;
          }
          
          .instructions-list li::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #48bb78;
            font-weight: bold;
            font-size: 16px;
          }
          
          .security-notice {
            background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%);
            border: 1px solid #fc8181;
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }
          
          .security-icon {
            color: #e53e3e;
            font-size: 20px;
            margin-top: 2px;
            flex-shrink: 0;
          }
          
          .security-content {
            color: #742a2a;
            font-size: 14px;
            line-height: 1.5;
          }
          
          .security-title {
            font-weight: 700;
            margin-bottom: 5px;
          }
          
          .footer {
            text-align: center;
            padding: 40px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
          }
          
          .footer-text {
            color: #718096;
            font-size: 14px;
            margin-bottom: 10px;
          }
          
          .footer-brand {
            color: #667eea;
            font-weight: 600;
            text-decoration: none;
          }
          
          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%);
            margin: 30px 0;
          }
          
          @media (max-width: 600px) {
            .email-wrapper {
              margin: 0 10px;
              border-radius: 12px;
            }
            
            .header, .content, .footer {
              padding: 30px 25px;
            }
            
            .otp-code {
              font-size: 36px;
              letter-spacing: 8px;
            }
            
            .brand-name {
              font-size: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <div class="logo-container">
              <div class="logo">
                <img src="${logoUrl}" alt="Refract Logo" />
              </div>
              <h1 class="brand-name">Refract</h1>
              <p class="header-subtitle">Secure Email Verification</p>
            </div>
          </div>
          
          <div class="content">
            <div class="greeting">Hello there! 👋</div>
            
            <div class="message">
              We received a request to change your email address to <span class="highlight-email">${email}</span>. 
              To complete this process and secure your account, please verify your new email address using the code below.
            </div>
            
            <div class="otp-section">
              <div class="otp-label">Verification Code</div>
              <div class="otp-code">${otpCode}</div>
              <div class="otp-timer">⏱️ Valid for 10 minutes</div>
            </div>
            
            <div class="instructions">
              <div class="instructions-title">
                <span>📋</span>
                How to use this code:
              </div>
              <ul class="instructions-list">
                <li>Copy the 6-digit code above</li>
                <li>Return to the verification page</li>
                <li>Enter the code in the verification field</li>
                <li>Complete the email change process</li>
              </ul>
            </div>
            
            <div class="divider"></div>
            
            <div class="security-notice">
              <div class="security-icon">🛡️</div>
              <div class="security-content">
                <div class="security-title">Security Notice</div>
                If you didn't request this email change, please ignore this message and consider updating your account security settings. Never share this verification code with anyone.
              </div>
            </div>
            
            <div style="margin-top: 40px; color: #718096; font-size: 15px;">
              Need assistance? Contact our support team – we're here to help! 💬
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-text">
              This email was sent by <a href="#" class="footer-brand">Refract</a>
            </div>
            <div class="footer-text">
              This is an automated message. Please do not reply to this email.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Export a singleton instance
export const emailService = new EmailService();
