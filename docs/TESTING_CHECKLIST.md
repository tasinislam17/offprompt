# Testing Checklist

## Automated

- [ ] `npm run validate:prompts`
- [ ] `npm run test`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm audit --omit=dev`

## Party Mode, 3 Players

- [ ] Host creates a 3-player Party room.
- [ ] Three phones join.
- [ ] Duplicate name is rejected.
- [ ] Fourth player is rejected as room full.
- [ ] All players ready.
- [ ] Host starts game.
- [ ] Each player receives one private prompt.
- [ ] Players submit answers.
- [ ] Host reveal shows answers only.
- [ ] Players vote.
- [ ] Self-vote is unavailable.
- [ ] Result reveals Off-Prompt player.
- [ ] Score updates correctly.
- [ ] Next round starts.
- [ ] Final scoreboard appears after configured rounds.

## Party Mode, 10 Players

- [ ] Host creates a 10-player room.
- [ ] All players join and ready.
- [ ] Answer and vote progress stay readable on host.
- [ ] Vote result bars fit on host screen.
- [ ] Final scores are readable from a TV distance.

## Dynamic Prompt Rendering

- [ ] A `{player}` prompt appears in a round.
- [ ] The target player name is rendered consistently.
- [ ] No client receives both prompt variants.

## Vote Edge Cases

- [ ] Tie vote in Party Mode gives Off Prompt the point.
- [ ] No clear majority in Party Mode gives Off Prompt the point.
- [ ] Disconnected player during voting does not block host from ending voting.

## Reconnection

- [ ] Player refreshes in lobby and returns to same room.
- [ ] Player refreshes during answering and still sees current prompt.
- [ ] Player refreshes after answer submit and remains locked.
- [ ] Host refreshes and recovers the room.
- [ ] Disconnected player appears visually disconnected on host.

## Invalid States

- [ ] Invalid room code shows a clear error.
- [ ] Game already started rejects new joins.
- [ ] Closed or expired rooms reject joins.
- [ ] Empty answers are rejected.
- [ ] Over-long answers are rejected.

## Case Mode

- [ ] Host creates a Case room.
- [ ] Criminal count validation works.
- [ ] Criminals remain fixed across rounds.
- [ ] Eliminated players cannot answer.
- [ ] Eliminated players cannot vote.
- [ ] Tie vote causes no elimination.
- [ ] Civilian win triggers when all criminals are eliminated.
- [ ] Criminal win triggers when criminals are equal to or greater than civilians.
- [ ] Final screen reveals criminal team.

## Responsive UI

- [ ] Mobile portrait player controller.
- [ ] Mobile landscape player controller.
- [ ] Tablet host setup and lobby.
- [ ] Laptop host screen.
- [ ] TV/projector host screen.

## Production

- [ ] `NODE_ENV=production npm start` serves the app.
- [ ] Direct navigation to `/join` works.
- [ ] Direct navigation to `/host/:roomCode` works after host session exists.
- [ ] `/health` returns JSON.
- [ ] Public deployment supports Socket.IO WebSocket connection.
