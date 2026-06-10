import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import QrScanner from "qr-scanner";
import { ArrowLeft, Camera, LogIn, X } from "lucide-react";
import { Button } from "../components/shared/Button";
import { Card } from "../components/shared/Card";
import { Logo } from "../components/shared/Logo";
import { createClientToken, savePlayerSession } from "../lib/session";
import { roomCode as normalizeRoomCode } from "../lib/format";
import { parseRoomCodeFromQr } from "../lib/qr";
import { emitWithAck } from "../socket/socketClient";

export default function JoinGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRoomCode = useMemo(() => normalizeRoomCode(searchParams.get("room") ?? ""), [searchParams]);
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!scannerOpen) {
      return;
    }

    let scanner: QrScanner | null = null;
    let cancelled = false;

    async function startScanner() {
      const video = videoRef.current;
      if (!video) {
        return;
      }

      try {
        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera) {
          throw new Error("No camera was found.");
        }

        scanner = new QrScanner(
          video,
          (scanResult) => {
            const rawValue = typeof scanResult === "string" ? scanResult : scanResult.data;
            const parsedCode = parseRoomCodeFromQr(rawValue);
            if (!parsedCode) {
              setQrError("That QR does not include a valid Off Prompt room code.");
              return;
            }

            setRoomCode(parsedCode);
            setQrError(null);
            setError(null);
            setScannerOpen(false);
            window.setTimeout(() => nameInputRef.current?.focus(), 80);
          },
          {
            highlightCodeOutline: true,
            highlightScanRegion: true,
            returnDetailedScanResult: true,
          }
        );

        await scanner.start();
        if (cancelled) {
          scanner.stop();
          scanner.destroy();
        }
      } catch (caught) {
        if (!cancelled) {
          const message = caught instanceof Error ? caught.message : "Camera could not start.";
          setQrError(`${message} You can still type the room code.`);
        }
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      scanner?.stop();
      scanner?.destroy();
    };
  }, [scannerOpen]);

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
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-brand-muted">
                <span>Room code</span>
                <button
                  type="button"
                  onClick={() => {
                    setQrError(null);
                    setScannerOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-brand-cyan/35 bg-brand-cyan/10 px-3 py-1 text-xs font-black uppercase text-brand-cyan transition hover:border-brand-cyan hover:bg-brand-cyan/16"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Scan QR
                </button>
              </div>
              <input
                value={roomCode}
                onChange={(event) => setRoomCode(normalizeRoomCode(event.target.value))}
                maxLength={6}
                className="h-14 w-full rounded-lg border border-white/12 bg-white/8 px-4 text-center font-display text-3xl font-black uppercase text-white outline-none transition focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/30"
                placeholder="ABCD5"
                autoCapitalize="characters"
                aria-label="Room code"
              />
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-brand-muted">Name</span>
              <input
                ref={nameInputRef}
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

        {scannerOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-brand-ink/85 px-4 py-6 backdrop-blur-md">
            <Card className="max-w-md space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase text-brand-cyan">Scan host QR</p>
                  <h2 className="mt-1 font-display text-3xl font-black text-white">Fill room code</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setScannerOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/8 text-brand-muted transition hover:text-white"
                  aria-label="Close QR scanner"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-hidden rounded-lg border border-brand-cyan/35 bg-black">
                <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
              </div>
              <p className="text-sm font-semibold text-brand-muted">
                Point your camera at the host QR. Off Prompt will only fill the code box.
              </p>
              {qrError && (
                <div className="rounded-lg border border-warning/40 bg-warning/12 p-3 text-sm font-semibold text-warning">
                  {qrError}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
