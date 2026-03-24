const nodemailer = require('nodemailer');

function env(name, fallback = '') {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : fallback;
}

const ALLOWED_ORIGIN = env('FEEDBACK_ALLOWED_ORIGIN', '*');
const TO_EMAIL = env('FEEDBACK_TO', 'haoduo56678@gmail.com');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function clean(value, max = 2000) {
  return String(value || '').replace(/\r/g, '').trim().slice(0, max);
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const name = clean(body.name, 120);
    const game = clean(body.game, 80);
    const type = clean(body.type, 80);
    const message = clean(body.message, 4000);
    const page = clean(body.page, 300);
    const ua = clean(req.headers['user-agent'], 400);
    const referer = clean(req.headers.referer, 400);
    const submittedAt = new Date().toISOString();

    if (!game || !type || !message) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    const transporter = nodemailer.createTransport({
      host: env('SMTP_HOST'),
      port: Number(env('SMTP_PORT', '465')),
      secure: env('SMTP_SECURE', 'true').toLowerCase() === 'true',
      auth: {
        user: env('SMTP_USER'),
        pass: env('SMTP_PASS'),
      },
    });

    const subject = `[Northfield Student Hub] ${type} - ${game}`;
    const text = [
      'New student feedback submitted.',
      '',
      `Name: ${name || 'Anonymous'}`,
      `Game: ${game}`,
      `Type: ${type}`,
      '',
      'Message:',
      message,
      '',
      `Page: ${page || referer || 'Unknown'}`,
      `Submitted at: ${submittedAt}`,
      `User-Agent: ${ua || 'Unknown'}`,
    ].join('\n');

    await transporter.sendMail({
      from: env('SMTP_FROM') || env('SMTP_USER'),
      to: TO_EMAIL,
      subject,
      text,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: 'Failed to send feedback' });
  }
};
