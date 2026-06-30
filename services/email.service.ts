import nodemailer from 'nodemailer'
import { config } from '../config'
import { logger } from '../logger'

const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: false,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPassword,
  },
  tls: {
    rejectUnauthorized: false,
  },
})

transporter.verify((error) => {
  if (error) {
    console.error('[SMTP] Connection failed:', error)
  } else {

  }
})

export async function sendVerificationEmail(
  toEmail: string,
  username: string,
  token: string
): Promise<void> {
  const verifyUrl = `${config.corsOrigin}/auth/verify-email?token=${token}`

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">

<tr>
  <td style="background:#16a34a;padding:32px;text-align:center;">   
    <p style="margin:8px 0 0;font-size:24px;font-weight:700;color:#fff;">Vitalize</p>
    <p style="margin:4px 0 0;font-size:16px;color:#fff;">Your Wellness Journey Starts Here !!</p>
  </td>
</tr>

<tr>
  <td style="padding:36px 40px;">
    <p style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111;">Welcome, ${username}</p>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.7;">
      Thank you for joining Vitalize. Please verify your email to activate your account.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.7;">
      Please verify your email address by clicking the button below.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr>
        <td align="center">
          <a href="${verifyUrl}" style="background:#16a34a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:50px;display:inline-block;">
            Verify My Email
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
      This link expires in <strong>24 hours</strong>. If you did not sign up, ignore this email.
    </p>
  </td>
</tr>

<tr>
  <td style="padding:20px 40px 28px;text-align:center;border-top:1px solid #000;">
    <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">If the button above does not work, please use the verification link below.</p>
    <a href="${verifyUrl}" style="font-size:11px;color:#16a34a;word-break:break-all;">${verifyUrl}</a>
    <p style="margin:16px 0 0;font-size:12px;color:#d1d5db;">© ${new Date().getFullYear()} Vitalize</p>
  </td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>`

  try {
    await transporter.sendMail({
      from: `"Vitalize" <${config.smtpSender}>`,
      replyTo: config.smtpReplyTo,
      to: toEmail,
      subject: 'Verify your Vitalize account',
      html,
    })
    logger.info(`[EmailService] Verification email sent to ${toEmail}`)
  } catch (err) {
    logger.error('[EmailService] Failed to send verification email', err)
    throw err
  }
}