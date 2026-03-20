# Undercover Online MVP

This is a practical multiplayer MVP for the Undercover party game.

## What it does

- English UI
- Create room / join room with nickname
- Host can start the game
- Each player privately reveals their own secret word on their own device
- Turn-based clue phase
- Voting phase
- Elimination and round results
- Win conditions:
  - civilians win if the undercover is eliminated
  - undercover wins if they survive to the final two players

## How it works

The MVP uses:

- `server.js` for a small Express + Socket.IO server
- `undercover-online/` for the browser client

This is intentionally simple and works well for local testing or a small custom deployment.

## Run locally

From `arcade-site`:

```bash
npm install
npm start
```

Then open:

- `http://localhost:3000/undercover-online/`

To test with multiple players, open the same URL on multiple browser tabs or devices that can reach the same machine on your network.

## Notes

- This MVP is not yet adapted for Vercel serverless hosting because Socket.IO needs a long-lived Node server.
- If you want production hosting later, the easiest next step is usually moving this realtime game to a small Node host (for example Railway, Render, Fly.io, or a VPS), or replacing Socket.IO with a hosted realtime backend.
- The existing `undercover-fast/` local game remains available as the no-backend version.
