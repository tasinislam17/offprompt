import { Crown } from "lucide-react";
import type { PublicPlayer } from "@off-prompt/shared";
import { Card } from "./Card";

type ScoreboardProps = {
  players: PublicPlayer[];
  title?: string;
};

export function Scoreboard({ players, title = "Scoreboard" }: ScoreboardProps) {
  const ranked = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const leaderScore = ranked[0]?.score ?? 0;

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-black text-white">{title}</h2>
        <Crown className="h-6 w-6 text-warning" />
      </div>
      <div className="space-y-2">
        {ranked.map((player, index) => (
          <div
            key={player.id}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/7 px-4 py-3"
          >
            <div className="w-8 text-center font-display text-xl font-black text-brand-cyan">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-white">{player.name}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full origin-left animate-bar-grow rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan"
                  style={{ width: `${leaderScore > 0 ? Math.max(8, (player.score / leaderScore) * 100) : 8}%` }}
                />
              </div>
            </div>
            <p className="font-display text-2xl font-black text-white">{player.score}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
