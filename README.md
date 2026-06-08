# Off Prompt

Off Prompt is a web-based couch co-op social deduction party game. One shared host screen creates a room, and players join from phones with a room code. Each round, most players receive one prompt while Off-Prompt players receive a similar but different prompt. The host reveals answers, the room debates, players vote, and the server scores or eliminates.

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS
- Node.js + Express + Socket.IO + TypeScript
- In-memory room state for the first production version
- JSON prompt data at `server/src/data/promptPairs.json`
- One production Node service serving both the frontend and Socket.IO backend

## Folder Structure

```text
client/    React app, host screen, phone controller, Tailwind UI
server/    Express, Socket.IO, prompt validation, room manager, game engine
shared/    Shared TypeScript state contracts
docs/      Architecture, deployment, local dev, game rules, test checklist
```

The official logo remains at `off-prompt-logo.svg` and is copied into `client/public/off-prompt-logo.svg`.

## Local Setup

```bash
npm install
npm run dev
```

Development starts:

- client: `http://localhost:5173`
- server: `http://localhost:3001`
- health check: `http://localhost:3001/health`

## Test With Phones On Same Wi-Fi

1. Run `npm run dev`.
2. Find the Vite Network URL in the terminal, usually `http://YOUR-LAPTOP-IP:5173`.
3. Open that URL on the host laptop or TV browser.
4. Click `Host Game`, create a room, and show the lobby QR/code.
5. Phones join from the QR code or `http://YOUR-LAPTOP-IP:5173/join?room=CODE`.

If a phone cannot connect, make sure the laptop and phone are on the same Wi-Fi and that the OS firewall allows Node/Vite on ports `5173` and `3001`.

## Production Build

```bash
npm run build
npm start
```

For a production-like local run on PowerShell:

```powershell
$env:NODE_ENV="production"
$env:PORT="3001"
npm start
```

Then open `http://localhost:3001`.

## Gameplay Included

- Host setup for Party Mode and Case Mode
- QR join lobby
- duplicate-name, room-full, invalid-room validation
- player ready flow
- private prompt assignment from the server only
- dynamic `{player}` prompt rendering
- answer submission and host answer reveal
- voting with self-vote disabled
- Party scoring with tie benefit to Off Prompt
- Case Mode fixed criminals, eliminations, spectators, and win checks
- refresh/rejoin handling for host and players while the room exists in memory

## Testing

```bash
npm run validate:prompts
npm run test
npm run typecheck
npm run build
```

Manual multiplayer coverage is in `docs/TESTING_CHECKLIST.md`.

## Deployment

The cheapest simple path is one long-running Node web service that supports WebSockets. See `docs/DEPLOYMENT.md`.

Build command:

```bash
npm run build
```

Start command:

```bash
npm start
```

## Known Limitations

- Rooms are in memory, so redeploys/restarts clear active rooms.
- Free hosts that sleep will break active rooms when they spin down.
- No database, accounts, analytics, admin prompt editor, or moderation system yet.
- Case Mode intentionally reveals criminal identities only at game end.

## Next Recommended Improvements

- Add persistent prompt packs and an admin prompt editor.
- Add Redis adapter support before scaling across multiple server instances.
- Add optional sound and host-controlled timers.
- Add production monitoring and structured error reporting.
