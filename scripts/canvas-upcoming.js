#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ical = require('ical');

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

function fmtDate(date) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

async function main() {
  const url = process.env.CANVAS_ICS_URL;
  if (!url) {
    console.error('Missing CANVAS_ICS_URL in .env');
    process.exit(1);
  }

  const days = Number(getArg('days', '14'));
  const limit = Number(getArg('limit', '20'));
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ICS: ${response.status} ${response.statusText}`);
  }

  const rawIcs = await response.text();
  const data = ical.parseICS(rawIcs);
  const events = Object.values(data)
    .filter((item) => item.type === 'VEVENT' && item.start)
    .map((item) => ({
      summary: item.summary || '未命名事件',
      start: new Date(item.start),
      end: item.end ? new Date(item.end) : null,
      location: item.location || '',
      description: item.description || '',
    }))
    .filter((event) => event.start >= now && event.start <= until)
    .sort((a, b) => a.start - b.start)
    .slice(0, limit);

  console.log(JSON.stringify({
    ok: true,
    timezone: 'America/Los_Angeles',
    rangeDays: days,
    count: events.length,
    events: events.map((event) => ({
      summary: event.summary,
      start: event.start.toISOString(),
      startLocal: fmtDate(event.start),
      end: event.end ? event.end.toISOString() : null,
      location: event.location,
      description: event.description,
    })),
  }, null, 2));
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
