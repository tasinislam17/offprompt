import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, LogIn } from "lucide-react";
import { Button } from "../components/shared/Button";
import { Card } from "../components/shared/Card";
import { Logo } from "../components/shared/Logo";
import { createClientToken, savePlayerSession } from "../lib/session";
import { roomCode as normalizeRoomCode } from "../lib/format";
import { emitWithAck } from "../socket/socketClient";

export default function JoinGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRoomCode = useMemo(() => normalizeRoomCode(searchParams.get("room") ?? ""), [searchParams]);
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsJoining(true);
    const playerSessionToken = createClientToken();
    const normalizedCode = normalizeRoomCode(roomCode);
    const response = await emitWithAck<{
      roomCode: string;
      playerId: string;
      playerSessionToken: string;
    }>("player:joinRoom", {
      roomCode: normalizedCode,
      name,
      playerSessionToken,
    });
    setIsJoining(false);

    if (!response.ok) {
      setError(response.error);
      return;
    }

    savePlayerSession({
      roomCode: response.data.roomCode,
      playerId: response.data.playerId,
      playerSessionToken: response.data.playerSessionToken || playerSessionToken,
      name,
    });
    navigate(`/play/${response.data.roomCode}`);
  }

  return (
    <main className="app-bg grid min-h-screen place-items-center px-4 py-6 text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Logo size="sm" />
          <Link to="/">
            <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
        </div>

        <Card className="space-y-5">
          <div>
            <p className="text-sm font-black uppercase text-brand-cyan">Player controller</p>
            <h1 className="mt-2 font-display text-4xl font-black text-white">Join room</h1>
          </div>

          <form className="space-y-4" onSubmit={join}>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-brand-muted">Room code</span>
              <input
                value={roomCode}
                onChange={(event) => setRoomCode(normalizeRoomCode(event.target.value))}
                maxLength={6}
                className="h-14 w-full rounded-lg border border-white/12 bg-white/8 px-4 text-center font-display text-3xl font-black uppercase text-white outline-none transition focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/30"
                placeholder="ABCD5"
                autoCapitalize="characters"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-brand-muted">Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={20}
                className="h-14 w-full rounded-lg border border-white/12 bg-white/8 px-4 text-lg font-bold text-white outline-none transition placeholder:text-brand-muted/60 focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/30"
                placeholder="Your name"
              />
            </label>

            {error && (
              <div className="rounded-lg border border-danger/40 bg-danger/12 p-3 font-semibold text-danger">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              icon={<LogIn className="h-5 w-5" />}
              disabled={isJoining || roomCode.length < 4 || name.trim().length < 2}
            >
              {isJoining ? "Joining..." : "Join Game"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
