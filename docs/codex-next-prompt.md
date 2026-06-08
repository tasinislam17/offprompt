# Suggested Next Codex Prompt

Use this after the launchable local version has been tested with real players.

```text
You are working inside the Off Prompt project. The app already has React/Vite/Tailwind frontend, Express/Socket.IO backend, shared TypeScript contracts, Party Mode, Case Mode, reconnect handling, prompt validation, production build, docs, and a manual testing checklist.

Please inspect the current codebase and implement the next highest-impact production improvements without changing the core architecture:

1. Add optional host-controlled timers for discussion and voting.
2. Add a small sound system with host mute control.
3. Add a custom prompt-pack structure while preserving server-side prompt privacy.
4. Add stronger production logging and rate limiting.
5. Add browser-based multiplayer smoke tests if feasible.

Do not add authentication, paid APIs, AI features, or a database unless there is a clear reason.
```
