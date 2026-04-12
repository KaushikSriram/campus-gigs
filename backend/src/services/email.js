const nodemailer = require('nodemailer');
const { Resend } = require('resend');

// ================================================
// Email service — multi-provider with graceful fallbacks
// ================================================
//
// Priority order:
//   1. Gmail SMTP via nodemailer  (GMAIL_USER + GMAIL_APP_PASSWORD)
//   2. Generic SMTP via nodemailer (SMTP_HOST + SMTP_USER + SMTP_PASS)
//   3. Resend API                  (RESEND_API_KEY)
//   4. Console fallback            (dev only — prints code to server log)
//
// Swap providers by editing .env — no code changes needed.
// ================================================

// ---------- Transport setup (lazy, built once) ----------

let transporter = null;
let transporterKind = null; // 'gmail' | 'smtp' | 'resend' | 'console'
let resend = null;

function buildTransporter() {
  if (transporter || transporterKind === 'console') return;

  // Option 1: Gmail (simplest)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        // Gmail app passwords are 16 chars; user may paste with spaces.
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, ''),
      },
    });
    transporterKind = 'gmail';
    return;
  }

  // Option 2: Generic SMTP (Brevo, SendGrid, Mailgun, etc.)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    transporterKind = 'smtp';
    return;
  }

  // Option 3: Resend API (legacy path — keeps working if domain is verified)
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
    transporterKind = 'resend';
    return;
  }

  // Option 4: Console fallback (dev only)
  transporterKind = 'console';
}

buildTransporter();

// ---------- Sender address ----------

function resolveFrom() {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (transporterKind === 'gmail') {
    return `CampusGig <${process.env.GMAIL_USER}>`;
  }
  if (transporterKind === 'smtp' && process.env.SMTP_USER) {
    return `CampusGig <${process.env.SMTP_USER}>`;
  }
  if (transporterKind === 'resend') {
    return process.env.RESEND_FROM || 'CampusGig <onboarding@resend.dev>';
  }
  return 'CampusGig <noreply@campusgig.local>';
}

// ---------- Helpers ----------

function fallbackResponse(toEmail, code, reason) {
  console.log(`\n[EMAIL FALLBACK] Verification code for ${toEmail}: ${code}`);
  if (reason) {
    console.log(`[EMAIL FALLBACK] Reason: ${reason}`);
  }
  console.log('');
  return { ok: true, fallback: true };
}

function isSandboxRecipientError(message = '') {
  return (
    typeof message === 'string' &&
    message.includes('You can only send testing emails to your own email address')
  );
}

function buildEmailContent(code) {
  const html = `
<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#FBF8F5; padding:40px 20px; margin:0;">
    <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:16px; padding:40px 32px; box-shadow:0 4px 16px rgba(44,36,32,0.06);">
      <h1 style="color:#D97B3D; font-size:24px; font-weight:800; margin:0 0 8px;">CampusGig</h1>
      <p style="color:#2C2420; font-size:16px; margin:0 0 24px;">Your sign-in code is ready.</p>

      <div style="background:#FDF0E6; border-radius:12px; padding:24px; text-align:center; margin:24px 0;">
        <div style="color:#7A6F68; font-size:13px; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Your code</div>
        <div style="color:#D97B3D; font-size:36px; font-weight:800; letter-spacing:6px; font-family:'SF Mono', Monaco, monospace;">${code}</div>
      </div>

      <p style="color:#7A6F68; font-size:14px; line-height:1.6; margin:16px 0 0;">
        This code expires in 10 minutes. If you didn't request it, you can ignore this email.
      </p>

      <hr style="border:none; border-top:1px solid #EDE7E1; margin:32px 0 16px;" />
      <p style="color:#B5ADA7; font-size:12px; margin:0;">
        CampusGig — the student task marketplace on your campus.
      </p>
    </div>
  </body>
</html>
  `.trim();

  const text = `Your CampusGig sign-in code is: ${code}\n\nThis code expires in 10 minutes.\nIf you didn't request it, you can ignore this email.`;

  return { html, text };
}

// ---------- Main entrypoint ----------

async function sendVerificationCode(toEmail, code) {
  const { html, text } = buildEmailContent(code);
  const subject = `Your CampusGig code: ${code}`;
  const from = resolveFrom();

  // --- SMTP path (gmail or generic) ---
  if (transporterKind === 'gmail' || transporterKind === 'smtp') {
    try {
      const info = await transporter.sendMail({
        from,
        to: toEmail,
        subject,
        html,
        text,
      });
      return { ok: true, id: info.messageId };
    } catch (err) {
      console.error(`[email] ${transporterKind} send failed:`, err.message);
      // Dev-friendly fallback so the flow isn't hard-blocked.
      if (process.env.NODE_ENV !== 'production') {
        return fallbackResponse(toEmail, code, err.message);
      }
      return { ok: false, error: err.message };
    }
  }

  // --- Resend path ---
  if (transporterKind === 'resend' && resend) {
    try {
      const result = await resend.emails.send({ from, to: toEmail, subject, html, text });

      if (result.error) {
        if (isSandboxRecipientError(result.error.message)) {
          return fallbackResponse(toEmail, code, result.error.message);
        }
        console.error('[email] Resend error:', result.error);
        return { ok: false, error: result.error.message || 'Failed to send email' };
      }
      return { ok: true, id: result.data?.id };
    } catch (err) {
      if (isSandboxRecipientError(err.message)) {
        return fallbackResponse(toEmail, code, err.message);
      }
      console.error('[email] Resend exception:', err);
      return { ok: false, error: err.message };
    }
  }

  // --- Console fallback ---
  return fallbackResponse(toEmail, code, 'No email provider configured');
}

// Verify transporter on boot so we fail loud if creds are wrong.
async function verifyEmailTransport() {
  if (transporterKind === 'gmail' || transporterKind === 'smtp') {
    try {
      await transporter.verify();
      console.log(`[email] ${transporterKind} transport ready (from ${resolveFrom()})`);
    } catch (err) {
      console.error(`[email] ${transporterKind} transport FAILED verify:`, err.message);
    }
  } else if (transporterKind === 'resend') {
    console.log(`[email] Resend transport ready (from ${resolveFrom()})`);
  } else {
    console.log('[email] Console fallback only — codes will print to server log.');
  }
}

module.exports = { sendVerificationCode, verifyEmailTransport };
