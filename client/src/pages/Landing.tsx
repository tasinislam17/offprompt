import { Link } from "react-router-dom";
import { Gamepad2, HelpCircle, LogIn, Play, Sparkles, Users } from "lucide-react";
import { Button } from "../components/shared/Button";
import { Card } from "../components/shared/Card";
import { Logo } from "../components/shared/Logo";

export default function Landing() {
  return (
    <main className="app-bg min-h-screen overflow-x-hidden px-4 py-6 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-[calc(100vw-2rem)] max-w-6xl flex-col justify-between overflow-hidden">
        <nav className="flex items-center justify-between">
          <Logo size="sm" />
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/7 px-4 py-2 text-xs font-bold uppercase text-brand-muted sm:flex">
            <Sparkles className="h-4 w-4 text-brand-cyan" />
            V1 local party build
          </div>
        </nav>

        <div className="grid min-w-0 items-center gap-8 py-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="min-w-0 space-y-7">
            <Logo size="lg" showWordmark={false} />
            <div className="max-w-3xl space-y-5">
              <p className="text-sm font-black uppercase text-brand-cyan">
                Couch co-op deception
              </p>
              <h1 className="font-display text-5xl font-black leading-[0.95] text-white sm:text-7xl lg:text-8xl">
                Off Prompt
              </h1>
              <p className="max-w-2xl break-words text-xl font-semibold leading-relaxed text-brand-muted sm:text-2xl">
                Everyone answers a question. Someone answers the wrong one. The room decides who slipped.
              </p>
            </div>
            <div className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row">
              <Link className="block w-full sm:w-auto" to="/host/setup">
                <Button size="lg" icon={<Play className="h-5 w-5" />} className="w-full sm:w-auto">
                  Host Game
                </Button>
              </Link>
              <Link className="block w-full sm:w-auto" to="/join">
                <Button variant="secondary" size="lg" icon={<LogIn className="h-5 w-5" />} className="w-full sm:w-auto">
                  Join Game
                </Button>
              </Link>
              <Link className="block w-full sm:w-auto" to="/how-to-play">
                <Button variant="ghost" size="lg" icon={<HelpCircle className="h-5 w-5" />} className="w-full sm:w-auto">
                  How To Play
                </Button>
              </Link>
            </div>
          </div>

          <Card className="scanline min-w-0 space-y-5 p-5 md:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase text-brand-cyan">Live room</p>
                <h2 className="mt-2 font-display text-3xl font-black text-white">Game show energy</h2>
              </div>
              <Gamepad2 className="h-10 w-10 text-brand-cyan" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {["Answer", "Discuss", "Vote", "Reveal"].map((label, index) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/7 p-4">
                  <p className="font-display text-3xl font-black text-brand-cyan">0{index + 1}</p>
                  <p className="mt-2 font-bold text-white">{label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-brand-purple/35 bg-brand-purple/12 p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-brand-cyan" />
                <p className="font-bold text-white">3 to 10 players, one shared screen, phones as controllers.</p>
              </div>
            </div>
          </Card>
        </div>

        <footer className="pb-2 text-center text-xs font-semibold uppercase text-brand-muted">
          Off Prompt build 0.1.0
        </footer>
      </section>
    </main>
  );
}
