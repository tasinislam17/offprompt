# Deployment Guide

This app should deploy as one long-running Node web service. Do not split the frontend and backend for the first release unless you also keep a native WebSocket server online.

## Recommended Cheapest Practical Path

Use Render for the first public deployment:

- Render documents WebSocket support for web services.
- Render can run one Node service that serves both the built React app and Socket.IO.
- Render's free web services are useful for testing, but they spin down after 15 minutes without traffic. Use a paid small web service for real party sessions.

Current official references:

- Render WebSockets: https://render.com/docs/websocket
- Render free instance limits: https://render.com/free
- Render pricing: https://render.com/pricing
- Railway pricing alternative: https://docs.railway.com/pricing
- Vercel WebSocket limitation: https://vercel.com/docs/limits/overview#websockets

## GitHub Setup

1. Create a GitHub repository.
2. Push this project to the repository.
3. Confirm these files are present:
   - `package.json`
   - `client/package.json`
   - `server/package.json`
   - `shared/package.json`
   - `server/src/data/promptPairs.json`
   - `off-prompt-logo.svg`

## Render Setup

1. Create a Render account.
2. Click `New` and choose `Web Service`.
3. Connect the GitHub repository.
4. Use these settings:

```text
Environment: Node
Build Command: npm run build
Start Command: npm start
Health Check Path: /health
```

5. Add environment variables:

```text
NODE_ENV=production
ROOM_TTL_MINUTES=180
CLIENT_ORIGIN=https://YOUR-RENDER-SERVICE.onrender.com
LOG_LEVEL=info
```

Render supplies `PORT`, so do not hardcode it.

## Test Production Deployment

1. Open the public Render URL.
2. Visit `/health` and confirm it returns JSON.
3. Create a room from the public URL.
4. Join from a phone using the QR code.
5. Ready all players and start a game.
6. Confirm answer submission, reveal, voting, result, and next round.
7. Refresh one phone and confirm it rejoins.
8. Refresh the host and confirm it recovers.

## WebSocket Notes

Socket.IO uses the same HTTP server as Express in this project. That is why a long-running Node web service is required.

Avoid deploying this architecture directly to providers that only run serverless functions for backend code. Vercel Functions, for example, document that they do not support acting as a WebSocket server. Static frontend hosts are fine only if the Socket.IO backend is deployed separately on a WebSocket-capable service.

## If Free Tier Sleeps

If the service sleeps, all in-memory rooms are lost. That is acceptable for preview testing but not for live parties.

Upgrade path:

1. Move from free to a small always-on service.
2. Add monitoring and error alerts.
3. Add Redis and a database only when you need multi-instance scaling, analytics, or admin prompt management.

## Railway Alternative

Railway is also a reasonable single-service host for Node apps. Its current pricing uses a base plan plus resource usage. For this app, set:

```text
Build Command: npm run build
Start Command: npm start
Health Check Path: /health
```

Use the same environment variables as Render.
