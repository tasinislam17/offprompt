import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Copy,
  Eye,
  Maximize2,
  Play,
  RefreshCw,
  Send,
  Trophy,
  Vote,
  WifiOff,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { HostRoomState, RoundResultView } from "@off-prompt/shared";
import { Button } from "../components/shared/Button";
import { Card } from "../components/shared/Card";
import { Logo } from "../components/shared/Logo";
import { PlayerChip } from "../components/shared/PlayerChip";
import { Scoreboard } from "../components/shared/Scoreboard";
import { StatusPill } from "../components/shared/StatusPill";
import { getHostSession } from "../lib/session";
import { emitWithAck, ensureSocketConnected, socket } from "../socket/socketClient";

function useTicker(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) {
      return;
    }
    const interval = window.setInterval(() => setTick((tick) => tick + 1), 250);
    return () => window.clearInterval(interval);
  }, [active]);
}

function progressPercent(submitted: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((submitted / total) * 100));
}

function finalTitle(state: HostRoomState): string {
  if (state.settings.mode === "case") {
    return state.finalResult?.winningTeam === "criminals" ? "Criminals Win" : "Civilians Win";
  }
  const winnerScore = Math.max(...state.players.map((player) => player.score));
  const winners = state.players.filter((player) => player.score === winnerScore).map((player) => player.name);
  return winners.length > 1 ? "Shared Victory" : `${winners[0] ?? "Winner"} Wins`;
}

function VoteBreakdown({ result }: { result: RoundResultView }) {
  const maxVotes = Math.max(1, ...result.voteBreakdown.map((item) => item.voteCount));

  return (
    <div className="space-y-3">
      {result.voteBreakdown.map((item) => (
        <div key={item.playerId} className="rounded-lg border border-white/10 bg-white/7 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xl font-black text-white">{item.playerName}</p>
              <p className="mt-1 text-sm font-semibold text-brand-muted">
                {item.voteCount} vote{item.voteCount === 1 ? "" : "s"}
                {item.voterNames.length > 0 ? ` from ${item.voterNames.join(", ")}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {item.isOffPrompt && <StatusPill label="Off Prompt" tone="purple" />}
              {item.wasEliminated && <StatusPill label="Eliminated" tone="danger" />}
            </div>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full origin-left animate-bar-grow rounded-full bg-gradient-to-r from-brand-purple to-brand-cyan"
              style={{ width: `${Math.max(4, (item.voteCount / maxVotes) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function LobbyView({
  state,
  joinUrl,
  onStart,
  onCopy,
  onFullscreen,
}: {
  state: HostRoomState;
  joinUrl: string;
  onStart: () => void;
  onCopy: () => void;
  onFullscreen: () => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="scanline flex flex-col items-center justify-center text-center">
        <p className="text-sm font-black uppercase text-brand-cyan">Room code</p>
        <p className="host-code my-3 font-display text-8xl font-black leading-none text-white sm:text-9xl">
          {state.roomCode}
        </p>
        <div className="rounded-lg border border-brand-cyan/35 bg-white p-3 shadow-glow">
          <QRCodeSVG value={joinUrl} size={188} marginSize={1} fgColor="#000537" />
        </div>
        <p className="mt-4 max-w-lg break-all text-sm font-semibold text-brand-muted">{joinUrl}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={onCopy}>
            Copy Link
          </Button>
          <Button variant="secondary" icon={<Maximize2 className="h-4 w-4" />} onClick={onFullscreen}>
            Fullscreen
          </Button>
        </div>
      </Card>

      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <StatusPill label={`${state.settings.mode} mode`} tone="purple" />
            <h1 className="mt-3 font-display text-4xl font-black text-white">Lobby</h1>
          </div>
          <StatusPill
            label={`${state.players.length}/${state.settings.playerCount} joined`}
            tone={state.players.length === state.settings.playerCount ? "success" : "blue"}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {state.players.map((player) => (
            <PlayerChip key={player.id} player={player} large />
          ))}
          {Array.from({ length: Math.max(0, state.settings.playerCount - state.players.length) }).map((_, index) => (
            <div
              key={index}
              className="flex min-h-[88px] items-center justify-center rounded-lg border border-dashed border-white/14 bg-white/5 text-sm font-bold uppercase text-brand-muted"
            >
              Open seat
            </div>
          ))}
        </div>

        <Button size="lg" className="w-full" disabled={!state.canStart} icon={<Play className="h-5 w-5" />} onClick={onStart}>
          Start Game
        </Button>
      </Card>
    </div>
  );
}

function AnsweringView({
  state,
  onReveal,
}: {
  state: HostRoomState;
  onReveal: (force?: boolean) => void;
}) {
  const round = state.currentRound;
  if (!round) {
    return null;
  }
  const percent = progressPercent(round.answerProgress.submitted, round.answerProgress.total);

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="space-y-5">
        <StatusPill label={`Round ${round.roundNumber}`} tone="blue" />
        <h1 className="font-display text-5xl font-black text-white md:text-7xl">Answers incoming</h1>
        <div>
          <div className="mb-3 flex items-end justify-between">
            <p className="text-lg font-bold text-brand-muted">Submission progress</p>
            <p className="font-display text-5xl font-black text-brand-cyan">{percent}%</p>
          </div>
          <div className="h-5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-3 text-xl font-black text-white">
            {round.answerProgress.submitted}/{round.answerProgress.total} submitted
          </p>
        </div>
        {round.answerProgress.disconnectedMissing > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/12 p-4 text-warning">
            <WifiOff className="h-5 w-5" />
            <p className="font-bold">{round.answerProgress.disconnectedMissing} disconnected player waiting on recovery.</p>
          </div>
        )}
        <Button
          size="lg"
          className="w-full"
          disabled={!state.canRevealAnswers && !state.canForceRevealAnswers}
          icon={<Eye className="h-5 w-5" />}
          onClick={() => onReveal(state.canForceRevealAnswers && !state.canRevealAnswers)}
        >
          {state.canRevealAnswers ? "Reveal Answers" : "Reveal Submitted Answers"}
        </Button>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-3xl font-black text-white">Players</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {state.players.map((player) => (
            <PlayerChip key={player.id} player={player} large />
          ))}
        </div>
      </Card>
    </div>
  );
}

function DiscussionView({ state, countdown, onStartVoting }: { state: HostRoomState; countdown: number; onStartVoting: () => void }) {
  const round = state.currentRound;
  if (!round) {
    return null;
  }

  if (countdown > 0) {
    return (
      <Card className="grid min-h-[62vh] place-items-center text-center">
        <div>
          <p className="text-sm font-black uppercase text-brand-cyan">Reveal in</p>
          <p className="host-code font-display text-[12rem] font-black leading-none text-white">{countdown}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <StatusPill label={`Round ${round.roundNumber}`} tone="blue" />
          <h1 className="mt-3 font-display text-5xl font-black text-white">Read the room</h1>
        </div>
        <Button size="lg" icon={<Vote className="h-5 w-5" />} onClick={onStartVoting}>
          Start Voting
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {round.answers.map((answer, index) => (
          <div
            key={answer.playerId}
            className="animate-panel-in rounded-lg border border-white/12 bg-white/8 p-5 shadow-blue"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <p className="text-sm font-black uppercase text-brand-cyan">{answer.playerName}</p>
            <p className="mt-3 text-3xl font-black leading-tight text-white md:text-4xl">{answer.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VotingView({ state, onEndVoting }: { state: HostRoomState; onEndVoting: () => void }) {
  const round = state.currentRound;
  if (!round) {
    return null;
  }
  const percent = progressPercent(round.voteProgress.submitted, round.voteProgress.total);

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="space-y-5">
        <StatusPill label="Vote open" tone="warning" />
        <h1 className="font-display text-5xl font-black text-white md:text-7xl">
          Who was {state.settings.mode === "case" ? "suspicious" : "Off Prompt"}?
        </h1>
        <div>
          <div className="mb-3 flex items-end justify-between">
            <p className="text-lg font-bold text-brand-muted">Vote locks</p>
            <p className="font-display text-5xl font-black text-brand-cyan">{percent}%</p>
          </div>
          <div className="h-5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-cyan transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-3 text-xl font-black text-white">
            {round.voteProgress.submitted}/{round.voteProgress.total} votes locked
          </p>
        </div>
        <Button size="lg" className="w-full" disabled={!state.canEndVoting} onClick={onEndVoting}>
          End Voting Now
        </Button>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-3xl font-black text-white">Answer board</h2>
        <div className="grid gap-3">
          {round.answers.map((answer) => (
            <div key={answer.playerId} className="rounded-lg border border-white/10 bg-white/7 p-4">
              <p className="text-sm font-black uppercase text-brand-cyan">{answer.playerName}</p>
              <p className="mt-2 text-2xl font-black text-white">{answer.answer}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ResultView({ state, onNextRound }: { state: HostRoomState; onNextRound: () => void }) {
  const result = state.currentRound?.result ?? state.finalResult;
  if (!result) {
    return null;
  }

  const offPromptNames = result.offPromptPlayerIds
    .map((playerId) => state.players.find((player) => player.id === playerId)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <Card className="space-y-5">
        <StatusPill label={`Round ${result.roundNumber} result`} tone="purple" />
        <h1 className="font-display text-5xl font-black text-white md:text-7xl">{result.outcomeText}</h1>
        {offPromptNames && state.settings.mode === "party" && (
          <div className="rounded-lg border border-brand-purple/45 bg-brand-purple/14 p-5">
            <p className="text-sm font-black uppercase text-brand-cyan">Off Prompt</p>
            <p className="mt-2 font-display text-4xl font-black text-white">{offPromptNames}</p>
          </div>
        )}
        {result.criminalPlayerIds.length > 0 && (
          <div className="rounded-lg border border-danger/45 bg-danger/12 p-5">
            <p className="text-sm font-black uppercase text-danger">Criminals</p>
            <p className="mt-2 font-display text-4xl font-black text-white">
              {result.criminalPlayerIds
                .map((playerId) => state.players.find((player) => player.id === playerId)?.name)
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        )}
        <VoteBreakdown result={result} />
        {state.status !== "game_over" && (
          <Button size="lg" className="w-full" icon={<Send className="h-5 w-5" />} onClick={onNextRound}>
            Next Round
          </Button>
        )}
      </Card>
      <Scoreboard players={state.players} />
    </div>
  );
}

function GameOverView({ state, onRestart }: { state: HostRoomState; onRestart: () => void }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <Card className="grid place-items-center text-center">
        <div className="max-w-3xl space-y-5 py-8">
          <Trophy className="mx-auto h-16 w-16 text-warning" />
          <StatusPill label="Final result" tone="success" />
          <h1 className="font-display text-6xl font-black text-white md:text-8xl">{finalTitle(state)}</h1>
          <p className="text-xl font-semibold text-brand-muted">{state.finalResult?.outcomeText ?? "Game complete."}</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" icon={<RefreshCw className="h-5 w-5" />} onClick={onRestart}>
              Play Again
            </Button>
            <Link to="/host/setup">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                New Room
              </Button>
            </Link>
          </div>
        </div>
      </Card>
      <Scoreboard players={state.players} title={state.settings.mode === "case" ? "Final table" : "Final scores"} />
    </div>
  );
}

export default function HostGame() {
  const { roomCode = "" } = useParams();
  const navigate = useNavigate();
  const session = useMemo(() => getHostSession(roomCode), [roomCode]);
  const [state, setState] = useState<HostRoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const revealedAt = state?.currentRound?.revealedAt;
  const revealCountdown =
    revealedAt && state.currentRound?.status === "discussion"
      ? Math.max(0, 3 - Math.floor((Date.now() - revealedAt) / 1000))
      : 0;
  useTicker(revealCountdown > 0);

  const joinUrl = useMemo(() => `${window.location.origin}/join?room=${roomCode}`, [roomCode]);

  useEffect(() => {
    if (!session) {
      return;
    }

    function onState(nextState: HostRoomState) {
      setState(nextState);
      setError(null);
    }

    function onError(payload: { message: string }) {
      setError(payload.message);
    }

    socket.on("host:state", onState);
    socket.on("server:error", onError);

    ensureSocketConnected()
      .then(() => emitWithAck<HostRoomState>("host:rejoin", session))
      .then((response) => {
        if (response.ok) {
          setState(response.data);
        } else {
          setError(response.error);
        }
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Connection failed."));

    return () => {
      socket.off("host:state", onState);
      socket.off("server:error", onError);
    };
  }, [session]);

  async function hostAction<T>(event: string, extra: Record<string, unknown> = {}) {
    if (!session) {
      return;
    }
    const response = await emitWithAck<T>(event, { roomCode, hostSessionToken: session.hostSessionToken, ...extra });
    if (!response.ok) {
      setError(response.error);
    }
  }

  async function copyJoinLink() {
    await navigator.clipboard?.writeText(joinUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function requestFullscreen() {
    document.documentElement.requestFullscreen?.();
  }

  if (!session) {
    return (
      <main className="app-bg grid min-h-screen place-items-center px-4 text-white">
        <Card className="max-w-lg space-y-4 text-center">
          <Logo size="md" className="justify-center" />
          <h1 className="font-display text-3xl font-black text-white">Host session not found</h1>
          <p className="font-semibold text-brand-muted">Use the original host browser or create a fresh room.</p>
          <Button onClick={() => navigate("/host/setup")}>Create Room</Button>
        </Card>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="app-bg grid min-h-screen place-items-center px-4 text-white">
        <Card className="text-center">
          <Logo size="md" className="justify-center" />
          <p className="mt-5 animate-pulse-soft font-display text-3xl font-black text-white">Recovering room...</p>
          {error && <p className="mt-3 font-semibold text-danger">{error}</p>}
        </Card>
      </main>
    );
  }

  return (
    <main className="app-bg min-h-screen px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            {copied && <StatusPill label="Copied" tone="success" />}
            {!state.hostConnected && <StatusPill label="Host disconnected" tone="warning" />}
            <StatusPill label={state.status.replace("_", " ")} tone={state.status === "game_over" ? "success" : "blue"} />
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/40 bg-danger/12 p-3 font-semibold text-danger">
            {error}
          </div>
        )}

        {state.status === "lobby" && (
          <LobbyView
            state={state}
            joinUrl={joinUrl}
            onStart={() => hostAction("host:startGame")}
            onCopy={copyJoinLink}
            onFullscreen={requestFullscreen}
          />
        )}

        {state.status === "answering" && <AnsweringView state={state} onReveal={(force) => hostAction("host:revealAnswers", { force })} />}
        {state.status === "discussion" && (
          <DiscussionView state={state} countdown={revealCountdown} onStartVoting={() => hostAction("host:startVoting")} />
        )}
        {state.status === "voting" && <VotingView state={state} onEndVoting={() => hostAction("host:endVoting")} />}
        {state.status === "round_result" && <ResultView state={state} onNextRound={() => hostAction("host:nextRound")} />}
        {state.status === "game_over" && <GameOverView state={state} onRestart={() => hostAction("host:restartGame")} />}
      </div>
    </main>
  );
}
