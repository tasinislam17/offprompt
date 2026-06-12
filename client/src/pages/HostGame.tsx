import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Copy,
  Eye,
  Maximize2,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Vote,
  WifiOff,
  Zap,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { HostRoomState, PublicPlayer, RoundResultView } from "@off-prompt/shared";
import { Button } from "../components/shared/Button";
import { Card } from "../components/shared/Card";
import { Logo } from "../components/shared/Logo";
import { PlayerChip } from "../components/shared/PlayerChip";
import { Scoreboard } from "../components/shared/Scoreboard";
import { StatusPill } from "../components/shared/StatusPill";
import { getHostSession } from "../lib/session";
import { emitWithAck, ensureSocketConnected, socket } from "../socket/socketClient";

const ANSWER_REVEAL_COUNTDOWN_SECONDS = 5;
const ANSWER_REVEAL_QUESTION_INTRO_SECONDS = 2;
const HOST_SOUND_KEY = "off-prompt:host-sound";

type SoundKind = "start" | "tick" | "reveal" | "vote" | "result" | "fanfare";

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

function useHostSound() {
  const contextRef = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState(() => localStorage.getItem(HOST_SOUND_KEY) !== "muted");

  const getContext = useCallback(() => {
    const AudioContextCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }
    contextRef.current ??= new AudioContextCtor();
    return contextRef.current;
  }, []);

  const play = useCallback(
    (kind: SoundKind) => {
      if (!enabled) {
        return;
      }

      const context = getContext();
      if (!context) {
        return;
      }

      if (context.state === "suspended") {
        void context.resume();
      }

      const patterns: Record<SoundKind, Array<[number, number, number]>> = {
        start: [
          [392, 0, 0.08],
          [622, 0.08, 0.1],
        ],
        tick: [[840, 0, 0.045]],
        reveal: [
          [523, 0, 0.07],
          [784, 0.08, 0.1],
        ],
        vote: [
          [466, 0, 0.065],
          [698, 0.07, 0.085],
        ],
        result: [
          [330, 0, 0.08],
          [660, 0.09, 0.1],
          [990, 0.18, 0.12],
        ],
        fanfare: [
          [392, 0, 0.08],
          [523, 0.08, 0.1],
          [784, 0.18, 0.14],
          [1046, 0.32, 0.18],
        ],
      };

      const now = context.currentTime;
      patterns[kind].forEach(([frequency, offset, duration]) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = kind === "tick" ? "square" : "sine";
        oscillator.frequency.setValueAtTime(frequency, now + offset);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(kind === "tick" ? 0.026 : 0.052, now + offset + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + duration + 0.03);
      });
    },
    [enabled, getContext]
  );

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      localStorage.setItem(HOST_SOUND_KEY, next ? "on" : "muted");
      if (next) {
        window.setTimeout(() => play("start"), 0);
      }
      return next;
    });
  }, [play]);

  return { enabled, play, toggle };
}

function isFinalPartyRound(state: HostRoomState): boolean {
  return (
    state.settings.mode === "party" &&
    state.status === "round_result" &&
    Boolean(state.currentRound?.result) &&
    (state.currentRound?.roundNumber ?? 0) >= state.settings.rounds
  );
}

function finalTitle(state: HostRoomState): string {
  if (state.settings.mode === "case") {
    return state.finalResult?.winningTeam === "criminals" ? "Criminals Win" : "Civilians Win";
  }
  const winnerScore = Math.max(...state.players.map((player) => player.score));
  const winners = state.players.filter((player) => player.score === winnerScore).map((player) => player.name);
  return winners.length > 1 ? "Shared Victory" : `${winners[0] ?? "Winner"} Wins`;
}

function resultTitle(state: HostRoomState, result: RoundResultView): string {
  if (state.settings.mode === "party") {
    return result.outcome === "onPromptCaught" ? "On-Prompt Team Wins" : "Off-Prompt Escaped";
  }
  if (result.winningTeam === "criminals") return "Criminals Win";
  if (result.winningTeam === "civilians") return "Civilians Win";
  if (result.outcome === "caseTie") return "Vote Tied";
  if (result.outcome === "caseNoVotes") return "No Elimination";
  return "Player Eliminated";
}

function pointsAwardedText(state: HostRoomState, result: RoundResultView): string {
  if (state.settings.mode === "party") {
    return result.outcome === "onPromptCaught" ? "On-Prompt players +1" : "Off-Prompt +1";
  }
  const eliminatedName = result.eliminatedPlayerId
    ? state.players.find((player) => player.id === result.eliminatedPlayerId)?.name
    : null;
  return eliminatedName ? `${eliminatedName} was eliminated` : "No one was eliminated";
}

function PublicPromptCard({ prompt }: { prompt: string | null }) {
  if (!prompt) {
    return null;
  }

  return (
    <div className="animate-panel-in rounded-lg border border-brand-cyan/35 bg-brand-blue/14 p-4 shadow-glow">
      <p className="text-xs font-black uppercase tracking-wide text-brand-cyan">Public question</p>
      <p className="mt-2 text-2xl font-black leading-tight text-white lg:text-3xl">{prompt}</p>
    </div>
  );
}

function SoundToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-brand-cyan/35 bg-white/8 px-3 py-2 text-xs font-black uppercase text-white transition hover:border-brand-cyan hover:bg-brand-cyan/12"
      aria-label={enabled ? "Mute host sounds" : "Unmute host sounds"}
    >
      {enabled ? <Volume2 className="h-4 w-4 text-brand-cyan" /> : <VolumeX className="h-4 w-4 text-brand-muted" />}
      <span className="hidden sm:inline">{enabled ? "Sound on" : "Muted"}</span>
    </button>
  );
}

function PhaseBanner({
  eyebrow,
  title,
  body,
  icon,
}: {
  eyebrow: string;
  title: string;
  body: string;
  icon: ReactNode;
}) {
  return (
    <div className="phase-banner rounded-lg p-4 md:p-5">
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-brand-cyan/35 bg-brand-blue/28 text-brand-cyan shadow-glow">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-brand-cyan">{eyebrow}</p>
          <h1 className="mt-1 font-display text-3xl font-black leading-none text-white md:text-4xl">{title}</h1>
          <p className="mt-2 text-base font-semibold text-brand-muted">{body}</p>
        </div>
      </div>
    </div>
  );
}

const CONFETTI_COLORS = ["#3ef9ff", "#8f54fd", "#0c42fd", "#f8d54a", "#ffffff"];

function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return (
    <div className="confetti-field" aria-hidden="true">
      {Array.from({ length: 28 }).map((_, index) => {
        const style = {
          "--x": `${(index * 37) % 100}%`,
          "--c": CONFETTI_COLORS[index % CONFETTI_COLORS.length],
          "--r": `${(index * 29) % 180}deg`,
          "--d": `${2.5 + (index % 5) * 0.3}s`,
          "--delay": `${(index % 9) * 0.16}s`,
        } as CSSProperties;
        return <span key={index} className="confetti-piece" style={style} />;
      })}
    </div>
  );
}

function PromptRevealPanel({ publicPrompt, offPrompt }: { publicPrompt: string | null; offPrompt: string | null }) {
  if (!publicPrompt && !offPrompt) {
    return null;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {publicPrompt && (
        <div className="rounded-lg border border-brand-cyan/35 bg-brand-blue/14 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-brand-cyan">On-prompt question</p>
          <p className="mt-2 text-xl font-black leading-tight text-white">{publicPrompt}</p>
        </div>
      )}
      {offPrompt && (
        <div className="rounded-lg border border-brand-purple/45 bg-brand-purple/14 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-brand-purple">Off-prompt question</p>
          <p className="mt-2 text-xl font-black leading-tight text-white">{offPrompt}</p>
        </div>
      )}
    </div>
  );
}

function RoundProgressRoster({
  players,
  completedPlayerIds,
  completeLabel,
  pendingLabel,
}: {
  players: PublicPlayer[];
  completedPlayerIds: string[];
  completeLabel: string;
  pendingLabel: string;
}) {
  const completed = new Set(completedPlayerIds);
  const activePlayers = players.filter((player) => !player.isEliminated);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {activePlayers.map((player) => {
        const isComplete = completed.has(player.id);
        return (
          <PlayerChip
            key={player.id}
            player={player}
            large
            activityStatus={isComplete ? "complete" : "pending"}
            activityLabel={isComplete ? completeLabel : pendingLabel}
          />
        );
      })}
    </div>
  );
}

function VoteBreakdown({ result }: { result: RoundResultView }) {
  const maxVotes = Math.max(1, ...result.voteBreakdown.map((item) => item.voteCount));
  const voteRows = result.voteBreakdown.flatMap((item) =>
    item.voterNames.map((voterName) => ({
      voterName,
      targetName: item.playerName,
    }))
  );

  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_0.86fr]">
      <div className="space-y-2">
        {result.voteBreakdown.map((item) => (
          <div key={item.playerId} className="rounded-lg border border-white/10 bg-white/7 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-white">{item.playerName}</p>
                <p className="text-sm font-semibold text-brand-muted">
                  {item.voteCount} vote{item.voteCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.isOffPrompt && <StatusPill label="Off Prompt" tone="purple" />}
                {item.wasEliminated && <StatusPill label="Eliminated" tone="danger" />}
              </div>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full origin-left animate-bar-grow rounded-full bg-gradient-to-r from-brand-purple to-brand-cyan"
                style={{ width: `${Math.max(5, (item.voteCount / maxVotes) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-white/10 bg-white/7 p-3">
        <p className="mb-2 text-xs font-black uppercase text-brand-cyan">Vote trail</p>
        <div className="space-y-2">
          {voteRows.length > 0 ? (
            voteRows.map((item, index) => (
              <div key={`${item.voterName}-${item.targetName}-${index}`} className="rounded-md bg-white/7 px-3 py-2 text-sm font-bold text-white">
                <span className="text-brand-cyan">{item.voterName}</span>
                <span className="text-brand-muted"> voted for </span>
                {item.targetName}
              </div>
            ))
          ) : (
            <p className="text-sm font-semibold text-brand-muted">No votes were locked.</p>
          )}
        </div>
      </div>
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
      <Card className="party-card space-y-5">
        <PhaseBanner
          eyebrow={`Round ${round.roundNumber} - Answering`}
          title="Answers incoming"
          body="Phones are locking in. Watch the room for suspicious confidence."
          icon={<Zap className="h-6 w-6" />}
        />
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl font-black text-white">Answer status</h2>
          <StatusPill label="Green means locked" tone="success" />
        </div>
        <RoundProgressRoster
          players={state.players}
          completedPlayerIds={round.answeredPlayerIds}
          completeLabel="Answered"
          pendingLabel="Waiting"
        />
      </Card>
    </div>
  );
}

function DiscussionView({
  state,
  countdown,
  isQuestionIntro,
  onStartVoting,
}: {
  state: HostRoomState;
  countdown: number;
  isQuestionIntro: boolean;
  onStartVoting: () => void;
}) {
  const round = state.currentRound;
  if (!round) {
    return null;
  }

  if (isQuestionIntro || countdown > 0) {
    return (
      <Card className="party-card grid min-h-[62vh] place-items-center overflow-hidden">
        <div className="w-full max-w-5xl space-y-5 text-center">
          <div className="phase-banner rounded-lg p-4 text-center md:p-5">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-brand-cyan/35 bg-brand-blue/28 text-brand-cyan shadow-glow">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="mt-3 text-xs font-black uppercase tracking-wide text-brand-cyan">
              {isQuestionIntro ? "Public question unlocked" : "Reveal sequence"}
            </p>
            <h1 className="mt-1 font-display text-3xl font-black leading-none text-white md:text-4xl">
              {isQuestionIntro ? "Read this first" : "Answers are about to hit"}
            </h1>
            <p className="mt-2 text-base font-semibold text-brand-muted">
              {isQuestionIntro
                ? "Everyone gets the on-prompt question before the board drops."
                : "Keep this question in mind while the answers land."}
            </p>
          </div>
          <PublicPromptCard prompt={round.publicPrompt} />
          {isQuestionIntro ? (
            <div className="mx-auto max-w-md rounded-lg border border-white/10 bg-white/7 p-4">
              <p className="text-sm font-black uppercase tracking-wide text-brand-cyan">Countdown starts next</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/3 animate-pulse-soft rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan" />
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-black uppercase text-brand-cyan">Answers reveal in</p>
              <p key={countdown} className="countdown-pop host-code font-display text-[10rem] font-black leading-none text-white md:text-[12rem]">
                {countdown}
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[min(100%,36rem)] flex-1">
          <PhaseBanner
            eyebrow={`Round ${round.roundNumber} - Discussion`}
            title="Read the room"
            body="Only the public question is on screen. The Off-Prompt question stays hidden until the result."
            icon={<Eye className="h-6 w-6" />}
          />
        </div>
        <Button size="lg" icon={<Vote className="h-5 w-5" />} onClick={onStartVoting}>
          Start Voting
        </Button>
      </div>

      <PublicPromptCard prompt={round.publicPrompt} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {round.answers.map((answer, index) => (
          <div
            key={answer.playerId}
            className="party-card animate-panel-in rounded-lg border border-white/12 bg-white/8 p-4 shadow-blue"
            style={{ animationDelay: `${index * 95}ms` }}
          >
            <p className="text-sm font-black uppercase text-brand-cyan">{answer.playerName}</p>
            <p className="mt-3 text-2xl font-black leading-tight text-white md:text-3xl">{answer.answer}</p>
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
      <Card className="party-card space-y-5">
        <PhaseBanner
          eyebrow="Voting is live"
          title={`Who was ${state.settings.mode === "case" ? "suspicious" : "Off Prompt"}?`}
          body="Phones decide. Green outlines mean a player has locked their vote."
          icon={<Vote className="h-6 w-6" />}
        />
        <PublicPromptCard prompt={round.publicPrompt} />
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
        <div className="rounded-lg border border-white/10 bg-white/7 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-black text-white">Vote status</h2>
            <StatusPill label="Green means voted" tone="success" />
          </div>
          <RoundProgressRoster
            players={state.players}
            completedPlayerIds={round.votedPlayerIds}
            completeLabel="Voted"
            pendingLabel="Waiting"
          />
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-3xl font-black text-white">Answer board</h2>
        <div className="grid gap-3">
          {round.answers.map((answer) => (
            <div key={answer.playerId} className="party-card rounded-lg border border-white/10 bg-white/7 p-4">
              <p className="text-sm font-black uppercase text-brand-cyan">{answer.playerName}</p>
              <p className="mt-2 text-xl font-black text-white">{answer.answer}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ResultView({
  state,
  onNextRound,
  onRevealFinalWinner,
}: {
  state: HostRoomState;
  onNextRound: () => void;
  onRevealFinalWinner: () => void;
}) {
  const result = state.currentRound?.result ?? state.finalResult;
  if (!result) {
    return null;
  }

  const offPromptNames = result.offPromptPlayerIds
    .map((playerId) => state.players.find((player) => player.id === playerId)?.name)
    .filter(Boolean)
    .join(", ");
  const finalPartyRound = isFinalPartyRound(state);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
      <Card className="relative overflow-hidden space-y-4">
        <ConfettiBurst active />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusPill label={`Round ${result.roundNumber} result`} tone="purple" />
          <StatusPill label={pointsAwardedText(state, result)} tone={state.settings.mode === "party" ? "success" : "blue"} />
        </div>
        <div className="phase-banner rounded-lg p-4">
          <p className="text-xs font-black uppercase tracking-wide text-brand-cyan">Round reveal</p>
          <h1 className="font-display text-4xl font-black text-white md:text-5xl">{resultTitle(state, result)}</h1>
          <p className="mt-3 text-lg font-bold text-brand-muted">{result.outcomeText}</p>
        </div>
        <PromptRevealPanel
          publicPrompt={state.currentRound?.publicPrompt ?? null}
          offPrompt={state.currentRound?.offPrompt ?? null}
        />
        {offPromptNames && state.settings.mode === "party" && (
          <div className="rounded-lg border border-brand-purple/45 bg-brand-purple/14 p-4">
            <p className="text-sm font-black uppercase text-brand-cyan">Off Prompt</p>
            <p className="mt-2 font-display text-3xl font-black text-white">{offPromptNames}</p>
          </div>
        )}
        {result.criminalPlayerIds.length > 0 && (
          <div className="rounded-lg border border-danger/45 bg-danger/12 p-4">
            <p className="text-sm font-black uppercase text-danger">Criminals</p>
            <p className="mt-2 font-display text-3xl font-black text-white">
              {result.criminalPlayerIds
                .map((playerId) => state.players.find((player) => player.id === playerId)?.name)
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        )}
        <VoteBreakdown result={result} />
        {state.status !== "game_over" && (
          <Button
            size="lg"
            className="w-full"
            icon={finalPartyRound ? <Trophy className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            onClick={finalPartyRound ? onRevealFinalWinner : onNextRound}
          >
            {finalPartyRound ? "Reveal Final Winner" : "Next Round"}
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
      <Card className="relative grid place-items-center overflow-hidden text-center">
        <ConfettiBurst active />
        <div className="max-w-3xl space-y-5 py-8">
          <Trophy className="mx-auto h-16 w-16 countdown-pop text-warning" />
          <StatusPill label="Final result" tone="success" />
          <h1 className="font-display text-5xl font-black text-white md:text-7xl">{finalTitle(state)}</h1>
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
  const { enabled: soundEnabled, play: playSound, toggle: toggleSound } = useHostSound();

  const revealedAt = state?.currentRound?.revealedAt;
  const revealElapsedSeconds =
    revealedAt && state.currentRound?.status === "discussion" ? (Date.now() - revealedAt) / 1000 : null;
  const isRevealQuestionIntro =
    revealElapsedSeconds !== null && revealElapsedSeconds < ANSWER_REVEAL_QUESTION_INTRO_SECONDS;
  const revealCountdown =
    revealElapsedSeconds !== null
      ? Math.max(
          0,
          ANSWER_REVEAL_COUNTDOWN_SECONDS -
            Math.floor(Math.max(0, revealElapsedSeconds - ANSWER_REVEAL_QUESTION_INTRO_SECONDS))
        )
      : 0;
  useTicker(isRevealQuestionIntro || revealCountdown > 0);

  const joinUrl = useMemo(() => `${window.location.origin}/join?room=${roomCode}`, [roomCode]);

  useEffect(() => {
    if (!isRevealQuestionIntro && revealCountdown > 0) {
      playSound("tick");
    }
  }, [isRevealQuestionIntro, playSound, revealCountdown]);

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

  async function hostAction<T>(event: string, extra: Record<string, unknown> = {}, sound?: SoundKind) {
    if (!session) {
      return;
    }
    if (sound) {
      playSound(sound);
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
      <main className="app-bg energy-shell grid min-h-screen place-items-center px-4 text-white">
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
      <main className="app-bg energy-shell grid min-h-screen place-items-center px-4 text-white">
        <Card className="text-center">
          <Logo size="md" className="justify-center" />
          <p className="mt-5 animate-pulse-soft font-display text-3xl font-black text-white">Recovering room...</p>
          {error && <p className="mt-3 font-semibold text-danger">{error}</p>}
        </Card>
      </main>
    );
  }

  return (
    <main className="app-bg energy-shell min-h-screen px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            {copied && <StatusPill label="Copied" tone="success" />}
            {!state.hostConnected && <StatusPill label="Host disconnected" tone="warning" />}
            <StatusPill label={state.status.replace("_", " ")} tone={state.status === "game_over" ? "success" : "blue"} />
            <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
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
            onStart={() => hostAction("host:startGame", {}, "start")}
            onCopy={copyJoinLink}
            onFullscreen={requestFullscreen}
          />
        )}

        {state.status === "answering" && (
          <AnsweringView state={state} onReveal={(force) => hostAction("host:revealAnswers", { force }, "reveal")} />
        )}
        {state.status === "discussion" && (
          <DiscussionView
            state={state}
            countdown={revealCountdown}
            isQuestionIntro={isRevealQuestionIntro}
            onStartVoting={() => hostAction("host:startVoting", {}, "vote")}
          />
        )}
        {state.status === "voting" && <VotingView state={state} onEndVoting={() => hostAction("host:endVoting", {}, "result")} />}
        {state.status === "round_result" && (
          <ResultView
            state={state}
            onNextRound={() => hostAction("host:nextRound", {}, "start")}
            onRevealFinalWinner={() => hostAction("host:revealFinalWinner", {}, "fanfare")}
          />
        )}
        {state.status === "game_over" && <GameOverView state={state} onRestart={() => hostAction("host:restartGame", {}, "start")} />}
      </div>
    </main>
  );
}
