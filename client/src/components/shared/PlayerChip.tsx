import clsx from "clsx";
import { CheckCircle2, WifiOff, XCircle } from "lucide-react";
import type { PublicPlayer } from "@off-prompt/shared";
import { initials } from "../../lib/format";

type PlayerChipProps = {
  player: PublicPlayer;
  large?: boolean;
  activityStatus?: "complete" | "pending";
  activityLabel?: string;
};

export function PlayerChip({ player, large = false, activityStatus, activityLabel }: PlayerChipProps) {
  const isComplete = activityStatus === "complete";
  const isPending = activityStatus === "pending";

  return (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-lg border bg-white/7",
        large ? "p-4" : "px-3 py-2",
        isComplete && "border-success/70 bg-success/10 shadow-[0_0_22px_rgba(62,242,154,0.12)]",
        isPending && "border-white/14",
        !activityStatus && (player.isReady ? "border-success/45" : "border-white/12"),
        player.isEliminated && "border-danger/35 bg-danger/8 opacity-70"
      )}
    >
      <div
        className={clsx(
          "grid shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-blue to-brand-purple font-black text-white shadow-glow",
          large ? "h-14 w-14 text-xl" : "h-10 w-10 text-sm"
        )}
      >
        {initials(player.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className={clsx("truncate font-bold text-white", large ? "text-lg" : "text-sm")}>{player.name}</p>
        <p className="text-xs font-semibold uppercase text-brand-muted">
          {activityLabel ?? (player.isEliminated ? "Spectator" : `${player.score} pts`)}
        </p>
      </div>
      {!player.isConnected ? (
        <WifiOff className="h-5 w-5 text-warning" aria-label="Disconnected" />
      ) : isComplete ? (
        <CheckCircle2 className="h-5 w-5 text-success" aria-label={activityLabel ?? "Complete"} />
      ) : isPending ? (
        <XCircle className="h-5 w-5 text-brand-muted" aria-label={activityLabel ?? "Pending"} />
      ) : player.isReady ? (
        <CheckCircle2 className="h-5 w-5 text-success" aria-label="Ready" />
      ) : (
        <XCircle className="h-5 w-5 text-brand-muted" aria-label="Not ready" />
      )}
    </div>
  );
}
