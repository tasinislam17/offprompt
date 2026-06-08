import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, Minus, Plus, Shield, Users } from "lucide-react";
import type { GameMode, GameSettings, SafeLevel } from "@off-prompt/shared";
import { Button } from "../components/shared/Button";
import { Card } from "../components/shared/Card";
import { PageShell } from "../components/shared/PageShell";
import { StatusPill } from "../components/shared/StatusPill";
import { createClientToken, saveHostSession } from "../lib/session";
import { defaultSettings, maxCriminalCount, maxOffPromptCount, recommendedCriminalCount } from "../lib/settings";
import { emitWithAck } from "../socket/socketClient";

function NumberStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/7 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-bold text-white">{label}</p>
        <p className="font-display text-3xl font-black text-brand-cyan">{value}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          icon={<Minus className="h-4 w-4" />}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Decrease ${label}`}
        />
        <Button
          type="button"
          variant="secondary"
          icon={<Plus className="h-4 w-4" />}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Increase ${label}`}
        />
      </div>
    </div>
  );
}

function DiscussionControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const timedValue = value === 0 ? 90 : value;

  return (
    <div className="rounded-lg border border-white/10 bg-white/7 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-bold text-white">Discussion</p>
        <p className="font-display text-2xl font-black text-brand-cyan">
          {value === 0 ? "Unlimited" : `${value}s`}
        </p>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(0)}
          className={`min-h-11 rounded-lg border px-3 py-2 font-black uppercase transition ${
            value === 0
              ? "border-brand-cyan bg-brand-cyan/14 text-white"
              : "border-white/10 bg-white/7 text-brand-muted hover:border-brand-cyan/50"
          }`}
        >
          Unlimited
        </button>
        <button
          type="button"
          onClick={() => onChange(timedValue)}
          className={`min-h-11 rounded-lg border px-3 py-2 font-black uppercase transition ${
            value !== 0
              ? "border-brand-cyan bg-brand-cyan/14 text-white"
              : "border-white/10 bg-white/7 text-brand-muted hover:border-brand-cyan/50"
          }`}
        >
          Timed
        </button>
      </div>
      {value !== 0 && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="secondary"
            icon={<Minus className="h-4 w-4" />}
            disabled={value <= 30}
            onClick={() => onChange(Math.max(30, value - 30))}
            aria-label="Decrease discussion time"
          />
          <Button
            type="button"
            variant="secondary"
            icon={<Plus className="h-4 w-4" />}
            disabled={value >= 240}
            onClick={() => onChange(Math.min(240, value + 30))}
            aria-label="Increase discussion time"
          />
        </div>
      )}
    </div>
  );
}

export default function HostSetup() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const offPromptMax = maxOffPromptCount(settings.playerCount);
  const criminalMax = maxCriminalCount(settings.playerCount);

  const normalizedSettings = useMemo<GameSettings>(() => {
    const offPromptCount = Math.min(settings.offPromptCount, offPromptMax);
    const criminalCount = Math.min(settings.criminalCount, criminalMax);
    return { ...settings, offPromptCount, criminalCount };
  }, [criminalMax, offPromptMax, settings]);

  function update(partial: Partial<GameSettings>) {
    setSettings((current) => {
      const next = { ...current, ...partial };
      if (partial.playerCount) {
        next.offPromptCount = Math.min(next.offPromptCount, maxOffPromptCount(next.playerCount));
        next.criminalCount = Math.min(
          Math.max(next.criminalCount, recommendedCriminalCount(next.playerCount)),
          maxCriminalCount(next.playerCount)
        );
      }
      return next;
    });
  }

  async function createRoom() {
    setError(null);
    setIsCreating(true);
    const hostSessionToken = createClientToken();
    const response = await emitWithAck<{ roomCode: string; hostSessionToken: string }>("host:createRoom", {
      hostSessionToken,
      settings: normalizedSettings,
    });
    setIsCreating(false);

    if (!response.ok) {
      setError(response.error);
      return;
    }

    saveHostSession({
      roomCode: response.data.roomCode,
      hostSessionToken: response.data.hostSessionToken || hostSessionToken,
    });
    navigate(`/host/${response.data.roomCode}`);
  }

  return (
    <PageShell>
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate("/")}>
            Back
          </Button>
          <Link to="/how-to-play">
            <Button variant="secondary" icon={<HelpCircle className="h-4 w-4" />}>
              How To Play
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.86fr_1.14fr]">
        <Card className="space-y-5">
          <StatusPill label="Host setup" tone="blue" />
          <div>
            <h1 className="font-display text-4xl font-black text-white md:text-5xl">Build the room</h1>
            <p className="mt-3 text-lg font-semibold leading-relaxed text-brand-muted">
              Pick a mode, tune the table size, and launch a room code for the group.
            </p>
          </div>

          <div className="grid gap-3">
            {(["party", "case"] as GameMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => update({ mode })}
                className={`rounded-lg border p-4 text-left transition ${
                  settings.mode === mode
                    ? "border-brand-cyan bg-brand-blue/18 shadow-glow"
                    : "border-white/10 bg-white/7 hover:border-brand-cyan/50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl font-black text-white">
                      {mode === "party" ? "Party Mode" : "Case Mode"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-brand-muted">
                      {mode === "party"
                        ? "Fixed rounds, rotating Off-Prompt players, score-based finish."
                        : "Fixed criminals, elimination votes, team win conditions."}
                    </p>
                  </div>
                  {mode === "case" ? <Shield className="h-7 w-7 text-brand-purple" /> : <Users className="h-7 w-7 text-brand-cyan" />}
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberStepper
              label="Players"
              value={settings.playerCount}
              min={3}
              max={10}
              onChange={(playerCount) => update({ playerCount })}
            />
            {settings.mode === "party" ? (
              <NumberStepper
                label="Off-Prompt"
                value={normalizedSettings.offPromptCount}
                min={1}
                max={offPromptMax}
                onChange={(offPromptCount) => update({ offPromptCount })}
              />
            ) : (
              <NumberStepper
                label="Criminals"
                value={normalizedSettings.criminalCount}
                min={1}
                max={criminalMax}
                onChange={(criminalCount) => update({ criminalCount })}
              />
            )}
            <NumberStepper
              label="Rounds"
              value={settings.rounds}
              min={3}
              max={10}
              onChange={(rounds) => update({ rounds })}
            />
            <DiscussionControl
              value={settings.discussionSeconds}
              onChange={(discussionSeconds) => update({ discussionSeconds })}
            />
          </div>

          <div className="rounded-lg border border-white/10 bg-white/7 p-4">
            <p className="mb-3 font-bold text-white">Prompt level</p>
            <div className="grid grid-cols-3 gap-2">
              {(["safe", "teen", "adult"] as SafeLevel[]).map((safeLevel) => (
                <button
                  key={safeLevel}
                  type="button"
                  onClick={() => update({ safeLevel })}
                  className={`min-h-12 rounded-lg border px-3 py-2 font-black uppercase transition ${
                    settings.safeLevel === safeLevel
                      ? "border-brand-cyan bg-brand-cyan/14 text-white"
                      : "border-white/10 bg-white/7 text-brand-muted hover:border-brand-cyan/50"
                  }`}
                >
                  {safeLevel}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-danger/40 bg-danger/12 p-3 font-semibold text-danger">
              {error}
            </div>
          )}

          <Button size="lg" className="w-full" disabled={isCreating} onClick={createRoom}>
            {isCreating ? "Creating..." : "Create Room"}
          </Button>
        </Card>
      </div>
    </PageShell>
  );
}
