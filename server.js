require('dotenv').config();
const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const {
   SMTP_HOST = 'smtp.gmail.com',
   SMTP_PORT = '587',
   SMTP_USER,
   SMTP_PASSWORD,
   EMAIL_FROM,
   EMAIL_FROM_NAME = 'Portfolio',
   CONTACT_TO,
   PORT = 3000
} = process.env;

const smtpPort = Number(SMTP_PORT);
const smtpPass = String(SMTP_PASSWORD || '').replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
   host: SMTP_HOST,
   port: smtpPort,
   secure: smtpPort === 465,
   requireTLS: smtpPort === 587,
   auth: { user: SMTP_USER, pass: smtpPass },
   family: 4,
   connectionTimeout: 15000,
   greetingTimeout: 15000,
   socketTimeout: 20000,
   tls: { minVersion: 'TLSv1.2' }
});

// Simple in-memory rate limit: 5 messages per IP per hour
const hits = new Map();
function tooMany(ip) {
   const now = Date.now();
   const recent = (hits.get(ip) || []).filter(t => now - t < 3600 * 1000);
   if (recent.length >= 5) { hits.set(ip, recent); return true; }
   recent.push(now);
   hits.set(ip, recent);
   return false;
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = s => String(s || '').replace(/[\r\n]+/g, ' ').trim();

// ---------- Email UI template ----------
function mailTemplate({ name, email, message, time }) {
   const initial = esc(name.trim().charAt(0).toUpperCase() || '?');
   const msgHtml = esc(message).replace(/\r?\n/g, '<br>');
   const replyHref = `mailto:${esc(email)}?subject=${encodeURIComponent('Re: Your message on my portfolio')}`;

   return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New portfolio message</title>
</head>
<body style="margin:0;padding:0;background:#f3eef6;font-family:Inter,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3eef6;padding:32px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #eadcf0;">

        <!-- Header -->
        <tr>
          <td style="background:#e9c3dc;background-image:linear-gradient(135deg,#bfe3f7 0%,#e9c3dc 55%,#e2a8cf 100%);padding:34px 36px;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#4a3a5c;">Portfolio contact form</p>
            <h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:600;color:#1b1530;">You have a new message</h1>
          </td>
        </tr>

        <!-- Sender -->
        <tr>
          <td style="padding:30px 36px 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="56" valign="middle">
                  <div style="width:48px;height:48px;line-height:48px;border-radius:50%;background:#1b1530;color:#ffffff;text-align:center;font-size:20px;font-weight:600;">${initial}</div>
                </td>
                <td valign="middle" style="padding-left:14px;">
                  <p style="margin:0;font-size:17px;font-weight:600;color:#1b1530;">${esc(name)}</p>
                  <p style="margin:2px 0 0;font-size:14px;"><a href="mailto:${esc(email)}" style="color:#6b4fa0;text-decoration:none;">${esc(email)}</a></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Message -->
        <tr>
          <td style="padding:18px 36px 6px;">
            <p style="margin:0 0 10px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8a7f99;">Message</p>
            <div style="background:#faf6fc;border:1px solid #eadcf0;border-left:4px solid #c98bc0;border-radius:12px;padding:18px 20px;font-size:15px;line-height:1.7;color:#2a2238;">${msgHtml}</div>
          </td>
        </tr>

        <!-- Reply button -->
        <tr>
          <td style="padding:24px 36px 8px;">
            <a href="${replyHref}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:13px 28px;border-radius:999px;">Reply to ${esc(name.split(' ')[0])} &rarr;</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:26px 36px 30px;">
            <hr style="border:0;border-top:1px solid #eee6f2;margin:0 0 16px;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#8a7f99;">Received on ${esc(time)} (IST) via your portfolio contact form.<br>Hitting reply goes straight to the sender.</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

app.post('/api/contact', async (req, res) => {
   const { name, email, message, website } = req.body || {};

   // Honeypot: real visitors never fill this hidden field
   if (website) return res.json({ ok: true });

   const n = clean(name);
   const e = clean(email);
   const m = String(message || '').trim();

   if (n.length < 2 || n.length > 100) return res.status(400).json({ ok: false, error: 'Please enter your name.' });
   if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) || e.length > 160) return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
   if (m.length < 10 || m.length > 3000) return res.status(400).json({ ok: false, error: 'Your message should be between 10 and 3000 characters.' });
   if (tooMany(req.ip)) return res.status(429).json({ ok: false, error: 'Too many messages. Please try again later.' });

   const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

   try {
      await transporter.sendMail({
         from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM || SMTP_USER}>`,
         to: CONTACT_TO || SMTP_USER,
         replyTo: `"${n}" <${e}>`,
         subject: `Portfolio message from ${n}`,
         text: `New portfolio message\n\nName: ${n}\nEmail: ${e}\nTime: ${time} (IST)\n\n${m}`,
         html: mailTemplate({ name: n, email: e, message: m, time })
      });
      res.json({ ok: true });
   } catch (err) {
      res.status(500).json({ ok: false, error: 'Could not send your message right now. Please email me directly.' });
   }
});

app.listen(PORT);