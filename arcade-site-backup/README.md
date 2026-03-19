# Northfield Student Hub (Backup)

A lightweight static mini-game website for students.

## Included games

- Snake
- Minesweeper
- 2048
- Chess

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

## Deploy

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

## Suggested update flow

After editing content locally:

```bash
git add content/site-content.json index.html style.css content-loader.js home-content.js admin
 git commit -m "Update homepage content"
```

Then push to the connected branch or deploy through Vercel.
