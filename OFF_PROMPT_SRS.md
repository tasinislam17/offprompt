# Off-Prompt — Software Requirements Specification

**Document Type:** Software Requirements Specification  
**Product Name:** Off-Prompt  
**Game Type:** Web-based couch co-op social deduction party game  
**Primary Development Mode:** Codex-assisted local development on personal laptop  
**Target Release:** Playable public MVP, then production-grade V1  
**Version:** 1.0  
**Prepared For:** Root directory reference document for Codex PC / local coding workflow

---

## 1. Product Summary

Off-Prompt is a web-based couch co-op party game where one shared host screen runs the main game and 3 to 10 players join from their own phones using a room code. Players answer prompts privately, but one or more players receive a slightly different prompt. The shared screen reveals only the answers, not the questions. Players then discuss, detect who was “off-prompt,” and vote.

The game must feel instantly understandable, visually polished, fast to join, and fun in a social setting. It should work for a group sitting in one room with a laptop or phone projected to a TV, while each player interacts through their phone browser.

The first production goal is not account systems, monetization, or complex backend infrastructure. The first production goal is a stable, beautiful, low-friction party game that can be opened, hosted, joined, played, and replayed without setup pain.

---

## 2. Core Product Positioning

### 2.1 One-Line Pitch

A couch co-op social deduction game where everyone answers a prompt, but someone is answering the wrong one.

### 2.2 Player Promise

Players should be able to:

1. Open the game.
2. Host a room.
3. Share a room code or QR code.
4. Join from phones.
5. Submit answers.
6. Discuss suspicious answers.
7. Vote.
8. Laugh at the reveal.
9. Continue to the next round without friction.

### 2.3 Product Differentiation

Off-Prompt differs from many social deduction games because it does not require complex roles, maps, movement, long rule reading, or heavy moderation. The core mechanic is answer interpretation. The drama comes from ambiguity.

### 2.4 Game Feel Goals

The product should feel:

1. Fast.
2. Social.
3. Suspicious.
4. Funny.
5. Premium.
6. Mobile-first for players.
7. TV-friendly for the host screen.
8. Easy enough for non-gamers.
9. Replayable through prompt variety.
10. Stable enough for live party usage.

---

## 3. Logo and Brand Asset Requirements

The Off-Prompt logo will be placed in the project root as a PNG file by the product owner.

### 3.1 Expected Root Logo File

Preferred file name:

```text
/off-prompt-logo.png
```

If a different filename is present, Codex should ask for confirmation before renaming or moving it.

### 3.2 Asset Handling Requirement

During implementation, Codex should copy or reference the logo into the frontend public asset directory:

```text
/client/public/logo.png
```

The original root logo should remain untouched.

### 3.3 Visual Direction from Logo

The UI should be designed around the following brand direction:

1. Deep navy / black gamepad base.
2. Electric blue outline and accent.
3. Cyan highlight.
4. Violet/purple secondary accent.
5. Clean white contrast.
6. Modern gaming typography.
7. Soft glow effects used sparingly.
8. Rounded card surfaces and bold call-to-action buttons.

### 3.4 Brand Personality

Off-Prompt should feel like a modern party game, not a corporate quiz app. It should avoid looking like a generic form-based web app.

The visual identity should balance:

1. Party-game energy.
2. Premium polish.
3. Readability from a TV.
4. Comfort on small phone screens.

---

## 4. Development and Deployment Philosophy

### 4.1 Development Context

The product will be developed on a personal laptop using Codex PC/local coding workflow. The codebase should be structured so that Codex can incrementally implement, test, refactor, and deploy without needing repeated architectural resets.

### 4.2 Engineering Philosophy

The system must be:

1. Simple enough to build incrementally.
2. Real-time enough for live gameplay.
3. Cheap enough to deploy initially.
4. Clean enough to maintain through Codex iterations.
5. Secure enough to prevent obvious cheating.
6. Flexible enough to add prompt packs, Case Mode, and later database persistence.

### 4.3 Cost-Minimized Deployment Strategy

The initial deployment should avoid paid APIs, managed auth, complex cloud services, and unnecessary databases.

Recommended deployment direction:

1. Build a single Node.js backend that serves both the API/WebSocket server and the compiled frontend.
2. Use Socket.IO for real-time game rooms.
3. Use in-memory room state for MVP.
4. Use JSON prompt files for content.
5. Deploy as a long-running Node.js web service on a low-cost provider that supports WebSockets.
6. Add database persistence only when the game requires analytics, prompt management, admin tools, or long-term room history.

### 4.4 Services to Avoid in MVP

Do not add the following in the first playable production build:

1. Login/signup.
2. User profiles.
3. Paid APIs.
4. AI-generated prompts.
5. Complex CMS.
6. Database dependency for active gameplay.
7. Microservices.
8. Kubernetes.
9. Payment system.
10. Global leaderboard.

---

## 5. Recommended Technology Stack

### 5.1 Frontend

| Area | Requirement |
|---|---|
| Framework | React |
| Build Tool | Vite |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Routing | React Router |
| State Management | Local component state first; Zustand only if state becomes messy |
| Real-time Client | Socket.IO client |
| Icons | Lightweight icon package only if needed |
| Animation | CSS transitions and simple Framer Motion only if it does not slow delivery |

### 5.2 Backend

| Area | Requirement |
|---|---|
| Runtime | Node.js |
| Server | Express |
| Real-time | Socket.IO |
| Language | TypeScript |
| Active Game State | In-memory room manager for MVP |
| Prompt Source | JSON file |
| Logging | Console logs initially; structured logging later |
| Tests | Unit tests for game engine and prompt logic |

### 5.3 Deployment

| Area | Requirement |
|---|---|
| Build | Compile frontend into static files |
| Serve | Backend serves frontend build in production |
| WebSocket Support | Required |
| Environment Variables | PORT, NODE_ENV, CLIENT_ORIGIN, ROOM_TTL_MINUTES |
| Health Check | `/health` endpoint |
| Deployment Cost Goal | As cheap as practically possible while supporting WebSocket rooms |

---

## 6. Users and Roles

### 6.1 Host

The Host creates and controls the game room. The Host screen is usually projected on a TV or shared with the group.

Host responsibilities:

1. Create room.
2. Configure game settings.
3. Show room code and QR code.
4. Start game when players are ready.
5. Advance rounds if automatic progression is not enabled.
6. Display answers, votes, reveals, and scoreboard.
7. End game.
8. Restart or create new game.

### 6.2 Player

Players join the room from their phones.

Player responsibilities:

1. Enter room code.
2. Enter display name.
3. Mark ready.
4. Read private prompt.
5. Submit answer.
6. Discuss verbally.
7. Vote.
8. View result.
9. Continue to next round or remain spectator if eliminated in Case Mode.

### 6.3 Spectator / Eliminated Player

In Case Mode, eliminated players become spectators.

Spectator behavior:

1. Cannot answer.
2. Cannot vote.
3. Can see host screen in-person.
4. Can see limited phone state such as “You are eliminated.”
5. Must not receive hidden criminal information until the game ends unless reveal rules require it.

---

## 7. Game Modes

## 7.1 Party Mode

Party Mode is the first mode to build.

### 7.1.1 Description

Party Mode is a fixed-round casual mode. Every round has a new Off-Prompt player. No one is eliminated. At the end of all rounds, the player with the highest score wins.

### 7.1.2 Setup Inputs

| Setting | Requirement |
|---|---|
| Player count | 3 to 10 |
| Off-Prompt count | 1 for MVP; later 1 to 3 based on player count |
| Rounds | 3 to 10 |
| Prompt safe level | Default safe; optional later |
| Mode | Party Mode |

### 7.1.3 Round Flow

1. Server selects active prompt pair.
2. Server selects Off-Prompt player for the round.
3. Server sends main prompt to regular players.
4. Server sends off-prompt to Off-Prompt player.
5. Players submit answers.
6. Host screen shows waiting state until all answers are submitted.
7. Host screen reveals only answers, not player roles or prompts.
8. Discussion timer starts or host starts voting manually.
9. Players vote on who they think was Off-Prompt.
10. Server calculates vote result.
11. Host screen reveals votes.
12. Host screen reveals actual Off-Prompt player.
13. Score is updated.
14. Next round starts.
15. Final scoreboard appears after last round.

### 7.1.4 Party Mode Scoring

Recommended scoring:

| Outcome | Score Impact |
|---|---|
| Majority identifies Off-Prompt player | Each regular player receives 1 point |
| Off-Prompt player avoids majority detection | Off-Prompt player receives 1 point |
| Vote tie without clear majority | Off-Prompt player receives 1 point |
| Player does not vote | Vote ignored or auto-counted as abstain |

### 7.1.5 Party Mode Acceptance Criteria

1. Host can configure and start a Party Mode game with 3 to 10 players.
2. Each round assigns exactly one Off-Prompt player in MVP.
3. Off-Prompt assignment changes round to round.
4. No player is eliminated.
5. Answers are revealed without revealing questions.
6. Voting works from each phone.
7. Score updates correctly.
8. Game ends after configured rounds.
9. Final scoreboard clearly shows winner.

---

## 7.2 Case Mode

Case Mode is the second mode to build after Party Mode is stable.

### 7.2.1 Description

Case Mode is a deduction mode where Criminals remain fixed across rounds. Players vote to eliminate suspects. Civilians win if all Criminals are eliminated. Criminals win if the number of remaining Criminals is equal to or greater than the number of remaining Civilians.

### 7.2.2 Setup Inputs

| Setting | Requirement |
|---|---|
| Player count | 4 to 10 recommended; 3 allowed only with 1 criminal |
| Criminal count | 1 to 2 initially |
| Rounds | Not fixed; game ends by win condition |
| Mode | Case Mode |

### 7.2.3 Criminal Count Rules

| Player Count | Recommended Criminal Count |
|---:|---:|
| 3 | 1 |
| 4 | 1 |
| 5 | 1 |
| 6 | 1 |
| 7 | 1 or 2 |
| 8 | 2 |
| 9 | 2 |
| 10 | 2 |

### 7.2.4 Case Mode Round Flow

1. Criminals are assigned once at game start.
2. Each round, server selects a prompt pair.
3. Civilians receive main prompt.
4. Criminals receive off-prompt.
5. Players submit answers.
6. Host screen reveals only answers.
7. Players discuss.
8. Active non-eliminated players vote.
9. Highest-voted player is eliminated.
10. Server checks win conditions.
11. If no win condition is met, next round begins.
12. If win condition is met, final reveal screen appears.

### 7.2.5 Case Mode Win Conditions

| Condition | Winner |
|---|---|
| Criminal count becomes 0 | Civilians win |
| Criminal count >= Civilian count among active players | Criminals win |

### 7.2.6 Elimination Rules

1. Eliminated players cannot answer.
2. Eliminated players cannot vote.
3. Eliminated players should not automatically see who the Criminals are until the game ends.
4. If vote tie occurs, the system should either trigger revote or no elimination. MVP recommendation: no elimination on tie.

### 7.2.7 Case Mode Acceptance Criteria

1. Criminals remain fixed across rounds.
2. Eliminated players cannot participate in active gameplay.
3. Win conditions are checked after every vote.
4. Final reveal clearly shows Criminals and Civilians.
5. Game does not continue after win condition is met.

---

## 8. Core Screens and UI Requirements

## 8.1 Landing Screen

### Purpose

Let user choose whether to host or join a game.

### Required Elements

1. Off-Prompt logo.
2. Game title.
3. Short tagline.
4. Primary button: “Host Game”.
5. Secondary button: “Join Game”.
6. Small footer text or version.
7. Optional animated background using subtle glowing blobs or gradient grid.

### Visual Requirements

1. Centered layout.
2. Dark background with electric blue accents.
3. Large logo, but not oversized on mobile.
4. Clear separation between Host and Join actions.
5. Must look polished on both desktop and phone.

### Acceptance Criteria

1. Clicking Host Game opens Host Setup.
2. Clicking Join Game opens Join Game screen.
3. Screen loads under normal mobile network conditions.
4. Logo renders without distortion.

---

## 8.2 Host Setup Screen

### Purpose

Allow Host to configure room before creating game.

### Required Elements

1. Logo in header.
2. Mode selector:
   - Party Mode available.
   - Case Mode shown as “Coming Soon” until implemented.
3. Player count selector: 3 to 10.
4. Off-Prompt player count selector:
   - MVP default: 1.
   - Disable invalid values.
5. Rounds selector for Party Mode: 3 to 10.
6. Create Room button.
7. Back button.
8. Short mode explanation card.

### Validation Rules

1. Player count must be between 3 and 10.
2. Rounds must be between 3 and 10.
3. Off-Prompt count cannot be greater than valid player ratio.
4. Case Mode cannot be selected until implemented.

### Acceptance Criteria

1. Host can create a valid room.
2. Invalid settings cannot be submitted.
3. Mode explanation changes based on selected mode.
4. Room creation failure displays readable error.

---

## 8.3 Host Lobby Screen

### Purpose

Display join code and player readiness.

### Required Elements

1. Large room code.
2. QR code area.
3. Join URL text.
4. Player list.
5. Ready status for each player.
6. Game settings summary.
7. Start Game button.
8. Copy link button.
9. Optional full-screen mode button.
10. Leave/close room button.

### Host Screen Design Requirements

1. Room code must be readable from a TV.
2. QR code must be large enough to scan from reasonable distance.
3. Player list should use cards or chips.
4. Ready players should be visually distinct.
5. Start button should visibly unlock only when all conditions are met.

### Start Conditions

Start Game button is enabled only when:

1. Joined player count equals configured player count.
2. All joined players are ready.
3. Room is in lobby status.
4. Host is still connected.

### Acceptance Criteria

1. Player joining updates host lobby in real time.
2. Player ready changes update host lobby in real time.
3. Start button remains disabled until valid.
4. Host can start once valid.

---

## 8.4 Player Join Screen

### Purpose

Allow player to join a room with a code.

### Required Elements

1. Logo.
2. Room code input.
3. Player name input.
4. Join button.
5. Error display area.
6. Back to landing link.

### Input Rules

| Field | Rule |
|---|---|
| Room code | Uppercase alphanumeric, trim spaces |
| Player name | 2 to 20 characters |
| Duplicate name | Not allowed in same room |
| Offensive name | Basic block later; not MVP blocker |

### Acceptance Criteria

1. Player can join valid room.
2. Invalid room shows clear error.
3. Duplicate name shows clear error.
4. Full room shows clear error.
5. Player is routed to lobby after successful join.

---

## 8.5 Player Lobby Screen

### Purpose

Let player wait and mark ready.

### Required Elements

1. Room code.
2. Player name.
3. Ready toggle button.
4. Waiting message.
5. Player count status.
6. Optional list of joined players.
7. Leave room button.

### Acceptance Criteria

1. Player can toggle ready.
2. Ready state updates host in real time.
3. Player sees when waiting for others.
4. Player receives game start automatically.

---

## 8.6 Player Prompt Screen

### Purpose

Privately show each player their assigned question.

### Required Elements

1. Round number.
2. Private prompt card.
3. Answer input.
4. Submit button.
5. Character counter.
6. Instruction text: “Answer naturally. Your answer will be shown on the host screen.”
7. Waiting state after submission.

### Critical Security Requirement

The frontend must only receive the prompt assigned to that player. It must never receive both mainPrompt and offPrompt.

### Answer Rules

| Answer Format | Validation |
|---|---|
| text | 1 to 80 characters |
| number | Numeric only, reasonable max |
| player_name | Text answer allowed; no strict validation initially |

### Acceptance Criteria

1. Each player sees only their own prompt.
2. Submitted answer cannot be edited after submission in MVP.
3. Empty answers cannot be submitted.
4. Host updates waiting count in real time.

---

## 8.7 Host Answer Reveal Screen

### Purpose

Reveal all submitted answers for discussion.

### Required Elements

1. Round number.
2. Prompt reveal status should not show actual prompts in normal mode.
3. Answer cards.
4. Player names with answers.
5. Countdown before reveal.
6. Discussion timer.
7. Start Voting button or automatic voting after timer.

### Reveal Behavior

Recommended sequence:

1. “All answers submitted.”
2. 3-second suspense state.
3. Answer cards animate in.
4. Discussion timer starts.
5. Host can start voting.

### Acceptance Criteria

1. Answers appear only after all active players submit.
2. Actual prompts remain hidden.
3. Answer cards are readable from TV.
4. Host can move to voting.

---

## 8.8 Voting Screen

### Player Voting Screen

Required elements:

1. Instruction: “Who was Off-Prompt?” or “Who is the Criminal?” depending on mode.
2. List of eligible players.
3. Vote button per player.
4. Confirm vote action.
5. Waiting state after vote.

Rules:

1. Player cannot vote for eliminated player.
2. Player cannot change vote after confirmation in MVP.
3. In Party Mode, player may vote for anyone except optionally themselves. MVP recommendation: allow self-vote only if intentional; better to disallow self-vote.
4. In Case Mode, eliminated players cannot vote.

### Host Voting Screen

Required elements:

1. Voting progress count.
2. Timer.
3. No live vote details until reveal.
4. Optional “End Voting Now” button if all votes submitted.

### Acceptance Criteria

1. Votes are submitted from phones.
2. Vote progress updates on host.
3. Vote result is calculated server-side.
4. Vote choices are not leaked before result reveal.

---

## 8.9 Vote Results and Reveal Screen

### Required Elements

1. Vote breakdown.
2. Most-voted player.
3. Actual Off-Prompt/Criminal reveal.
4. Outcome statement.
5. Score update or elimination result.
6. Next Round button.
7. Final Results button on last round.

### Party Mode Result Copy Examples

If Off-Prompt wins:

```text
{name} blended in. Off-Prompt gets the point.
```

If regular players win:

```text
Caught. Everyone else gets the point.
```

### Acceptance Criteria

1. Vote counts are accurate.
2. Actual Off-Prompt player is revealed.
3. Score updates correctly.
4. Next round starts cleanly.

---

## 8.10 Scoreboard Screen

### Required Elements

1. Player ranking.
2. Current scores.
3. Round history summary.
4. Current leader highlight.
5. Continue button.
6. Final game result screen after last round.

### Acceptance Criteria

1. Scoreboard reflects server state.
2. Ties are displayed clearly.
3. Final winner is displayed clearly.

---

## 8.11 Final Results Screen

### Required Elements

1. Winner or winning team.
2. Final rankings.
3. Fun end-game title.
4. Play Again button.
5. New Room button.
6. Share/copy room link optional.

### Acceptance Criteria

1. Game ends gracefully.
2. Host can restart or return home.
3. Players are routed to final state.

---

## 9. Prompt System Requirements

## 9.1 Prompt Data File

Prompt pairs must be stored in:

```text
/server/src/data/promptPairs.json
```

The file must not be hardcoded into game logic.

## 9.2 Prompt Pair Schema

Each prompt pair must follow this structure:

```json
{
  "id": "friends_001",
  "category": "Friends",
  "type": "open",
  "modeCompatibility": ["party", "case"],
  "requiresTargetPlayer": false,
  "targetRule": null,
  "mainPrompt": "Name your dumbest friend.",
  "offPrompt": "Name a friend you would not call for help.",
  "answerFormat": "text",
  "minPlayers": 3,
  "maxPlayers": 10,
  "safeLevel": "safe",
  "tags": ["friends", "funny", "social"]
}
```

## 9.3 Prompt Types

| Type | Description |
|---|---|
| open | Open-ended response |
| numeric | Numeric response |
| dynamic | Uses player placeholder or contextual placeholder |
| choice | General category answer |
| hypothetical | Scenario-based answer |
| ranking | Usually asks who among the group fits a condition |

## 9.4 Dynamic Prompt Placeholders

Supported placeholders:

| Placeholder | Meaning |
|---|---|
| `{player}` | Random active player selected by server |
| `{month}` | Current or previous month; later feature |
| `{event}` | Optional contextual event; later feature |
| `{place}` | Optional location/category; later feature |

MVP must support `{player}`.

## 9.5 Prompt Selection Rules

The server must:

1. Load prompt pairs from JSON.
2. Validate prompt pair structure at startup.
3. Filter by current game mode.
4. Filter by active player count.
5. Avoid prompts already used in the current game when possible.
6. Select one prompt pair randomly.
7. Render placeholders server-side.
8. Send only the assigned prompt to each player.
9. Store prompt pair ID in round state.
10. Never expose both prompts to the same client.

## 9.6 Prompt Quality Rules

Each prompt pair must satisfy:

1. Main prompt and off-prompt should produce answers from the same answer category.
2. The off-prompt should be different enough to create suspicion.
3. The off-prompt should not be so different that the player is immediately exposed.
4. Prompts should work in a group of friends without needing private context.
5. Default prompt pack should avoid extreme adult, political, religious, or harmful content.
6. Adult/chaotic prompt packs may be added later behind explicit selection.

---

## 10. Real-Time System Requirements

## 10.1 Connection Model

The game must use real-time bidirectional communication between server and browser clients.

There are two client types:

1. Host client.
2. Player client.

The server owns all authoritative game state.

## 10.2 Room Code Requirements

1. Room code should be 4 to 6 characters.
2. Room code should be uppercase alphanumeric.
3. Avoid ambiguous characters if possible: O, 0, I, 1.
4. Room code must be unique among active rooms.
5. Room code expires after room inactivity.

Recommended character set:

```text
ABCDEFGHJKLMNPQRSTUVWXYZ23456789
```

## 10.3 Room Lifecycle

Room statuses:

```text
lobby
round_starting
round_answering
answers_revealed
voting
round_result
scoreboard
game_over
closed
```

## 10.4 Socket Events

### Host to Server

```text
host:createRoom
host:updateSettings
host:startGame
host:startVoting
host:nextRound
host:restartGame
host:closeRoom
```

### Player to Server

```text
player:joinRoom
player:setReady
player:submitAnswer
player:submitVote
player:leaveRoom
player:rejoinRoom
```

### Server to Host

```text
room:created
room:lobbyUpdated
game:started
round:started
round:answerProgress
round:answersRevealed
vote:started
vote:progress
vote:results
round:result
scoreboard:updated
game:ended
room:error
```

### Server to Player

```text
player:joined
player:lobbyUpdated
game:started
round:promptAssigned
round:waitingForAnswers
vote:started
vote:submitted
round:result
scoreboard:updated
game:ended
player:error
```

## 10.5 Authoritative Server Rules

The server must decide:

1. Room creation.
2. Player identity inside room.
3. Prompt selection.
4. Off-Prompt assignment.
5. Criminal assignment.
6. Valid answer submission.
7. Valid vote submission.
8. Vote calculation.
9. Score calculation.
10. Elimination.
11. Win conditions.

Frontend must never be trusted for game-critical decisions.

---

## 11. Data Model Requirements

## 11.1 Game Mode

```ts
type GameMode = 'party' | 'case';
```

## 11.2 Room Status

```ts
type RoomStatus =
  | 'lobby'
  | 'round_starting'
  | 'round_answering'
  | 'answers_revealed'
  | 'voting'
  | 'round_result'
  | 'scoreboard'
  | 'game_over'
  | 'closed';
```

## 11.3 Player

```ts
type Player = {
  id: string;
  socketId: string | null;
  name: string;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  isEliminated: boolean;
  score: number;
  joinedAt: number;
  lastSeenAt: number;
};
```

## 11.4 Game Settings

```ts
type GameSettings = {
  mode: GameMode;
  playerCount: number;
  offPromptCount: number;
  totalRounds: number;
  discussionSeconds: number;
  votingSeconds: number;
  safeLevel: 'safe' | 'medium' | 'adult';
};
```

## 11.5 Round

```ts
type Round = {
  id: string;
  roundNumber: number;
  promptPairId: string;
  renderedMainPrompt: string;
  renderedOffPrompt: string;
  targetPlayerId?: string;
  offPromptPlayerIds: string[];
  answers: Record<string, string>;
  votes: Record<string, string>;
  eliminatedPlayerId?: string;
  startedAt: number;
  endedAt?: number;
};
```

## 11.6 Room

```ts
type Room = {
  code: string;
  hostSocketId: string | null;
  settings: GameSettings;
  status: RoomStatus;
  players: Player[];
  rounds: Round[];
  currentRoundIndex: number;
  usedPromptPairIds: string[];
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};
```

---

## 12. Functional Requirements

## 12.1 Room Creation

| ID | Requirement |
|---|---|
| FR-001 | Host shall be able to create a game room. |
| FR-002 | System shall generate unique room code. |
| FR-003 | System shall store room settings server-side. |
| FR-004 | System shall return room code to host. |
| FR-005 | Host shall be assigned as controller of the room. |

## 12.2 Player Joining

| ID | Requirement |
|---|---|
| FR-006 | Player shall join using valid room code. |
| FR-007 | Player shall provide display name. |
| FR-008 | System shall reject duplicate names inside same room. |
| FR-009 | System shall reject joining when room is full. |
| FR-010 | System shall reject joining after game has started, unless rejoin token exists. |

## 12.3 Lobby

| ID | Requirement |
|---|---|
| FR-011 | Host shall see all joined players. |
| FR-012 | Player shall toggle ready status. |
| FR-013 | Host shall see readiness in real time. |
| FR-014 | Start Game shall be disabled until room is valid. |
| FR-015 | Host shall start game when all players are ready. |

## 12.4 Party Mode Gameplay

| ID | Requirement |
|---|---|
| FR-016 | System shall start configured number of rounds. |
| FR-017 | System shall select one Off-Prompt player per round in MVP. |
| FR-018 | System shall select prompt pair per round. |
| FR-019 | System shall send private prompt to each player. |
| FR-020 | Player shall submit one answer per round. |
| FR-021 | Host shall see answer submission progress. |
| FR-022 | Host shall reveal all answers after submissions are complete. |
| FR-023 | Players shall vote after answer reveal. |
| FR-024 | System shall calculate voting result. |
| FR-025 | System shall reveal actual Off-Prompt player. |
| FR-026 | System shall update score. |
| FR-027 | System shall advance to next round. |
| FR-028 | System shall end game after final round. |

## 12.5 Case Mode Gameplay

| ID | Requirement |
|---|---|
| FR-029 | System shall assign fixed Criminals at game start. |
| FR-030 | Criminals shall receive off-prompt every round. |
| FR-031 | Civilians shall receive main prompt every round. |
| FR-032 | Players shall vote to eliminate suspects. |
| FR-033 | Highest-voted active player shall be eliminated unless tie rule prevents elimination. |
| FR-034 | Eliminated players shall not answer or vote. |
| FR-035 | System shall check win condition after every elimination. |
| FR-036 | System shall end game when win condition is met. |

## 12.6 Reconnection

| ID | Requirement |
|---|---|
| FR-037 | Player refresh shall attempt to reconnect to same room. |
| FR-038 | Host refresh shall attempt to recover host session. |
| FR-039 | Disconnected player shall be marked disconnected. |
| FR-040 | Disconnected player may rejoin if room is still active. |
| FR-041 | System shall not crash if player disconnects mid-round. |

## 12.7 Room Expiry

| ID | Requirement |
|---|---|
| FR-042 | Inactive rooms shall expire automatically. |
| FR-043 | Closed rooms shall reject joins. |
| FR-044 | Room cleanup shall run periodically. |

## 12.8 Prompt Management

| ID | Requirement |
|---|---|
| FR-045 | System shall load prompt pairs from JSON. |
| FR-046 | System shall validate prompt pairs at startup. |
| FR-047 | System shall avoid prompt repetition within a game when possible. |
| FR-048 | System shall support dynamic `{player}` prompts. |
| FR-049 | System shall not expose both prompts to any player client. |

## 12.9 UI and Navigation

| ID | Requirement |
|---|---|
| FR-050 | System shall provide landing screen. |
| FR-051 | System shall provide host setup screen. |
| FR-052 | System shall provide host lobby screen. |
| FR-053 | System shall provide player join screen. |
| FR-054 | System shall provide player prompt screen. |
| FR-055 | System shall provide voting screen. |
| FR-056 | System shall provide result screen. |
| FR-057 | System shall provide final result screen. |

---

## 13. Visual and UX Requirements

## 13.1 Global Visual System

### Color Palette

Recommended palette based on logo:

| Token | Usage | Suggested Color |
|---|---|---|
| `brand-navy` | Main background | `#050819` |
| `brand-deep` | Card background | `#080D2A` |
| `brand-blue` | Primary accent | `#1557FF` |
| `brand-cyan` | Secondary accent | `#37F0F0` |
| `brand-purple` | Tertiary accent | `#8B5CF6` |
| `brand-white` | Text | `#FFFFFF` |
| `brand-muted` | Secondary text | `#A7B0D8` |
| `danger` | Error | `#FF4D6D` |
| `success` | Success | `#3EF29A` |
| `warning` | Warning | `#FFD166` |

### Visual Style

1. Dark gaming dashboard base.
2. Neon but controlled accent usage.
3. Large rounded cards.
4. High-contrast text.
5. Button states must be obvious.
6. Host screens must support TV readability.
7. Player screens must be thumb-friendly.
8. Avoid clutter and tiny labels.

## 13.2 Typography

Requirements:

1. Use a modern sans-serif font.
2. Use large display text for room codes, round reveals, and results.
3. Avoid overly decorative fonts for body text.
4. Host screen font sizes must be larger than player screen font sizes.

Recommended pairing:

1. Headings: bold geometric sans-serif.
2. Body: clean readable sans-serif.
3. Room code: bold monospace or block-style display.

## 13.3 Buttons

Button types:

1. Primary action.
2. Secondary action.
3. Danger action.
4. Disabled action.
5. Vote option button.
6. Ready toggle button.

Button requirements:

1. Minimum tap target: 44px height.
2. Primary button must have strong blue/cyan gradient or solid electric blue.
3. Disabled button must clearly appear disabled.
4. Vote selection must have selected state before confirmation.
5. Buttons must work on mobile browsers.

## 13.4 Host Screen UX

Host screen must prioritize:

1. Visibility from distance.
2. Large room code.
3. Clear state transitions.
4. Minimal input after setup.
5. Dramatic reveal moments.
6. Readable answer cards.
7. Strong scoreboard moments.

## 13.5 Player Screen UX

Player screen must prioritize:

1. Fast input.
2. No unnecessary text.
3. Clear prompt visibility.
4. Simple answer entry.
5. Large voting buttons.
6. Waiting states that explain what is happening.
7. No hidden dependency on desktop controls.

## 13.6 Animation Requirements

Use lightweight animations only.

Recommended animations:

1. Button hover/tap scale.
2. Answer card reveal stagger.
3. Countdown pulse.
4. Vote result bar growth.
5. Score increase pop.
6. Final winner glow.

Avoid:

1. Heavy 3D.
2. Continuous particle effects that reduce performance.
3. Complex animation libraries before the core game works.

## 13.7 Sound Requirements

Sound is optional for MVP but should be architected later.

Potential sound events:

1. Room created.
2. Player joined.
3. Countdown tick.
4. Answer reveal.
5. Vote locked.
6. Off-Prompt reveal.
7. Final winner.

Requirement if added:

1. Sound must be muted by default or easily controllable.
2. Host screen controls sound.
3. Mobile browsers may block autoplay; do not rely on sound for gameplay.

---

## 14. Error Handling Requirements

## 14.1 User-Facing Error Principles

Errors must be short, clear, and actionable.

Bad:

```text
Socket exception: invalid namespace state
```

Good:

```text
Room not found. Check the code and try again.
```

## 14.2 Required Error Cases

| Error Case | Message |
|---|---|
| Invalid room code | Room not found. Check the code and try again. |
| Room full | This room is already full. |
| Duplicate name | This name is already taken in this room. |
| Game already started | This game has already started. |
| Host disconnected | Host disconnected. Waiting for host to return. |
| Player disconnected | Player disconnected. Waiting or continuing based on game state. |
| Submit answer failed | Could not submit answer. Try again. |
| Submit vote failed | Could not submit vote. Try again. |
| Server unavailable | Connection lost. Reconnecting... |

## 14.3 Recovery Requirements

1. Socket reconnection should be attempted automatically.
2. Player should not lose name/room immediately after refresh.
3. Local storage may store player session token for rejoin.
4. Host should be able to recover room if browser refreshes within active TTL.

---

## 15. Security and Anti-Cheat Requirements

## 15.1 Core Principle

The server is the only trusted authority.

## 15.2 Requirements

1. Frontend must never receive all prompts.
2. Frontend must never receive all role assignments before reveal.
3. Frontend must never calculate scores authoritatively.
4. Player cannot vote twice.
5. Player cannot submit answer twice.
6. Player cannot join as duplicate name.
7. Player cannot join room beyond configured count.
8. Host-only actions must verify host socket/session.
9. Room codes should not be easily guessable in active sessions.
10. Add rate limiting later if publicly launched.

## 15.3 Known MVP Limitations

Because the game is social and room-code based, a malicious technical user may still inspect their own client traffic. The MVP must prevent obvious cheating by not sending unnecessary hidden data to clients.

---

## 16. Non-Functional Requirements

## 16.1 Performance

| Area | Requirement |
|---|---|
| Host state update | Under 500 ms in normal conditions |
| Player input feedback | Immediate local feedback after click |
| Room size | 3 to 10 players |
| Active rooms | MVP should support small number of concurrent rooms on low-cost server |
| Frontend load | Fast enough for mobile browsers |

## 16.2 Availability

1. MVP can tolerate low-cost hosting limitations.
2. Production V1 should not require developer intervention for normal room cleanup.
3. Health check endpoint required.

## 16.3 Scalability

Initial scalability target:

1. Small private groups.
2. Dozens of simultaneous rooms after optimization.
3. No persistent gameplay storage required.

Future scalability:

1. Redis adapter for Socket.IO if scaling across multiple server instances.
2. Database for prompts, analytics, and admin management.
3. CDN for static frontend assets.

## 16.4 Accessibility

1. All text must have sufficient contrast.
2. Buttons must be keyboard accessible where applicable.
3. Do not rely only on color to communicate status.
4. Use readable font sizes.
5. Error messages should be visible and clear.

## 16.5 Browser Support

Required support:

1. Chrome desktop.
2. Chrome Android.
3. Safari iOS.
4. Edge desktop.
5. Recent mobile browsers.

---

## 17. Testing Requirements

## 17.1 Unit Tests

Test these modules:

1. Room code generation.
2. Room validation.
3. Prompt selection.
4. Prompt rendering.
5. Off-Prompt assignment.
6. Vote calculation.
7. Party Mode scoring.
8. Case Mode win conditions.
9. Room cleanup.

## 17.2 Manual Multiplayer Test Cases

### Test Case 1: Basic Party Mode

1. Host creates 3-player room.
2. Three players join.
3. All ready.
4. Host starts.
5. All receive prompt.
6. All answer.
7. Host reveals answers.
8. Players vote.
9. Result reveals correctly.
10. Score updates.

Expected result: full round completes without refresh or error.

### Test Case 2: Duplicate Name

1. Player A joins as “Tasin”.
2. Player B tries to join as “Tasin”.

Expected result: Player B is rejected with duplicate name error.

### Test Case 3: Room Full

1. Host creates 3-player room.
2. Three players join.
3. Fourth player attempts to join.

Expected result: fourth player is rejected.

### Test Case 4: Player Refresh

1. Player joins lobby.
2. Player refreshes phone browser.
3. Player reconnects.

Expected result: player returns to same room if session token exists.

### Test Case 5: Host Refresh

1. Host creates lobby.
2. Host refreshes.

Expected result: host recovers room or receives clear recovery error.

### Test Case 6: Dynamic Prompt

1. Server selects prompt with `{player}`.
2. Server selects target player.
3. All rendered prompts use same target player name.

Expected result: placeholder is replaced consistently.

## 17.3 Device Testing

Test at minimum:

1. One laptop host + three phone players.
2. One phone host + three phone players.
3. Desktop browser resized to mobile.
4. iPhone Safari if available.
5. Android Chrome if available.

---

## 18. Deployment Requirements

## 18.1 Local Development Commands

Codex should maintain simple commands such as:

```bash
npm install
npm run dev
npm run build
npm start
```

If monorepo uses workspaces:

```bash
npm run dev:client
npm run dev:server
npm run build
npm run start
```

## 18.2 Production Build Behavior

Production server should:

1. Build frontend.
2. Serve frontend static files from backend.
3. Run Express and Socket.IO on same port.
4. Use environment-provided `PORT`.
5. Expose `/health`.
6. Support direct navigation to frontend routes.

## 18.3 Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `NODE_ENV` | development/production | Yes |
| `PORT` | Server port | Yes in production |
| `CLIENT_ORIGIN` | CORS origin | Recommended |
| `ROOM_TTL_MINUTES` | Room expiry duration | Recommended |
| `LOG_LEVEL` | Logging verbosity | Optional |

## 18.4 Cheap Deployment Constraint

The app should be deployable on one low-cost Node service. Avoid requiring separate frontend hosting, backend hosting, Redis, database, object storage, and background workers in the first version.

## 18.5 Deployment Acceptance Criteria

1. Public URL opens landing screen.
2. Host can create room from public URL.
3. Phone can join room from public URL.
4. Real-time updates work over production WebSocket connection.
5. Page refresh does not break routing.
6. `/health` returns success.

---

## 19. File and Folder Structure Requirements

Recommended project structure:

```text
off-prompt/
  OFF_PROMPT_SRS.md
  off-prompt-logo.png
  README.md
  package.json
  client/
    index.html
    package.json
    public/
      logo.png
    src/
      main.tsx
      App.tsx
      routes/
      pages/
        LandingPage.tsx
        HostSetupPage.tsx
        HostLobbyPage.tsx
        HostGamePage.tsx
        JoinPage.tsx
        PlayerLobbyPage.tsx
        PlayerGamePage.tsx
      components/
        Logo.tsx
        Button.tsx
        Card.tsx
        RoomCode.tsx
        PlayerList.tsx
        AnswerCard.tsx
        VoteButton.tsx
        Scoreboard.tsx
        Timer.tsx
      socket/
        socketClient.ts
      styles/
        globals.css
      types/
        clientTypes.ts
  server/
    package.json
    src/
      index.ts
      data/
        promptPairs.json
      game/
        gameTypes.ts
        roomManager.ts
        gameEngine.ts
        partyModeEngine.ts
        caseModeEngine.ts
        scoring.ts
        voting.ts
        roomCode.ts
      prompts/
        promptTypes.ts
        promptSelector.ts
        promptRenderer.ts
        promptValidator.ts
      sockets/
        hostHandlers.ts
        playerHandlers.ts
        socketTypes.ts
      utils/
        logger.ts
        time.ts
        validation.ts
      tests/
        promptSelector.test.ts
        gameEngine.test.ts
  docs/
    codex-next-prompt.md
    deployment-guide.md
```

---

## 20. Implementation Phasing

## 20.1 Phase 0: Repository Readiness

Deliverables:

1. Clean root structure.
2. SRS in root.
3. Logo in root.
4. Prompt pairs JSON present.
5. README present.
6. Codex instructions present.

## 20.2 Phase 1: Technical Foundation

Deliverables:

1. React + Vite + TypeScript frontend.
2. Express + Socket.IO + TypeScript backend.
3. Shared or duplicated type definitions with strict consistency.
4. Local dev scripts.
5. Health check.
6. Basic landing page.

## 20.3 Phase 2: Room and Lobby

Deliverables:

1. Host creates room.
2. Room code generated.
3. Players join.
4. Ready system.
5. Host starts game.
6. Basic validation.

## 20.4 Phase 3: Party Mode Core

Deliverables:

1. Prompt selection.
2. Off-Prompt assignment.
3. Private prompt delivery.
4. Answer submission.
5. Answer reveal.
6. Voting.
7. Result reveal.
8. Score update.
9. Next round.
10. Final scoreboard.

## 20.5 Phase 4: UX Polish

Deliverables:

1. Logo integration.
2. Full brand styling.
3. Host screen polish.
4. Mobile screen polish.
5. Animations.
6. QR code.
7. Copy link.
8. Better loading and error states.

## 20.6 Phase 5: Stability

Deliverables:

1. Reconnection support.
2. Room expiry.
3. Defensive error handling.
4. Manual multiplayer test pass.
5. Unit tests for core game logic.

## 20.7 Phase 6: Production Deployment

Deliverables:

1. Production build.
2. Single-service deployment readiness.
3. Deployment guide.
4. Environment variable documentation.
5. Health check verified.
6. Public test room verified.

## 20.8 Phase 7: Case Mode

Deliverables:

1. Criminal assignment.
2. Elimination.
3. Win conditions.
4. Case Mode UI.
5. Final team reveal.

---

## 21. Codex Working Instructions

Codex should follow this SRS as the main source of truth.

### 21.1 Rules for Codex

1. Do not rewrite the architecture unless a blocker is found.
2. Build incrementally.
3. Keep code readable.
4. Do not add unnecessary services.
5. Do not add authentication unless explicitly requested.
6. Do not add AI features.
7. Keep real-time game state server-side.
8. Do not expose hidden prompts or roles to clients.
9. Use TypeScript types consistently.
10. Update README whenever setup commands change.
11. Add comments only where logic is non-obvious.
12. Prefer working gameplay over decorative complexity.
13. Preserve the logo and prompt data files.
14. Ask before deleting or replacing existing content files.

### 21.2 Codex Should Prioritize

1. Working local multiplayer.
2. Correct game state transitions.
3. Private prompt delivery.
4. Stable Socket.IO events.
5. Clean mobile UI.
6. Host screen readability.
7. Deployment simplicity.

### 21.3 Codex Should Not Prioritize Yet

1. User accounts.
2. Payment.
3. Admin dashboard.
4. Advanced analytics.
5. AI prompt generation.
6. Native mobile app.
7. Complex sound system.
8. Multiple backend instances.

---

## 22. Definition of Done for MVP

The MVP is complete when:

1. A host can open the public URL and create a Party Mode room.
2. 3 to 10 players can join from phones.
3. Players can ready up.
4. Host can start the game.
5. Each player receives only their assigned private prompt.
6. Players submit answers.
7. Host screen reveals answers.
8. Players vote from phones.
9. Host screen reveals vote result and actual Off-Prompt player.
10. Score updates correctly.
11. Multiple rounds work.
12. Final scoreboard works.
13. The game is visually polished enough to show to friends.
14. The app can be deployed cheaply as a single Node service.
15. The README explains how to run and deploy it.

---

## 23. Definition of Done for Production V1

Production V1 is complete when:

1. Party Mode is stable.
2. Case Mode is stable.
3. Reconnection works for normal refresh/disconnect cases.
4. QR join works.
5. Room expiry works.
6. Error states are polished.
7. Mobile UI is tested on Android and iOS browsers.
8. Host screen is tested on laptop/TV projection.
9. Prompt library has at least 100 high-quality prompt pairs.
10. Deployment is documented and reproducible.
11. Basic logs exist for room creation and errors.
12. No hidden prompt/role data is leaked to clients before reveal.
13. The game can be played repeatedly without manual server restart.

---

## 24. Future Feature Backlog

Do not implement these until MVP is stable.

### 24.1 Prompt Packs

1. Family-friendly pack.
2. Friends pack.
3. Couples pack.
4. Office-safe pack.
5. Chaotic adult pack.
6. Bangladesh/Dhaka local pack.
7. Custom prompt pack.

### 24.2 Admin Prompt Manager

1. Add prompt pair.
2. Edit prompt pair.
3. Disable prompt pair.
4. Tag prompt pair.
5. Import/export prompt JSON.

### 24.3 Game Enhancements

1. Custom discussion timer.
2. Anonymous answers mode.
3. Reveal questions after round.
4. Multiple Off-Prompt players.
5. Team mode.
6. “Double Bluff” prompt type.
7. “Everyone is Off-Prompt” rare round.
8. Host-selected prompt pack.

### 24.4 Production Enhancements

1. Database persistence.
2. Analytics dashboard.
3. Error monitoring.
4. Rate limiting.
5. Redis adapter for scaling.
6. Domain setup.
7. Privacy and terms pages.
8. Shareable game recap.

---

## 25. Open Decisions

The following decisions can be finalized later:

| Decision | Default Recommendation |
|---|---|
| Tie in Party Mode | Off-Prompt wins |
| Tie in Case Mode | No elimination |
| Self-voting | Disable |
| Answer editing | Disable after submit |
| Prompt reveal after round | Host-only optional later |
| Sound | Add after visual/gameplay polish |
| Database | Defer until prompt/admin/analytics need appears |
| Authentication | Defer indefinitely unless admin features require it |

---

## 26. Immediate Next Step

The next implementation step is to give Codex PC a single mega prompt that asks it to:

1. Read this SRS from the root directory.
2. Inspect the existing file structure.
3. Preserve the logo and prompt data.
4. Scaffold the React/Vite frontend and Node/Express/Socket.IO backend.
5. Implement the local development foundation.
6. Build the landing page, host setup, room creation, join flow, and lobby.
7. Stop before implementing full round gameplay unless the foundation is stable.

Codex should not attempt to build the whole game in one pass. The correct approach is staged implementation.
