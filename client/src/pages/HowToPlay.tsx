import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  EyeOff,
  Flame,
  HelpCircle,
  MessageCircle,
  Play,
  RotateCcw,
  ShieldAlert,
  Smartphone,
  Trophy,
  Tv,
  Users,
  Vote,
} from "lucide-react";
import { Button } from "../components/shared/Button";
import { Card } from "../components/shared/Card";
import { Logo } from "../components/shared/Logo";
import { StatusPill } from "../components/shared/StatusPill";

type DemoStep = {
  id: "join" | "prompt" | "answer" | "discuss" | "vote" | "reveal";
  title: string;
  shortTitle: string;
  body: string;
};

const steps: DemoStep[] = [
  {
    id: "join",
    title: "Start a room",
    shortTitle: "Join",
    body: "The host creates a room code. Everyone else joins from a phone.",
  },
  {
    id: "prompt",
    title: "Read your prompt",
    shortTitle: "Prompt",
    body: "Most players see one question. Off-Prompt sees a similar but different one.",
  },
  {
    id: "answer",
    title: "Submit an answer",
    shortTitle: "Answer",
    body: "Answers go in privately. The host screen only reveals answers.",
  },
  {
    id: "discuss",
    title: "Read the room",
    shortTitle: "Discuss",
    body: "Talk it out. The suspicious answer might be obvious, or perfectly innocent.",
  },
  {
    id: "vote",
    title: "Lock your vote",
    shortTitle: "Vote",
    body: "Phones become voting controllers. Pick who you think was Off-Prompt.",
  },
  {
    id: "reveal",
    title: "Reveal the truth",
    shortTitle: "Reveal",
    body: "The host reveals the target, scores the round, and the room gets loud.",
  },
];

const demoAnswers = [
  { name: "Ava", answer: "The friend who says '5 minutes' and arrives in 40." },
  { name: "Ben", answer: "The one with seven alarms and zero shame." },
  { name: "Cal", answer: "Whoever still has 83 unread messages." },
];

function StepIcon({ stepId }: { stepId: DemoStep["id"] }) {
  const className = "h-5 w-5";
  if (stepId === "join") return <Smartphone className={className} />;
  if (stepId === "prompt") return <EyeOff className={className} />;
  if (stepId === "answer") return <Brain className={className} />;
  if (stepId === "discuss") return <MessageCircle className={className} />;
  if (stepId === "vote") return <Vote className={className} />;
  return <Trophy className={className} />;
}

function HostDemo({ activeStep }: { activeStep: DemoStep }) {
  const showAnswers = ["answer", "discuss", "vote", "reveal"].includes(activeStep.id);
  const showVotes = ["vote", "reveal"].includes(activeStep.id);
  const showReveal = activeStep.id === "reveal";

  return (
    <div className="min-w-0 rounded-lg border border-white/12 bg-[#060a22]/90 p-4 shadow-blue">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-brand-cyan">Host screen</p>
          <h3 className="mt-1 font-display text-2xl font-black text-white">
            {activeStep.id === "join" ? "Room K7M2Q" : "Round 1"}
          </h3>
        </div>
        <Tv className="h-8 w-8 text-brand-cyan" />
      </div>

      {activeStep.id === "join" && (
        <div className="grid min-h-[310px] place-items-center text-center">
          <div>
            <p className="host-code font-display text-6xl font-black text-white">K7M2Q</p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {["Ava", "Ben", "Cal"].map((name) => (
                <div key={name} className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm font-black text-white">
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeStep.id === "prompt" && (
        <div className="grid min-h-[310px] place-items-center">
          <div className="w-full rounded-lg border border-brand-purple/40 bg-brand-purple/12 p-5 text-center">
            <EyeOff className="mx-auto h-10 w-10 text-brand-cyan" />
            <p className="mt-3 text-sm font-black uppercase text-brand-cyan">Prompts stay private</p>
            <p className="mt-2 text-2xl font-black text-white">The host never sees the questions.</p>
          </div>
        </div>
      )}

      {showAnswers && (
        <div className="grid min-h-[310px] gap-3">
          {demoAnswers.map((item, index) => (
            <div
              key={`${activeStep.id}-${item.name}`}
              className="animate-panel-in rounded-lg border border-white/10 bg-white/8 p-4"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-brand-cyan">{item.name}</p>
                  <p className="mt-2 text-lg font-black leading-tight text-white">{item.answer}</p>
                </div>
                {showReveal && item.name === "Cal" && <StatusPill label="Off Prompt" tone="purple" />}
              </div>
              {showVotes && (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full origin-left animate-bar-grow rounded-full bg-gradient-to-r from-brand-purple to-brand-cyan"
                    style={{ width: item.name === "Cal" ? "72%" : item.name === "Ben" ? "28%" : "10%" }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PhoneDemo({ activeStep }: { activeStep: DemoStep }) {
  const promptCopy =
    activeStep.id === "prompt"
      ? "How many unread messages does Cal probably have?"
      : "Answer naturally. The room will only see what you write.";

  return (
    <div className="mx-auto w-full max-w-[320px] rounded-[2rem] border border-brand-cyan/25 bg-black/70 p-3 shadow-glow">
      <div className="rounded-[1.45rem] border border-white/10 bg-brand-deep p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-2 w-16 rounded-full bg-white/14" />
          <Smartphone className="h-5 w-5 text-brand-cyan" />
        </div>

        {activeStep.id === "join" && (
          <div className="space-y-4">
            <StatusPill label="Player" tone="blue" />
            <div className="rounded-lg border border-white/10 bg-white/8 p-4 text-center">
              <p className="text-xs font-black uppercase text-brand-muted">Room code</p>
              <p className="mt-2 font-display text-4xl font-black text-white">K7M2Q</p>
            </div>
            <Button className="w-full" size="sm">
              Join Game
            </Button>
          </div>
        )}

        {activeStep.id === "prompt" && (
          <div className="space-y-4">
            <StatusPill label="Private prompt" tone="purple" />
            <div className="rounded-lg border border-brand-cyan/35 bg-brand-blue/14 p-4">
              <p className="text-xl font-black leading-tight text-white">{promptCopy}</p>
            </div>
            <p className="text-sm font-semibold text-brand-muted">Only this phone sees this prompt.</p>
          </div>
        )}

        {activeStep.id === "answer" && (
          <div className="space-y-4">
            <StatusPill label="Answer" tone="blue" />
            <div className="rounded-lg border border-white/10 bg-white/8 p-4">
              <p className="text-lg font-black text-white">83 unread messages</p>
            </div>
            <Button className="w-full" size="sm">
              Submit
            </Button>
          </div>
        )}

        {activeStep.id === "discuss" && (
          <div className="space-y-4 text-center">
            <MessageCircle className="mx-auto h-10 w-10 animate-pulse-soft text-brand-cyan" />
            <h3 className="font-display text-2xl font-black text-white">Talk it out</h3>
            <p className="text-sm font-semibold text-brand-muted">Defend your answer. Notice the weird ones.</p>
          </div>
        )}

        {activeStep.id === "vote" && (
          <div className="space-y-3">
            <StatusPill label="Vote" tone="warning" />
            {["Ava", "Ben", "Cal"].map((name) => (
              <div
                key={name}
                className={`rounded-lg border p-3 font-black ${
                  name === "Cal" ? "border-brand-cyan bg-brand-blue/20 text-white" : "border-white/10 bg-white/7 text-brand-muted"
                }`}
              >
                {name}
              </div>
            ))}
            <Button className="w-full" size="sm">
              Lock Vote
            </Button>
          </div>
        )}

        {activeStep.id === "reveal" && (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h3 className="font-display text-3xl font-black text-white">Caught</h3>
            <p className="font-semibold text-brand-muted">Everyone on prompt scores.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeCard({
  active,
  title,
  body,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  body: string;
  icon: JSX.Element;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-lg border p-4 text-left transition ${
        active ? "border-brand-cyan bg-brand-blue/18 shadow-glow" : "border-white/10 bg-white/7 hover:border-brand-cyan/50"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-display text-2xl font-black text-white">{title}</h3>
        {icon}
      </div>
      <p className="font-semibold leading-relaxed text-brand-muted">{body}</p>
    </button>
  );
}

export default function HowToPlay() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mode, setMode] = useState<"party" | "case">("party");
  const activeStep = steps[activeIndex];

  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % steps.length);
    }, 3600);
    return () => window.clearInterval(interval);
  }, [isPlaying]);

  const modeSummary = useMemo(() => {
    if (mode === "party") {
      return "Party Mode is fast and score-based. The Off-Prompt player changes every round.";
    }
    return "Case Mode keeps the same criminals across rounds. Votes eliminate suspects until one team wins.";
  }, [mode]);

  return (
    <main className="app-bg min-h-screen overflow-x-hidden px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full min-w-0 max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Logo size="sm" />
          <div className="grid w-full min-w-0 max-w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            <Link className="min-w-0" to="/">
              <Button variant="ghost" size="sm" className="w-full sm:w-auto" icon={<ArrowLeft className="h-4 w-4" />}>
                Home
              </Button>
            </Link>
            <Link className="min-w-0" to="/host/setup">
              <Button variant="secondary" size="sm" className="w-full sm:w-auto" icon={<Play className="h-4 w-4" />}>
                Host
              </Button>
            </Link>
          </div>
        </header>

        <section className="grid min-w-0 gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="min-w-0 space-y-5">
            <div>
              <StatusPill label="Learn in 30 seconds" tone="blue" />
              <h1 className="mt-4 font-display text-5xl font-black leading-none text-white md:text-7xl">
                How to play
              </h1>
              <p className="mt-4 max-w-2xl break-words text-xl font-semibold leading-relaxed text-brand-muted">
                Spot who answered the wrong question before they blend into the room.
              </p>
            </div>

            <div className="grid gap-3">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    setActiveIndex(index);
                    setIsPlaying(false);
                  }}
                  className={`group w-full min-w-0 rounded-lg border p-4 text-left transition ${
                    activeStep.id === step.id
                      ? "border-brand-cyan bg-brand-blue/18 shadow-glow"
                      : "border-white/10 bg-white/7 hover:border-brand-cyan/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border ${
                        activeStep.id === step.id
                          ? "border-brand-cyan bg-brand-cyan/15 text-brand-cyan"
                          : "border-white/10 bg-white/7 text-brand-muted group-hover:text-brand-cyan"
                      }`}
                    >
                      <StepIcon stepId={step.id} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-xl font-black text-white">{step.title}</p>
                      <p className="mt-1 font-semibold leading-relaxed text-brand-muted">{step.body}</p>
                    </div>
                    <p className="font-display text-2xl font-black text-brand-cyan">0{index + 1}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 space-y-5">
            <Card className="scanline min-w-0 overflow-hidden p-4 md:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase text-brand-cyan">{activeStep.shortTitle}</p>
                  <h2 className="mt-1 font-display text-3xl font-black text-white md:text-4xl">{activeStep.title}</h2>
                </div>
                <Button
                  variant="secondary"
                  icon={isPlaying ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  onClick={() => setIsPlaying((playing) => !playing)}
                >
                  {isPlaying ? "Pause" : "Play"}
                </Button>
              </div>

              <div className="grid items-center gap-5 xl:grid-cols-[1fr_0.56fr]">
                <HostDemo activeStep={activeStep} />
                <PhoneDemo activeStep={activeStep} />
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <ModeCard
                active={mode === "party"}
                title="Party Mode"
                body="Fixed rounds, rotating Off-Prompt players, no eliminations, final scoreboard."
                icon={<Users className="h-7 w-7 text-brand-cyan" />}
                onClick={() => setMode("party")}
              />
              <ModeCard
                active={mode === "case"}
                title="Case Mode"
                body="Fixed criminals, elimination votes, spectators, team win conditions."
                icon={<ShieldAlert className="h-7 w-7 text-brand-purple" />}
                onClick={() => setMode("case")}
              />
            </div>

            <Card className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <Flame className="mt-1 h-6 w-6 shrink-0 text-warning" />
                <div>
                  <p className="font-display text-2xl font-black text-white">{mode === "party" ? "Casual chaos" : "Long con"}</p>
                  <p className="mt-1 font-semibold leading-relaxed text-brand-muted">{modeSummary}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row md:justify-end">
                <Link to="/host/setup">
                  <Button className="w-full sm:w-auto" icon={<Play className="h-4 w-4" />}>
                    Host Game
                  </Button>
                </Link>
                <Link to="/join">
                  <Button variant="secondary" className="w-full sm:w-auto" icon={<Smartphone className="h-4 w-4" />}>
                    Join Game
                  </Button>
                </Link>
              </div>
            </Card>

            <div className="rounded-lg border border-brand-purple/35 bg-brand-purple/12 p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="mt-1 h-5 w-5 shrink-0 text-brand-cyan" />
                <p className="font-semibold leading-relaxed text-brand-muted">
                  The trick: answers reveal, prompts stay hidden, and the room has to decide which answer came from the wrong question.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
