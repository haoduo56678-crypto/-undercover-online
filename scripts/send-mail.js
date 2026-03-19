#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || /^\s*#/.test(line)) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(path.resolve(__dirname, '..', '.env'));

function getArg(name, fallback = '') {
  const flag = `--${name}`;
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return fallback;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const to = getArg('to');
  const subject = getArg('subject');
  const text = getArg('text');

  if (!to) {
    console.error('Usage: node scripts/send-mail.js --to <email> [--subject <subject>] --text <body>');
    process.exit(1);
  }

  if (!text) {
    console.error('Missing required --text');
    process.exit(1);
  }

  const host = requireEnv('SMTP_HOST');
  const port = Number(requireEnv('SMTP_PORT'));
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const user = requireEnv('SMTP_USER');
  const pass = requireEnv('SMTP_PASS');
  const from = process.env.SMTP_FROM || user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.verify();

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });

  console.log(JSON.stringify({
    ok: true,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  }, null, 2));
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
