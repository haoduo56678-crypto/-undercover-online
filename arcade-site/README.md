# Northfield Student Hub

A lightweight mini-game website for students.

## Included games

- Snake
- Minesweeper
- 2048
- Chess
- Undercover Fast (local single-device)
- Undercover Online MVP (multiplayer room-based)

## Included feedback system

- Student feedback form on the homepage
- Sends feedback by email through the deployed API

## Homepage content management

The public homepage now reads announcement and rules content from:

- `content/site-content.json`

That file is safe to deploy as static content on Vercel.

### Local admin workflow

A local-only admin helper is included for editing the homepage content on the owner computer.

1. Open a terminal in `arcade-site`
2. Set a password for the current shell
   - PowerShell: `$env:ADMIN_PASSWORD = "your-password"`
3. Start the local admin server
   - `npm run admin`
4. Open `http://localhost:4173/admin/`
5. Unlock with the password you set
6. Edit announcement and rules content
7. Save changes, review the homepage locally, then commit and deploy when ready

Notes:

- The admin page writes directly to `content/site-content.json`
- The password gate is intentionally local-only and meant for the owner using this computer
- The public Vercel site remains static; the admin save endpoint only exists when you run the local helper

## Undercover Online MVP

The online Undercover game is included as a simple Express + Socket.IO MVP.

Run it locally from `arcade-site`:

```bash
npm install
npm start
```

Then open:

- `http://localhost:3000/undercover-online/`

Important:

- the homepage and most games are still static-friendly
- the online Undercover MVP needs a long-running Node server
- that means it is fine for local testing or Node hosting, but not a drop-in fit for the current Vercel static/serverless setup

## Deploy

### Static site / feedback setup

This site is deployed on Vercel and includes a serverless feedback endpoint.

Required environment variables:

- SMTP_HOST
- SMTP_PORT
- SMTP_SECURE
- SMTP_USER
- SMTP_PASS
- SMTP_FROM
- FEEDBACK_TO
- FEEDBACK_ALLOWED_ORIGIN

### Undercover Online deployment

The `undercover-online` multiplayer game uses `server.js` with Express + Socket.IO and should be deployed to a Node host such as Railway.

Files included for that flow:

- `server.js`
- `package.json`
- `railway.json`
- `Procfile`

Recommended Railway deploy flow:

1. Create a new Railway project from the `arcade-site` folder/repo.
2. Let Railway run `npm install` automatically.
3. Start command: `npm start`
4. Railway will inject `PORT`; the server already supports it.
5. After deploy, open `/health` to confirm the server is alive.
6. Open `/undercover-online/` to test the multiplayer client.

## Suggested update flow

After editing content locally:

```bash
git add content/site-content.json index.html style.css content-loader.js home-content.js admin
 git commit -m "Update homepage content"
```

Then push to the connected branch or deploy through Vercel.
