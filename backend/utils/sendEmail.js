import nodemailer from 'nodemailer';

let transporterInstance = null;

/**
 * Creates or retrieves the cached nodemailer transporter.
 */
const getTransporter = () => {
  if (transporterInstance) {
    return transporterInstance;
  }

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;
  const user = process.env.SMTP_USER;
  const rawPass = process.env.SMTP_PASS;
  // Automatically strip any spaces that Google App Passwords often have
  const pass = rawPass ? rawPass.replace(/\s+/g, '') : undefined;

  if (user && pass) {
    // If Gmail is configured
    if ((host && host.includes('gmail')) || (user && user.endsWith('@gmail.com'))) {
      transporterInstance = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
      });
      return transporterInstance;
    }

    transporterInstance = nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: {
        user,
        pass,
      },
    });
    return transporterInstance;
  }

  return null;
};

/**
 * Core sendEmail utility.
 */
export const sendEmail = async (options) => {
  const transporter = getTransporter();

  const fromName = process.env.FROM_NAME || 'GarageERP';
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'vehicleservicegarage@gmail.com';

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || (options.message ? options.message.replace(/\n/g, '<br/>') : undefined),
  };

  if (!transporter) {
    console.log('--- EMAIL DISPATCH (SMTP NOT CONFIGURED) ---');
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log('-------------------------------------------');
    return { fallback: true };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (err) {
    console.error('SMTP Mail Dispatch Error');
    throw new Error('Email delivery failed');
  }
};

/**
 * Generates and sends a high-aesthetic OTP email for Password Reset.
 */
export const sendPasswordResetOtpEmail = async ({ to, name, otp }) => {
  const appName = process.env.FROM_NAME || 'GarageERP';
  const recipientName = name || 'Customer';

  const subject = `${appName} - Your Password Reset Verification Code (${otp})`;

  const textMessage = `Hello ${recipientName},\n\nYou requested to reset your password for ${appName}.\n\nYour One-Time Password (OTP) is: ${otp}\n\nThis OTP is valid for 10 minutes. If you did not make this request, you can safely ignore this email.\n\nRegards,\n${appName} Team`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 36px 30px; text-align: center;">
                  <div style="display: inline-block; background-color: rgba(255, 102, 0, 0.15); border: 1px solid rgba(255, 102, 0, 0.4); border-radius: 50px; padding: 6px 18px; margin-bottom: 12px;">
                    <span style="color: #ff6600; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Security Verification</span>
                  </div>
                  <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">${appName}</h1>
                  <p style="color: #94a3b8; font-size: 14px; margin: 6px 0 0 0;">Vehicle Service & Garage Management System</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 36px 32px;">
                  <p style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Hello ${recipientName},</p>
                  <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                    We received a request to reset your password for your <strong>${appName}</strong> account. Please use the verification code below to proceed with setting a new password.
                  </p>

                  <!-- OTP Box -->
                  <div style="background-color: #fff7ed; border: 2px dashed #f97316; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0;">
                    <span style="color: #ea580c; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">Your One-Time Password (OTP)</span>
                    <div style="color: #c2410c; font-size: 38px; font-weight: 800; letter-spacing: 10px; font-family: 'Courier New', Courier, monospace; line-height: 1.2; text-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                      ${otp}
                    </div>
                    <span style="display: inline-block; margin-top: 10px; background-color: #ffedd5; color: #9a3412; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px;">
                      ⏱ Valid for 10 minutes
                    </span>
                  </div>

                  <!-- Notice -->
                  <div style="background-color: #f8fafc; border-left: 4px solid #ff6600; border-radius: 4px; padding: 14px 18px; margin: 24px 0;">
                    <p style="color: #334155; font-size: 13px; margin: 0; line-height: 1.5;">
                      <strong>Security Tip:</strong> Never share this OTP with anyone, including GarageERP support staff. We will never ask for your code.
                    </p>
                  </div>

                  <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 20px 0 0 0;">
                    If you didn't initiate this request, you can safely ignore this email. Your current password will remain unchanged and your account is secure.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="color: #64748b; font-size: 13px; margin: 0 0 6px 0; font-weight: 500;">
                    ${appName} Garage Management
                  </p>
                  <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                    This is an automated system message. Please do not reply directly to this email.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return await sendEmail({
    email: to,
    subject,
    message: textMessage,
    html: htmlContent,
  });
};

export default sendEmail;
