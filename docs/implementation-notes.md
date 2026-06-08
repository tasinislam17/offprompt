# Off Prompt Implementation Notes

## Chosen Structure

The project now uses a simple npm workspace layout:

- `client/` contains the React, Vite, TypeScript, and Tailwind app.
- `server/` contains the Express and Socket.IO service plus all game authority.
- `shared/` contains TypeScript-only client/server state contracts.
- `docs/` contains founder-facing setup, deployment, rules, architecture, and testing notes.

The production build compiles the client and server, then the Node server serves the compiled React app and Socket.IO from one port.

## Preserved Assets and Data

- `OFF_PROMPT_SRS.md` remains the source of truth.
- `off-prompt-logo.svg` remains in the root and is copied into `client/public/` for the web app.
- `server/src/data/promptPairs.json` remains the prompt source. The client never imports or receives this dataset.

## Server Authority

The server owns:

- room creation and expiry
- host and player session recovery
- prompt selection and placeholder rendering
- Off-Prompt and Criminal assignment
- private prompt delivery
- answer, vote, score, elimination, and win-condition logic

The client only renders state slices sent by the server. Player clients receive exactly one private prompt for their current round.

## MVP Rules Finalized

- Party Mode ties benefit the Off-Prompt side.
- Case Mode ties cause no elimination.
- Self-voting is disabled.
- Answers cannot be edited after submit.
- Reconnection is token-based through local storage and in-memory room state.
