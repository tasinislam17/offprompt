import { Link } from "react-router-dom";
import { Gamepad2, HelpCircle, LogIn, Play, Sparkles, Users } from "lucide-react";
import { Button } from "../components/shared/Button";
import { Card } from "../components/shared/Card";
import { Logo } from "../components/shared/Logo";

const rounds = ["Answer", "Discuss", "Vote", "Reveal"];

export default function Landing() {
  return (
    <main className="app-bg relative min-h-screen overflow-hidden px-4 py-5 text-white sm:px-7 sm:py-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rotate-12 rounded-[3rem] border border-brand-cyan/15 bg-brand-purple/10 sm:right-12 sm:h-96 sm:w-96" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-[34%] h-64 w-64 -rotate-12 rounded-[3rem] border border-brand-blue/15 bg-brand-blue/10" />

      <section className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-7xl flex-col">
        <nav className="flex items-center justify-between">
          <Logo size="sm" />
          <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-[#201D3A]/85 px-4 py-2 text-xs font-extrabold uppercase tracking-[.13em] text-brand-muted shadow-blue sm:flex">
            <Sparkles className="h-4 w-4 text-brand-blue" />
            V1 local party build
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:py-16">
          <div className="min-w-0">
            <div className="mb-5 inline-flex -rotate-2 items-center gap-2 rounded-md border border-brand-cyan/35 bg-brand-cyan/10 px-3 py-2 text-xs font-black uppercase tracking-[.18em] text-brand-cyan shadow-glow">
              <span className="h-2 w-2 rounded-full bg-brand-cyan shadow-[0_0_12px_currentColor]" />
              Couch co-op deception
            </div>
            <div className="relative max-w-3xl">
              <div aria-hidden="true" className="absolute -left-2 top-2 h-[88%] w-[78%] -rotate-2 rounded-[2.25rem] bg-brand-purple/30 sm:-left-5 sm:top-4" />
              <div className="relative -rotate-1 rounded-[2rem] border border-white/15 bg-gradient-to-br from-[#30294d] via-[#272342] to-[#211f39] px-5 py-7 shadow-[0_26px_70px_rgba(5,4,20,.4)] sm:px-9 sm:py-10">
                <Logo size="lg" showWordmark={false} className="mb-3" />
                <h1 className="font-display text-[3.4rem] font-black leading-[.86] tracking-[-.07em] text-white [text-shadow:0_5px_0_rgba(0,0,0,.22)] sm:text-7xl lg:text-[6.4rem]">
                  OFF<br />
                  <span className="ml-8 text-brand-blue sm:ml-12">PROMPT</span>
                </h1>
                <div className="mt-6 flex items-center gap-3">
                  <span className="h-1 w-14 rotate-[-4deg] rounded-full bg-brand-cyan" />
                  <p className="max-w-xl text-lg font-semibold leading-relaxed text-brand-muted sm:text-xl">
                    Everyone answers a question. Someone answers the wrong one. The room decides who slipped.
                  </p>
                </div>
                <div aria-hidden="true" className="absolute -right-2 -top-5 grid h-14 w-14 rotate-12 place-items-center rounded-2xl border border-white/15 bg-brand-cyan text-brand-navy shadow-glow sm:-right-5 sm:-top-6 sm:h-[4.5rem] sm:w-[4.5rem]">
                  <Gamepad2 className="h-7 w-7 sm:h-9 sm:w-9" />
                </div>
              </div>
            </div>
            <div className="mt-8 flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:flex-wrap">
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

          <Card className="party-card relative min-w-0 overflow-hidden space-y-5 rounded-[1.75rem] border-white/15 bg-gradient-to-br from-[#33254d] via-[#242440] to-[#1d2038] p-5 shadow-purple md:p-7">
            <div aria-hidden="true" className="absolute -right-8 -top-12 h-44 w-44 rotate-12 rounded-[2rem] border border-brand-cyan/20 bg-brand-cyan/5" />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.2em] text-brand-cyan">Live room</p>
                <h2 className="mt-2 font-display text-3xl font-black leading-tight text-white sm:text-4xl">Game show<br />energy</h2>
              </div>
              <div className="grid h-14 w-14 shrink-0 rotate-3 place-items-center rounded-2xl border border-brand-blue/40 bg-brand-blue/15 text-brand-blue sm:h-16 sm:w-16">
                <Gamepad2 className="h-8 w-8" />
              </div>
            </div>
            <div className="relative grid grid-cols-2 gap-3">
              {rounds.map((label, index) => (
                <div key={label} className={`min-h-28 -rotate-[1deg] rounded-2xl border p-4 shadow-blue transition-transform even:rotate-[1deg] ${index === 1 ? "border-brand-purple/45 bg-[#392c52]" : index === 3 ? "border-brand-blue/40 bg-[#3a2b43]" : "border-white/12 bg-[#25243e]"}`}>
                  <p className={`font-display text-4xl font-black ${index % 2 ? "text-brand-cyan" : "text-brand-blue"}`}>0{index + 1}</p>
                  <p className="mt-2 font-extrabold text-white">{label}</p>
                </div>
              ))}
            </div>
            <div className="relative rounded-2xl border border-brand-cyan/25 bg-[#191a31]/80 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-cyan/15 text-brand-cyan">
                  <Users className="h-5 w-5" />
                </div>
                <p className="font-bold leading-relaxed text-white">3 to 10 players, one shared screen, phones as controllers.</p>
              </div>
            </div>
          </Card>
        </div>

        <footer className="flex items-center justify-between border-t border-white/10 py-4 text-[10px] font-extrabold uppercase tracking-[.18em] text-brand-muted">
          <span>Off Prompt build 0.1.0</span>
          <span className="hidden sm:inline">Pass the phone. Keep a straight face.</span>
        </footer>
      </section>
    </main>
  );
}
