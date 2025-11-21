/* File: utils/emailService.js
   Description: Centralized email service using Resend HTTP API (no SMTP),
   with responsive light-themed branded templates + tracking.
*/

const { Resend } = require('resend');
const { htmlEscape } = require('./htmlEscape');

const MIN_NEW_TOOL_EMAIL_COUNT = parseInt(process.env.MIN_NEW_TOOL_EMAIL_COUNT || '5', 10);

// ENV-based config
const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM; // e.g. "AI Tools Hub <noreply@myalltools.shop>"
const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || emailFrom || '';
// Use EMAIL_LOGO_URL if set, otherwise default to backend /uploads/logo.png
const brandLogoUrl =
  process.env.EMAIL_LOGO_URL ||
  `${process.env.BACKEND_URL || ''}/uploads/logo.png`;

if (!resendApiKey) {
  console.warn('⚠️ RESEND_API_KEY is not set. Emails will fail until configured.');
}
if (!emailFrom) {
  console.warn('⚠️ EMAIL_FROM is not set. It must match a verified domain in Resend.');
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Sends an email using Resend HTTP API.
 * @param {object} mailOptions - { from?, to, subject, html, text?, replyTo? }
 */
const sendEmail = async (mailOptions) => {
  try {
    if (!resend || !resendApiKey) {
      console.error('❌ RESEND_API_KEY missing or Resend not initialized.');
      throw new Error('Email service not configured.');
    }
    if (!emailFrom) {
      console.error('❌ EMAIL_FROM is not configured. Set it to a verified domain email.');
      throw new Error('Email FROM address not configured.');
    }

    const payload = {
      ...mailOptions,
      from: mailOptions.from || emailFrom, // enforce verified from address
    };

    console.log('📧 Sending via Resend:', {
      to: payload.to,
      subject: payload.subject,
      from: payload.from,
    });

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error('❌ Resend error:', error);
      throw new Error('Failed to send email.');
    }

    console.log('✅ Email sent successfully via Resend:', data?.id || data);
    return data;
  } catch (error) {
    console.error('❌ Error sending email:', error.message || error);
    throw new Error('Failed to send email.');
  }
};

/* ------------------------------------------------------------------
   Light & Responsive Color Scheme
-------------------------------------------------------------------*/

const COLORS = {
  primary: '#6366f1',      // Indigo
  primaryLight: '#a5b4fc',
  primaryDark: '#4f46e5',
  accent: '#10b981',       // Emerald
  accentLight: '#6ee7b7',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  
  // Light theme colors
  bgLight: '#f8fafc',      // Slate 50
  bgCard: '#ffffff',
  border: '#e2e8f0',       // Slate 200
  borderLight: '#f1f5f9',  // Slate 100
  
  textPrimary: '#0f172a',  // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#64748b',    // Slate 500
  
  // Gradient colors
  gradientStart: '#f0f9ff', // Blue 50
  gradientEnd: '#faf5ff',   // Purple 50
};

/**
 * Safely append UTM tracking params to a URL for basic click analytics.
 */
const addUtm = (
  rawUrl,
  { source = 'aitoolshub', medium = 'email', campaign = 'general' } = {}
) => {
  try {
    const url = new URL(rawUrl);
    url.searchParams.set('utm_source', source);
    url.searchParams.set('utm_medium', medium);
    url.searchParams.set('utm_campaign', campaign);
    return url.toString();
  } catch {
    return rawUrl;
  }
};

/**
 * Premium button component - responsive
 */
const createButton = (url, text, style = 'primary') => {
  const styles = {
    primary: {
      bg: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
      color: '#ffffff',
      shadow: '0 4px 14px 0 rgba(99, 102, 241, 0.4)',
    },
    accent: {
      bg: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.success} 100%)`,
      color: '#ffffff',
      shadow: '0 4px 14px 0 rgba(16, 185, 129, 0.4)',
    },
    secondary: {
      bg: COLORS.bgCard,
      color: COLORS.textPrimary,
      shadow: '0 2px 8px 0 rgba(0, 0, 0, 0.1)',
      border: `1px solid ${COLORS.border}`,
    },
  };

  const btnStyle = styles[style] || styles.primary;

  return `
    <a href="${url}" style="display:inline-block;background:${btnStyle.bg};color:${btnStyle.color};font-size:15px;font-weight:600;padding:14px 32px;border-radius:12px;text-decoration:none;box-shadow:${btnStyle.shadow};${btnStyle.border ? `border:${btnStyle.border};` : ''}transition:all 0.3s ease;font-family:inherit;letter-spacing:0.3px;">
      ${text}
    </a>
  `;
};

/**
 * Wrap core email content in a consistent light-themed responsive shell.
 */
const buildShell = ({
  title,
  preheader = '',
  heroEmoji = '✨',
  bodyHtml,
  showFooterCta = true,
  unsubscribeUrl = null,
}) => {
  const siteUrl = process.env.FRONTEND_URL || 'https://myalltools.shop';
  const trackedSiteUrl = addUtm(siteUrl, { campaign: 'footer', medium: 'email-footer' });

  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: ${COLORS.bgLight};
        }
        
        .email-wrapper {
          width: 100%;
          background-color: ${COLORS.bgLight};
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
        }
        
        @media only screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
          }
          
          .mobile-padding {
            padding: 20px !important;
          }
          
          .mobile-text {
            font-size: 14px !important;
          }
          
          .mobile-heading {
            font-size: 24px !important;
          }
          
          .mobile-button {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
            margin: 8px 0 !important;
          }
          
          .mobile-stack {
            display: block !important;
            width: 100% !important;
          }
          
          .mobile-hide {
            display: none !important;
          }
        }
        
        a:hover {
          opacity: 0.85;
        }
      </style>
    </head>
    <body style="margin:0;padding:0;background-color:${COLORS.bgLight};font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
      <!-- Preheader (hidden preview text in inbox) -->
      <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;font-size:1px;line-height:1px;mso-hide:all;">
        ${preheader}
      </div>

      <!-- Email Wrapper -->
      <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${COLORS.bgLight};min-height:100vh;">
        <tr>
          <td align="center" style="padding:20px 10px;">
            
            <!-- Main Container -->
            <table class="email-container" width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:${COLORS.bgCard};border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0, 0, 0, 0.07), 0 0 0 1px ${COLORS.borderLight};">
              
              <!-- Header with Gradient -->
              <tr>
                <td style="padding:0;background:linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);position:relative;">
                  <table width="100%" role="presentation">
                    <tr>
                      <td class="mobile-padding" style="padding:32px 28px;">
                        <table width="100%" role="presentation">
                          <tr>
                            <td style="vertical-align:middle;">
                              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                                <tr>
                                  <td style="padding-right:12px;vertical-align:middle;width:64px;">
                                    <div style="width:56px;height:56px;border-radius:14px;background:rgba(255,255,255,0.2);backdrop-filter:blur(10px);border:2px solid rgba(255,255,255,0.3);overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                                      <img src="${brandLogoUrl}" alt="AI Tools Hub" style="width:100%;height:100%;object-fit:cover;display:block;" />
                                    </div>
                                  </td>
                                  <td style="vertical-align:middle;">
                                    <div style="font-size:20px;font-weight:700;color:#ffffff;margin:0 0 4px;letter-spacing:-0.3px;">AI Tools Hub</div>
                                    <div style="font-size:12px;color:rgba(255,255,255,0.95);font-weight:500;">Your premium AI resource hub</div>
                                  </td>
                                  <td align="right" style="font-size:40px;line-height:1;vertical-align:middle;padding-left:12px;" class="mobile-hide">
                                    <div style="text-shadow:0 2px 8px rgba(0,0,0,0.2);">${heroEmoji}</div>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Main Content Body -->
              <tr>
                <td class="mobile-padding" style="padding:36px 32px;color:${COLORS.textPrimary};background:${COLORS.bgCard};line-height:1.6;">
                  ${bodyHtml}
                </td>
              </tr>

              <!-- Footer CTA Section -->
              ${
                showFooterCta
                  ? `
              <tr>
                <td class="mobile-padding" style="padding:0 32px 16px;background:${COLORS.bgCard};">
                  <div style="border-top:2px solid ${COLORS.borderLight};padding-top:24px;margin-bottom:12px;">
                    <table width="100%" role="presentation">
                      <tr>
                        <td style="padding:24px;background:linear-gradient(135deg, ${COLORS.gradientStart} 0%, ${COLORS.gradientEnd} 100%);border-radius:14px;border:1px solid ${COLORS.border};">
                          <div style="font-size:16px;font-weight:600;color:${COLORS.textPrimary};margin:0 0 8px;">✨ Discover more AI tools</div>
                          <div style="font-size:14px;color:${COLORS.textSecondary};margin:0 0 16px;line-height:1.6;">
                            Browse our curated collection of cutting-edge AI tools and resources.
                          </div>
                          <a href="${trackedSiteUrl}" style="display:inline-block;background:linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%);color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;box-shadow:0 2px 8px rgba(99, 102, 241, 0.3);">
                            Explore Now →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>`
                  : ''
              }

              <!-- Footer Meta Information -->
              <tr>
                <td class="mobile-padding" style="padding:24px 32px 32px;background:${COLORS.bgCard};">
                  <table width="100%" role="presentation">
                    <tr>
                      <td style="padding:20px;background:${COLORS.bgLight};border-radius:12px;border:1px solid ${COLORS.border};">
                        <div style="font-size:12px;color:${COLORS.textMuted};line-height:1.7;text-align:center;">
                          <strong style="color:${COLORS.textSecondary};">AI Tools Hub</strong> · Powered by myalltools.shop<br/>
                          <span style="opacity:0.9;">You're receiving this because you used AI Tools Hub or subscribed to updates.</span>
                          ${
                            unsubscribeUrl
                              ? `<br/><br/><a href="${addUtm(
                                  unsubscribeUrl,
                                  { campaign: 'unsubscribe', medium: 'email-footer' }
                                )}" style="color:${COLORS.textMuted};text-decoration:underline;font-size:11px;">Unsubscribe</a> from notifications`
                              : ''
                          }
                        </div>
                      </td>
                    </tr>
                  </table>
                  
                  <div style="text-align:center;margin-top:16px;font-size:11px;color:${COLORS.textMuted};opacity:0.7;">
                    © ${new Date().getFullYear()} AI Tools Hub. All rights reserved.
                  </div>
                </td>
              </tr>
            </table>
            
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};

/* ------------------------------------------------------------------
   Premium Email Templates
-------------------------------------------------------------------*/

const emailTemplates = {
  /** Password reset */
  passwordReset: (recipientEmail, token) => {
    const rawResetURL = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const resetURL = addUtm(rawResetURL, {
      campaign: 'password-reset',
      medium: 'transactional',
    });

    const bodyHtml = `
      <div style="margin-bottom:28px;">
        <h1 class="mobile-heading" style="margin:0 0 14px;font-size:28px;font-weight:700;color:${COLORS.textPrimary};letter-spacing:-0.5px;line-height:1.2;">
          Reset Your Password
        </h1>
        <p class="mobile-text" style="margin:0 0 16px;font-size:15px;color:${COLORS.textSecondary};line-height:1.7;">
          We received a request to reset the password for your AI Tools Hub account. Click the button below to create a new password.
        </p>
      </div>

      <div style="background:linear-gradient(135deg, ${COLORS.gradientStart} 0%, rgba(99, 102, 241, 0.08) 100%);padding:20px;border-radius:14px;border:1px solid ${COLORS.border};margin:0 0 24px;">
        <table width="100%" role="presentation">
          <tr>
            <td style="vertical-align:top;width:48px;padding-right:14px;">
              <div style="width:40px;height:40px;background:${COLORS.primary};border-radius:10px;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:20px;">🔒</span>
              </div>
            </td>
            <td style="vertical-align:top;">
              <div style="font-size:14px;font-weight:600;color:${COLORS.textPrimary};margin:0 0 4px;">Security Notice</div>
              <div style="font-size:12px;color:${COLORS.textMuted};margin:0 0 12px;">This link expires in 10 minutes</div>
              <p style="margin:0;font-size:13px;color:${COLORS.textSecondary};line-height:1.6;">
                If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>
        </table>
      </div>

      <div style="margin:28px 0 24px;text-align:center;">
        ${createButton(resetURL, '🔐 Reset Password', 'primary')}
      </div>

      <div style="padding:16px;background:rgba(239, 68, 68, 0.08);border-radius:12px;border-left:3px solid ${COLORS.danger};">
        <p style="margin:0;font-size:13px;color:${COLORS.textSecondary};line-height:1.6;">
          <strong style="color:${COLORS.textPrimary};">Important:</strong> For your security, this password reset link will expire in 10 minutes. If you need more time, please request a new reset link.
        </p>
      </div>
    `;

    return {
      from: emailFrom,
      to: recipientEmail,
      subject: '🔐 Reset Your AI Tools Hub Password',
      html: buildShell({
        title: 'Password Reset Request',
        preheader: 'Use this secure link to reset your AI Tools Hub password within the next 10 minutes.',
        heroEmoji: '🔐',
        bodyHtml,
        showFooterCta: false,
      }),
    };
  },

  /** Welcome email */
  welcome: (recipientEmail, username) => {
    const safeNameRaw =
      username && typeof username === 'string' && username.trim() !== ''
        ? username
        : 'there';
    const safeName = htmlEscape(safeNameRaw);

    const rawLoginURL = `${process.env.FRONTEND_URL}/login`;
    const loginURL = addUtm(rawLoginURL, {
      campaign: 'welcome',
      medium: 'onboarding',
      source: 'signup',
    });

    const bodyHtml = `
      <div style="margin-bottom:28px;">
        <h1 class="mobile-heading" style="margin:0 0 12px;font-size:30px;font-weight:700;color:${COLORS.textPrimary};letter-spacing:-0.5px;line-height:1.2;">
          Welcome to AI Tools Hub, ${safeName}! 👋
        </h1>
        <p class="mobile-text" style="margin:0;font-size:16px;color:${COLORS.textSecondary};line-height:1.7;">
          You've just joined thousands of professionals discovering, comparing, and leveraging the best AI tools on the web.
        </p>
      </div>

      <div style="background:linear-gradient(135deg, ${COLORS.gradientStart} 0%, ${COLORS.gradientEnd} 100%);padding:24px;border-radius:14px;border:1px solid ${COLORS.border};margin:0 0 24px;">
        <h2 style="margin:0 0 18px;font-size:18px;font-weight:600;color:${COLORS.textPrimary};">
          🚀 What You Can Do Now
        </h2>
        
        <table width="100%" role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom:14px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;width:40px;padding-right:12px;">
                    <div style="width:32px;height:32px;background:${COLORS.accent};border-radius:8px;display:flex;align-items:center;justify-content:center;">
                      <span style="font-size:16px;">🔍</span>
                    </div>
                  </td>
                  <td style="vertical-align:top;">
                    <div style="font-size:15px;font-weight:600;color:${COLORS.textPrimary};margin:0 0 4px;">Explore Curated Collections</div>
                    <div style="font-size:13px;color:${COLORS.textSecondary};line-height:1.5;">Browse tools by category - chatbots, coding, video creation, design, and more.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr>
            <td style="padding-bottom:14px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;width:40px;padding-right:12px;">
                    <div style="width:32px;height:32px;background:${COLORS.primary};border-radius:8px;display:flex;align-items:center;justify-content:center;">
                      <span style="font-size:16px;">⭐</span>
                    </div>
                  </td>
                  <td style="vertical-align:top;">
                    <div style="font-size:15px;font-weight:600;color:${COLORS.textPrimary};margin:0 0 4px;">Bookmark Your Favorites</div>
                    <div style="font-size:13px;color:${COLORS.textSecondary};line-height:1.5;">Save tools you love and access them instantly from your personalized dashboard.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;width:40px;padding-right:12px;">
                    <div style="width:32px;height:32px;background:${COLORS.warning};border-radius:8px;display:flex;align-items:center;justify-content:center;">
                      <span style="font-size:16px;">🔔</span>
                    </div>
                  </td>
                  <td style="vertical-align:top;">
                    <div style="font-size:15px;font-weight:600;color:${COLORS.textPrimary};margin:0 0 4px;">Stay Updated</div>
                    <div style="font-size:13px;color:${COLORS.textSecondary};line-height:1.5;">Get notified when we add new tools that match your interests and workflow.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

      <div style="margin:28px 0 24px;text-align:center;">
        ${createButton(loginURL, '🎯 Go to Your Dashboard', 'accent')}
      </div>

      <div style="padding:20px;background:${COLORS.bgLight};border-radius:12px;border:1px solid ${COLORS.border};text-align:center;">
        <p style="margin:0 0 8px;font-size:14px;color:${COLORS.textSecondary};">
          <strong style="color:${COLORS.textPrimary};">Have questions or feedback?</strong>
        </p>
        <p style="margin:0;font-size:13px;color:${COLORS.textMuted};line-height:1.5;">
          Just reply to this email - we read every message and would love to hear from you!
        </p>
      </div>
    `;

    return {
      from: emailFrom,
      to: recipientEmail,
      subject: '🎉 Welcome to AI Tools Hub - Your Journey Starts Here!',
      html: buildShell({
        title: 'Welcome to AI Tools Hub',
        preheader: 'Browse curated AI tools, save your favorites, and stay ahead of the curve.',
        heroEmoji: '🚀',
        bodyHtml,
      }),
    };
  },

  /** Password reset success */
  resetSuccess: (recipientEmail, username) => {
    const loginURL = addUtm(`${process.env.FRONTEND_URL}/login`, {
      campaign: 'password-reset-success',
      medium: 'transactional',
    });

    const bodyHtml = `
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;width:72px;height:72px;background:linear-gradient(135deg, ${COLORS.success} 0%, ${COLORS.accent} 100%);border-radius:50%;margin:0 0 18px;box-shadow:0 4px 16px rgba(34, 197, 94, 0.25);">
          <table width="100%" height="100%" role="presentation">
            <tr>
              <td align="center" valign="middle" style="font-size:32px;">✅</td>
            </tr>
          </table>
        </div>
        <h1 class="mobile-heading" style="margin:0 0 12px;font-size:26px;font-weight:700;color:${COLORS.textPrimary};letter-spacing:-0.5px;">
          Password Updated Successfully
        </h1>
        <p class="mobile-text" style="margin:0;font-size:15px;color:${COLORS.textSecondary};">
          Hi ${htmlEscape(username || 'there')}, your account is now secure with your new password.
        </p>
      </div>

      <div style="background:linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%);padding:20px;border-radius:14px;border:1px solid rgba(34, 197, 94, 0.2);margin:0 0 24px;">
        <table width="100%" role="presentation">
          <tr>
            <td style="vertical-align:top;width:44px;padding-right:12px;">
              <div style="width:36px;height:36px;background:${COLORS.success};border-radius:8px;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:18px;">🎉</span>
              </div>
            </td>
            <td style="vertical-align:top;">
              <div style="font-size:16px;font-weight:600;color:${COLORS.textPrimary};margin:0 0 8px;">All Set!</div>
              <p style="margin:0;font-size:14px;color:${COLORS.textSecondary};line-height:1.6;">
                Your password has been changed and your account is now secure. You can log in anytime using your new credentials.
              </p>
            </td>
          </tr>
        </table>
      </div>

      <div style="margin:28px 0 24px;text-align:center;">
        ${createButton(loginURL, '🔓 Log In to Your Account', 'primary')}
      </div>

      <div style="padding:18px;background:rgba(239, 68, 68, 0.08);border-radius:12px;border-left:3px solid ${COLORS.danger};">
        <table width="100%" role="presentation">
          <tr>
            <td style="vertical-align:top;width:32px;padding-right:10px;font-size:22px;">⚠️</td>
            <td style="vertical-align:top;">
              <div style="font-size:14px;font-weight:600;color:${COLORS.textPrimary};margin:0 0 6px;">Didn't make this change?</div>
              <p style="margin:0;font-size:13px;color:${COLORS.textSecondary};line-height:1.6;">
                If you didn't reset your password, please <strong>contact us immediately</strong> and reset your password again to secure your account.
              </p>
            </td>
          </tr>
        </table>
      </div>
    `;

    return {
      from: emailFrom,
      to: recipientEmail,
      subject: '✅ Your AI Tools Hub Password Was Changed',
      html: buildShell({
        title: 'Password Changed Successfully',
        preheader: 'This is a confirmation that your AI Tools Hub password was successfully updated.',
        heroEmoji: '✅',
        bodyHtml,
        showFooterCta: false,
      }),
    };
  },

  /** Contact form submission */
  contactForm: (name, email, message) => {
    const safeName = htmlEscape(name || 'Unknown');
    const safeEmail = htmlEscape(email || '');
    const safeMsg = htmlEscape(message || '');

    const bodyHtml = `
      <div style="margin-bottom:24px;">
        <h1 class="mobile-heading" style="margin:0 0 12px;font-size:24px;font-weight:700;color:${COLORS.textPrimary};">
          💬 New Contact Message
        </h1>
        <p class="mobile-text" style="margin:0;font-size:15px;color:${COLORS.textSecondary};">
          You've received a new message via the AI Tools Hub contact form.
        </p>
      </div>

      <div style="background:${COLORS.bgLight};padding:24px;border-radius:14px;border:1px solid ${COLORS.border};margin:0 0 24px;">
        <div style="margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid ${COLORS.border};">
          <div style="font-size:12px;color:${COLORS.textMuted};margin:0 0 6px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">From</div>
          <div style="font-size:16px;font-weight:600;color:${COLORS.textPrimary};margin:0 0 4px;">${safeName}</div>
          <a href="mailto:${safeEmail}" style="font-size:14px;color:${COLORS.primary};text-decoration:none;">${safeEmail}</a>
        </div>

        <div>
          <div style="font-size:12px;color:${COLORS.textMuted};margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Message</div>
          <div style="padding:16px;background:${COLORS.bgCard};border-radius:10px;border-left:3px solid ${COLORS.primary};">
            <p style="margin:0;font-size:14px;color:${COLORS.textSecondary};line-height:1.7;white-space:pre-wrap;">${safeMsg}</p>
          </div>
        </div>
      </div>

      <div style="padding:16px;background:linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);border-radius:12px;border:1px solid ${COLORS.border};text-align:center;">
        <p style="margin:0;font-size:13px;color:${COLORS.textMuted};">
          💡 <strong style="color:${COLORS.textPrimary};">Pro tip:</strong> Reply directly to this email to continue the conversation with ${safeName}.
        </p>
      </div>
    `;

    return {
      from: emailFrom,
      to: adminEmail,
      replyTo: email,
      subject: `📩 New Contact: ${safeName} - AI Tools Hub`,
      html: buildShell({
        title: 'New Contact Form Message',
        preheader: `${safeName} (${safeEmail}) sent you a message via AI Tools Hub.`,
        heroEmoji: '💬',
        bodyHtml,
        showFooterCta: false,
      }),
    };
  },

  /** Single new tool announcement (with recent list) */
  newToolAnnouncement: ({ recipientEmail, tool, recentTools, unsubscribeUrl }) => {
    const loginURL = addUtm(`${process.env.FRONTEND_URL}/login`, {
      campaign: 'tool-announcement',
      medium: 'notification',
    });
    const signupURL = addUtm(`${process.env.FRONTEND_URL}/signup`, {
      campaign: 'tool-announcement',
      medium: 'notification',
    });

    const safeToolName = htmlEscape(tool.name || 'New Tool');
    const safeToolDesc = htmlEscape(tool.description || '');
    const toolLink = addUtm(
      htmlEscape(tool.url || process.env.FRONTEND_URL),
      { campaign: 'tool-click', medium: 'notification' }
    );

    const listHtml = (recentTools || [])
      .map((t, index) => {
        const itemName = htmlEscape(t.name || 'Tool');
        const itemDesc = htmlEscape(t.description || '');
        const itemUrl = addUtm(
          htmlEscape(t.url || process.env.FRONTEND_URL),
          { campaign: 'recent-tools', medium: 'notification' }
        );
        
        const bgColors = [
          'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
          'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%)',
          'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 146, 60, 0.1) 100%)',
          'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.1) 100%)',
          'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)',
        ];
        
        return `
        <div style="margin:0 0 12px;padding:18px;border-radius:12px;background:${bgColors[index % bgColors.length]};border:1px solid ${COLORS.border};">
          <div style="margin-bottom:8px;">
            <div style="font-size:15px;font-weight:600;color:${COLORS.textPrimary};margin:0 0 6px;line-height:1.3;">${itemName}</div>
            <div style="font-size:13px;color:${COLORS.textSecondary};line-height:1.6;margin:0 0 12px;">${itemDesc.substring(0, 120)}${itemDesc.length > 120 ? '...' : ''}</div>
          </div>
          <a href="${itemUrl}" class="mobile-button" style="display:inline-block;font-size:13px;text-decoration:none;background:${COLORS.primary};color:#ffffff;padding:10px 20px;border-radius:10px;font-weight:600;box-shadow:0 2px 6px rgba(99, 102, 241, 0.25);">
            Explore ${itemName} →
          </a>
        </div>`;
      })
      .join('');

    const bodyHtml = `
      <div style="margin-bottom:24px;">
        <div style="display:inline-block;padding:6px 14px;background:linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.success} 100%);border-radius:20px;margin:0 0 14px;box-shadow:0 2px 6px rgba(16, 185, 129, 0.25);">
          <span style="font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.8px;">🆕 Fresh Addition</span>
        </div>
        <h1 class="mobile-heading" style="margin:0 0 10px;font-size:28px;font-weight:700;color:${COLORS.textPrimary};letter-spacing:-0.5px;line-height:1.2;">
          Discover: ${safeToolName}
        </h1>
        <p class="mobile-text" style="margin:0;font-size:16px;color:${COLORS.textSecondary};line-height:1.7;">
          We just added a powerful new AI tool that could transform your workflow.
        </p>
      </div>

      <!-- Featured Tool Card -->
      <div style="margin:0 0 28px;padding:24px;border-radius:16px;background:linear-gradient(135deg, ${COLORS.gradientStart} 0%, rgba(99, 102, 241, 0.1) 100%);border:2px solid ${COLORS.primary};box-shadow:0 4px 12px rgba(99, 102, 241, 0.15);">
        <table width="100%" role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom:14px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;width:56px;padding-right:12px;">
                    <div style="width:48px;height:48px;background:${COLORS.primary};border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(99, 102, 241, 0.3);">
                      <span style="font-size:24px;">🚀</span>
                    </div>
                  </td>
                  <td style="vertical-align:top;">
                    <div style="font-size:19px;font-weight:700;color:${COLORS.textPrimary};margin:0 0 4px;letter-spacing:-0.3px;">${safeToolName}</div>
                    <div style="font-size:11px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Featured AI Tool</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <p style="margin:0 0 18px;font-size:14px;color:${COLORS.textSecondary};line-height:1.7;">
          ${safeToolDesc}
        </p>
        
        <div style="text-align:center;">
          ${createButton(toolLink, `🎯 Try ${safeToolName} Now`, 'accent')}
        </div>
      </div>

      ${
        recentTools && recentTools.length
          ? `
      <!-- Recent Tools Section -->
      <div style="margin:0 0 24px;">
        <div style="margin:0 0 18px;padding-bottom:10px;border-bottom:2px solid ${COLORS.borderLight};">
          <h2 style="margin:0 0 6px;font-size:19px;font-weight:700;color:${COLORS.textPrimary};">✨ More Recent Additions</h2>
          <p style="margin:0;font-size:13px;color:${COLORS.textMuted};">Check out these other tools we've added recently</p>
        </div>
        ${listHtml}
      </div>`
          : ''
      }

      <!-- CTA Section -->
      <div style="padding:24px;background:linear-gradient(135deg, ${COLORS.gradientStart} 0%, ${COLORS.gradientEnd} 100%);border-radius:14px;border:1px solid ${COLORS.border};text-align:center;">
        <div style="font-size:17px;font-weight:600;color:${COLORS.textPrimary};margin:0 0 8px;">🎁 Get Personalized Recommendations</div>
        <p style="margin:0 0 18px;font-size:14px;color:${COLORS.textSecondary};line-height:1.6;">
          Create a free account to bookmark favorites, get tailored suggestions, and never miss the tools that matter to you.
        </p>
        <table width="100%" role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <div class="mobile-stack">
                ${createButton(signupURL, '🚀 Sign Up Free', 'primary')}
              </div>
              <div class="mobile-stack" style="display:inline-block;margin-left:10px;">
                ${createButton(loginURL, 'Log In', 'secondary')}
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;

    return {
      from: emailFrom,
      to: recipientEmail,
      subject: `🚀 New AI Tool: ${safeToolName} - Explore Now!`,
      html: buildShell({
        title: `New AI Tool: ${safeToolName}`,
        preheader: `${safeToolName} just landed on AI Tools Hub. Discover what it can do for you.`,
        heroEmoji: '🧰',
        bodyHtml,
        unsubscribeUrl,
      }),
    };
  },

  /** Digest email for multiple tools */
  newToolDigest: ({ recipientEmail, tools, unsubscribeUrl }) => {
    const loginURL = addUtm(`${process.env.FRONTEND_URL}/login`, {
      campaign: 'weekly-digest',
      medium: 'notification',
    });
    const signupURL = addUtm(`${process.env.FRONTEND_URL}/signup`, {
      campaign: 'weekly-digest',
      medium: 'notification',
    });

    const items = (tools || [])
      .map((t, index) => {
        const itemName = htmlEscape(t.name || 'Tool');
        const itemDesc = htmlEscape(t.description || '');
        const itemUrl = addUtm(
          htmlEscape(t.url || process.env.FRONTEND_URL),
          { campaign: 'digest-click', medium: 'notification' }
        );
        
        const icons = ['🎨', '🤖', '💡', '⚡', '🔮', '🎯', '🚀', '✨', '🌟', '💫'];
        const icon = icons[index % icons.length];
        
        return `
        <div style="margin:0 0 14px;padding:20px;border-radius:14px;background:${COLORS.bgLight};border:1px solid ${COLORS.border};box-shadow:0 2px 6px rgba(0, 0, 0, 0.04);">
          <table width="100%" role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:top;width:52px;padding-right:12px;">
                <div style="width:44px;height:44px;background:linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%);border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(99, 102, 241, 0.25);">
                  <span style="font-size:22px;">${icon}</span>
                </div>
              </td>
              <td style="vertical-align:top;">
                <div style="font-size:16px;font-weight:700;color:${COLORS.textPrimary};margin:0 0 6px;line-height:1.3;">${itemName}</div>
                <div style="font-size:13px;color:${COLORS.textSecondary};line-height:1.6;margin:0 0 14px;">${itemDesc.substring(0, 150)}${itemDesc.length > 150 ? '...' : ''}</div>
                <a href="${itemUrl}" class="mobile-button" style="display:inline-block;background:linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%);color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 20px;border-radius:10px;box-shadow:0 2px 6px rgba(99, 102, 241, 0.25);">
                  Explore Tool →
                </a>
              </td>
            </tr>
          </table>
        </div>`;
      })
      .join('');

    const bodyHtml = `
      <div style="margin-bottom:28px;text-align:center;">
        <div style="display:inline-block;padding:7px 16px;background:linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.success} 100%);border-radius:24px;margin:0 0 16px;box-shadow:0 2px 8px rgba(16, 185, 129, 0.25);">
          <span style="font-size:12px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:1px;">📬 Your Weekly Digest</span>
        </div>
        <h1 class="mobile-heading" style="margin:0 0 12px;font-size:30px;font-weight:700;color:${COLORS.textPrimary};letter-spacing:-0.7px;line-height:1.2;">
          ${tools.length} Fresh AI Tools<br/>Curated for You
        </h1>
        <p class="mobile-text" style="margin:0;font-size:16px;color:${COLORS.textSecondary};line-height:1.7;max-width:480px;margin:0 auto;">
          Your personalized collection of the latest and most powerful AI tools added this week.
        </p>
      </div>

      <!-- Stats Bar -->
      <div style="margin:0 0 28px;padding:20px;background:linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);border-radius:14px;border:1px solid ${COLORS.border};text-align:center;">
        <div style="font-size:13px;color:${COLORS.textMuted};margin:0 0 6px;font-weight:600;">This Week's Collection</div>
        <div style="font-size:36px;font-weight:700;color:${COLORS.textPrimary};line-height:1;margin:4px 0;">${tools.length}</div>
        <div style="font-size:13px;color:${COLORS.textSecondary};margin:6px 0 0;">New AI Tools Added</div>
      </div>

      <!-- Tools Grid -->
      <div style="margin:0 0 28px;">
        ${items}
      </div>

      <!-- Bottom CTA -->
      <div style="padding:28px 24px;background:linear-gradient(135deg, ${COLORS.gradientStart} 0%, rgba(16, 185, 129, 0.1) 100%);border-radius:16px;border:2px solid ${COLORS.accent};text-align:center;box-shadow:0 4px 12px rgba(16, 185, 129, 0.15);">
        <div style="font-size:20px;font-weight:700;color:${COLORS.textPrimary};margin:0 0 10px;line-height:1.3;">
          🎯 Take Your Workflow to the Next Level
        </div>
        <p style="margin:0 0 20px;font-size:14px;color:${COLORS.textSecondary};line-height:1.7;max-width:450px;margin-left:auto;margin-right:auto;">
          Create a free account to save your favorites, get smart recommendations tailored to your needs, and stay ahead of the curve.
        </p>
        <table width="100%" role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <div class="mobile-stack">
                ${createButton(signupURL, '🚀 Get Started Free', 'accent')}
              </div>
              <div class="mobile-stack" style="display:inline-block;margin-left:10px;">
                ${createButton(loginURL, 'Log In', 'secondary')}
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Engagement tip -->
      <div style="margin:20px 0 0;padding:16px;background:${COLORS.bgLight};border-radius:12px;border:1px solid ${COLORS.border};text-align:center;">
        <p style="margin:0;font-size:13px;color:${COLORS.textMuted};line-height:1.6;">
          💬 <strong style="color:${COLORS.textPrimary};">Have a tool suggestion?</strong> Reply to this email - we review every submission!
        </p>
      </div>
    `;

    return {
      from: emailFrom,
      to: recipientEmail,
      subject: `✨ ${tools.length} New AI Tools Picked for You This Week`,
      html: buildShell({
        title: 'Your AI Tools Weekly Digest',
        preheader: `Explore ${tools.length} handpicked AI tools added to AI Tools Hub this week.`,
        heroEmoji: '📬',
        bodyHtml,
        unsubscribeUrl,
      }),
    };
  },
};

/**
 * Send new tool emails to subscribers
 */
const sendNewToolEmail = async (tool, subscribers, recentTools = []) => {
  if (!tool || !subscribers || subscribers.length === 0) return;

  const totalCount = 1 + recentTools.length;
  if (totalCount < MIN_NEW_TOOL_EMAIL_COUNT) {
    console.log(`ℹ️ Skipping new tool email (only ${totalCount} < ${MIN_NEW_TOOL_EMAIL_COUNT})`);
    return;
  }

  const Subscriber = require('../models/Subscriber');
  const backendBase = process.env.BACKEND_URL || process.env.FRONTEND_URL || '';
  const uniqueByEmail = new Map();

  for (const s of subscribers) {
    if (s && s.email && !uniqueByEmail.has(s.email)) uniqueByEmail.set(s.email, s);
  }

  const jobs = [];

  for (const [email, sDoc] of uniqueByEmail.entries()) {
    if (sDoc.isUnsubscribed) continue;
    const unsubscribeUrl = `${backendBase}/api/newsletter/unsubscribe/${sDoc.unsubscribeToken}`;
    const mail = emailTemplates.newToolAnnouncement({
      recipientEmail: email,
      tool,
      recentTools: recentTools.slice(0, 5),
      unsubscribeUrl,
    });

    jobs.push(
      sendEmail(mail)
        .then(async () => {
          try {
            await Subscriber.updateOne(
              { _id: sDoc._id },
              { $set: { lastSentAt: new Date() } }
            );
          } catch (e) {
            console.error('Failed to update lastSentAt for', email, e.message);
          }
        })
        .catch((err) => {
          console.error(`Failed to send new tool email to ${email}:`, err.message);
        })
    );
  }

  await Promise.all(jobs);
};

module.exports = { sendEmail, emailTemplates, sendNewToolEmail };