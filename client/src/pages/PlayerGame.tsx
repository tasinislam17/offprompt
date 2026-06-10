import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Home, RefreshCw, Send, Shield, Vote } from "lucide-react";
import type { PlayerRoomState, PublicPlayer } from "@off-prompt/shared";
import { Button } from "../components/shared/Button";
import { Card } from "../components/shared/Card";
import { Logo } from "../components/shared/Logo";
import { PlayerChip } from "../components/shared/PlayerChip";
import { Scoreboard } from "../components/shared/Scoreboard";
import { StatusPill } from "../components/shared/StatusPill";
import { clearPlayerSession, getPlayerSession } from "../lib/session";
import { emitWithAck, ensureSocketConnected, socket } from "../socket/socketClient";

type SyncStatus = "syncing" | "live" | "offline" | "stale";

function syncLabel(status: SyncStatus): string {
  if (status === "syncing") return "Syncing";
  if (status === "live") return "Live";
  if (status === "offline") return "Offline";
  return "Tap to sync";
}

function syncTone(status: SyncStatus): "success" | "warning" | "danger" | "blue" {
  if (status === "live") return "success";
  if (status === "syncing") return "blue";
  if (status === "offline") return "danger";
  return "warning";
}

function playerResultTitle(state: PlayerRoomState): string {
  const result = state.currentRound?.result ?? state.finalResult;
  if (!result) {
    return "Result";
  }
  if (state.settings.mode === "party") {
    return result.outcome === "onPromptCaught" ? "On-Prompt Team Wins" : "Off-Prompt Escaped";
  }
  if (result.winningTeam === "criminals") return "Criminals Win";
  if (result.winningTeam === "civilians") return "Civilians Win";
  if (result.outcome === "caseTie") return "Vote Tied";
  if (result.outcome === "caseNoVotes") return "No Elimination";
  return "Player Eliminated";
}

function PlayerList({ players }: { players: PublicPlayer[] }) {
  return (
    <div className="grid gap-2">
      {players.map((player) => (
        <PlayerChip key={player.id} player={player} />
      ))}
    </div>
  );
}

function LobbyPlayerView({
  state,
  onReady,
  onLeave,
}: {
  state: PlayerRoomState;
  onReady: (ready: boolean) => void;
  onLeave: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="space-y-4 text-center">
        <StatusPill label={`Room ${state.roomCode}`} tone="blue" />
        <h1 className="font-display text-4xl font-black text-white">Lobby</h1>
        <p className="font-semibold text-brand-muted">
          {state.players.length}/{state.settings.playerCount} players joined
        </p>
        <Button
          size="lg"
          className="w-full"
          variant={state.player.isReady ? "secondary" : "primary"}
          icon={<CheckCircle2 className="h-5 w-5" />}
          onClick={() => onReady(!state.player.isReady)}
        >
          {state.player.isReady ? "Ready" : "Mark Ready"}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onLeave}>
          Leave Room
        </Button>
      </Card>
      <Card className="space-y-3">
        <h2 className="font-display text-2xl font-black text-white">Players</h2>
        <PlayerList players={state.players} />
      </Card>
    </div>
  );
}

function PromptView({
  state,
  answer,
  setAnswer,
  onSubmit,
}: {
  state: PlayerRoomState;
  answer: string;
  setAnswer: (value: string) => void;
  onSubmit: () => void;
}) {
  const round = state.currentRound;
  if (!round) {
    return null;
  }

  if (!round.isParticipant || state.isSpectator) {
    return (
      <Card className="space-y-4 text-center">
        <StatusPill label="Spectator" tone="warning" />
        <h1 className="font-display text-3xl font-black text-white">Watch the room</h1>
        <p className="font-semibold text-brand-muted">You are out of the active case, but the table still needs your poker face.</p>
      </Card>
    );
  }

  if (round.answerSubmitted) {
    return (
      <Card className="space-y-4 text-center">
        <StatusPill label={`Round ${round.roundNumber}`} tone="success" />
        <h1 className="font-display text-4xl font-black text-white">Answer locked</h1>
        <p className="font-semibold text-brand-muted">Keep it casual while everyone else finishes.</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <StatusPill label={`Round ${round.roundNumber}`} tone="blue" />
      <div className="rounded-lg border border-brand-cyan/35 bg-brand-blue/14 p-5">
        <p className="text-xs font-black uppercase text-brand-cyan">Private prompt</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-white">{round.privatePrompt}</h1>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-brand-muted">Your answer</span>
        <textarea
          value={answer}
          onChange={(event) => setAnswer(event.target.value.slice(0, 80))}
          rows={4}
          inputMode={round.answerFormat === "number" ? "numeric" : "text"}
          className="w-full resize-none rounded-lg border border-white/12 bg-white/8 p-4 text-xl font-bold text-white outline-none transition placeholder:text-brand-muted/60 focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/30"
          placeholder={round.answerFormat === "number" ? "A number" : "Say it naturally"}
        />
        <span className="mt-2 block text-right text-sm font-bold text-brand-muted">{answer.length}/80</span>
      </label>
      <Button size="lg" className="w-full" icon={<Send className="h-5 w-5" />} disabled={!answer.trim()} onClick={onSubmit}>
        Submit Answer
      </Button>
    </Card>
  );
}

function WaitingView({ title, body }: { title: string; body: string }) {
  return (
    <Card className="space-y-4 text-center">
      <div className="mx-auto h-3 w-24 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/2 animate-pulse-soft rounded-full bg-brand-cyan" />
      </div>
      <h1 className="font-display text-4xl font-black text-white">{title}</h1>
      <p className="font-semibold text-brand-muted">{body}</p>
    </Card>
  );
}

function VotingPlayerView({
  state,
  selectedTarget,
  setSelectedTarget,
  onVote,
}: {
  state: PlayerRoomState;
  selectedTarget: string | null;
  setSelectedTarget: (playerId: string) => void;
  onVote: () => void;
}) {
  const round = state.currentRound;
  if (!round) {
    return null;
  }

  if (state.isSpectator || !round.isParticipant) {
    return <WaitingView title="Spectating" body="The active players are voting." />;
  }

  if (round.voteSubmitted) {
    return <WaitingView title="Vote locked" body="Watch the host screen for the reveal." />;
  }

  return (
    <Card className="space-y-4">
      <StatusPill label="Vote" tone="warning" />
      <h1 className="font-display text-4xl font-black text-white">
        {state.settings.mode === "case" ? "Who should be eliminated?" : "Who was Off Prompt?"}
      </h1>
      <div className="grid gap-2">
        {round.eligibleVoteTargets.map((player) => (
          <button
            key={player.id}
            type="button"
            onClick={() => setSelectedTarget(player.id)}
            className={`min-h-16 rounded-lg border p-4 text-left transition ${
              selectedTarget === player.id
                ? "border-brand-cyan bg-brand-blue/20 shadow-glow"
                : "border-white/10 bg-white/7 hover:border-brand-cyan/50"
            }`}
          >
            <p className="text-lg font-black text-white">{player.name}</p>
            <p className="text-sm font-semibold text-brand-muted">{player.score} pts</p>
          </button>
        ))}
      </div>
      <Button size="lg" className="w-full" icon={<Vote className="h-5 w-5" />} disabled={!selectedTarget} onClick={onVote}>
        Lock Vote
      </Button>
    </Card>
  );
}

function ResultPlayerView({ state }: { state: PlayerRoomState }) {
  const result = state.currentRound?.result ?? state.finalResult;
  if (!result) {
    return null;
  }
  const finalPartyRound =
    state.settings.mode === "party" &&
    state.status === "round_result" &&
    (state.currentRound?.roundNumber ?? 0) >= state.settings.rounds;

  return (
    <div className="space-y-4">
      <Card className="space-y-4 text-center">
        <StatusPill label="Reveal" tone="purple" />
        <h1 className="font-display text-4xl font-black text-white">{playerResultTitle(state)}</h1>
        <p className="font-semibold text-brand-muted">{result.outcomeText}</p>
        {state.roleReveal && (
          <div className="rounded-lg border border-brand-cyan/35 bg-white/8 p-4">
            <p className="text-sm font-black uppercase text-brand-cyan">You were</p>
            <p className="mt-1 font-display text-3xl font-black capitalize text-white">{state.roleReveal}</p>
          </div>
        )}
      </Card>
      <Scoreboard players={state.players} />
      {state.status !== "game_over" && (
        <WaitingView
          title={finalPartyRound ? "Final reveal soon" : "Next round soon"}
          body={finalPartyRound ? "The host will reveal the overall winner." : "The host will advance when the room is ready."}
        />
      )}
    </div>
  );
}

function FinalPlayerView({ state }: { state: PlayerRoomState }) {
  const winningTeam = state.finalResult?.winningTeam;
  const winnerScore = Math.max(...state.players.map((player) => player.score));
  const winners = state.players.filter((player) => player.score === winnerScore).map((player) => player.name);

  return (
    <div className="space-y-4">
      <Card className="space-y-5 text-center">
        <Shield className="mx-auto h-14 w-14 text-brand-cyan" />
        <StatusPill label="Game over" tone="success" />
        <h1 className="font-display text-5xl font-black text-white">
          {state.settings.mode === "case"
            ? winningTeam === "criminals"
              ? "Criminals Win"
              : "Civilians Win"
            : winners.length > 1
              ? "Shared Victory"
              : `${winners[0] ?? "Winner"} Wins`}
        </h1>
        <p className="font-semibold text-brand-muted">{state.finalResult?.outcomeText ?? "Final scores are in."}</p>
        {state.roleReveal && (
          <div className="rounded-lg border border-white/10 bg-white/8 p-4">
            <p className="text-sm font-black uppercase text-brand-cyan">Your final role</p>
            <p className="mt-1 font-display text-3xl font-black capitalize text-white">{state.roleReveal}</p>
          </div>
        )}
        <Link to="/">
          <Button variant="secondary" className="w-full" icon={<Home className="h-5 w-5" />}>
            Home
          </Button>
        </Link>
      </Card>
      <Scoreboard players={state.players} title="Final board" />
    </div>
  );
}

export default function PlayerGame() {
  const { roomCode = "" } = useParams();
  const navigate = useNavigate();
  const session = useMemo(() => getPlayerSession(roomCode), [roomCode]);
  const [state, setState] = useState<PlayerRoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("syncing");
  const syncInFlight = useRef(false);

  const syncNow = useCallback(async () => {
    if (!session || syncInFlight.current) {
      return;
    }

    syncInFlight.current = true;
    setSyncStatus("syncing");

    try {
      const response = await emitWithAck<PlayerRoomState>("player:rejoin", session);
      if (response.ok) {
        setState(response.data);
        setError(null);
        setSyncStatus("live");
      } else {
        setError(response.error);
        setSyncStatus(socket.connected ? "stale" : "offline");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Connection failed.");
      setSyncStatus(socket.connected ? "stale" : "offline");
    } finally {
      syncInFlight.current = false;
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    function onState(nextState: PlayerRoomState) {
      setState(nextState);
      setError(null);
      setSyncStatus("live");
      if (nextState.currentRound?.status !== "voting") {
        setSelectedTarget(null);
      }
    }

    function onError(payload: { message: string }) {
      setError(payload.message);
      setSyncStatus(socket.connected ? "stale" : "offline");
    }

    function onDisconnect() {
      setSyncStatus("offline");
    }

    function onConnectError() {
      setSyncStatus("offline");
    }

    function onWake() {
      if (!document.hidden) {
        void syncNow();
      }
    }

    socket.on("player:state", onState);
    socket.on("server:error", onError);
    socket.on("connect", syncNow);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.io.on("reconnect", syncNow);
    window.addEventListener("focus", onWake);
    window.addEventListener("pageshow", onWake);
    document.addEventListener("visibilitychange", onWake);

    void ensureSocketConnected()
      .then(syncNow)
      .catch(() => {
        setSyncStatus("offline");
        void syncNow();
      });

    return () => {
      socket.off("player:state", onState);
      socket.off("server:error", onError);
      socket.off("connect", syncNow);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.io.off("reconnect", syncNow);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("pageshow", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [session, syncNow]);

  async function playerAction<T>(event: string, extra: Record<string, unknown> = {}) {
    if (!session) {
      return null;
    }
    const response = await emitWithAck<T>(event, { ...session, ...extra });
    if (!response.ok) {
      setError(response.error);
      return null;
    }
    return response.data;
  }

  async function submitAnswer() {
    await playerAction("player:submitAnswer", { answer });
    setAnswer("");
  }

  async function submitVote() {
    if (!selectedTarget) {
      return;
    }
    await playerAction("player:submitVote", { targetPlayerId: selectedTarget });
  }

  async function leaveRoom() {
    await playerAction("player:leaveRoom");
    clearPlayerSession();
    navigate("/");
  }

  if (!session) {
    return (
      <main className="app-bg grid min-h-screen place-items-center px-4 text-white">
        <Card className="max-w-md space-y-4 text-center">
          <Logo size="md" className="justify-center" />
          <h1 className="font-display text-3xl font-black text-white">Join needed</h1>
          <p className="font-semibold text-brand-muted">Enter the room code and name to connect your phone.</p>
          <Link to={`/join?room=${roomCode}`}>
            <Button className="w-full">Join Room</Button>
          </Link>
        </Card>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="app-bg grid min-h-screen place-items-center px-4 text-white">
        <Card className="space-y-4 text-center">
          <Logo size="md" className="justify-center" />
          <p className="animate-pulse-soft font-display text-3xl font-black text-white">Rejoining...</p>
          <StatusPill label={syncLabel(syncStatus)} tone={syncTone(syncStatus)} />
          {error && <p className="font-semibold text-danger">{error}</p>}
          <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={syncNow}>
            Sync Now
          </Button>
          <Link to={`/join?room=${roomCode}`}>
            <Button variant="secondary">Join Again</Button>
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="app-bg min-h-screen px-4 py-5 text-white">
      <div className="mx-auto max-w-md">
        <header className="mb-5 flex items-center justify-between gap-3">
          <Logo size="sm" showWordmark={false} />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusPill label={syncLabel(syncStatus)} tone={syncTone(syncStatus)} />
            <StatusPill label={state.status.replace("_", " ")} tone={state.status === "game_over" ? "success" : "blue"} />
            <button
              type="button"
              aria-label="Sync player screen"
              onClick={syncNow}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-cyan/35 bg-white/8 text-brand-cyan transition hover:border-brand-cyan hover:bg-brand-cyan/12 disabled:opacity-50"
              disabled={syncStatus === "syncing"}
            >
              <RefreshCw className={`h-4 w-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/40 bg-danger/12 p-3 font-semibold text-danger">
            {error}
          </div>
        )}

        {state.status === "lobby" && (
          <LobbyPlayerView
            state={state}
            onReady={(isReady) => playerAction("player:setReady", { isReady })}
            onLeave={leaveRoom}
          />
        )}
        {state.status === "answering" && (
          <PromptView state={state} answer={answer} setAnswer={setAnswer} onSubmit={submitAnswer} />
        )}
        {state.status === "discussion" && (
          <WaitingView title="Defend that answer" body="The host screen has the board. Talk it out." />
        )}
        {state.status === "voting" && (
          <VotingPlayerView
            state={state}
            selectedTarget={selectedTarget}
            setSelectedTarget={setSelectedTarget}
            onVote={submitVote}
          />
        )}
        {state.status === "round_result" && <ResultPlayerView state={state} />}
        {state.status === "game_over" && <FinalPlayerView state={state} />}

        <div className="mt-5">
          <Link to="/">
            <Button variant="ghost" className="w-full" icon={<ArrowLeft className="h-4 w-4" />}>
              Home
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
