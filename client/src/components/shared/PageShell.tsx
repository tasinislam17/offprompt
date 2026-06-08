import type { ReactNode } from "react";
import { Logo } from "./Logo";

type PageShellProps = {
  children: ReactNode;
  compact?: boolean;
};

export function PageShell({ children, compact = false }: PageShellProps) {
  return (
    <main className="app-bg min-h-screen px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className={compact ? "mx-auto max-w-xl" : "mx-auto max-w-7xl"}>
        <header className="mb-6 flex items-center justify-between">
          <Logo size="sm" />
        </header>
        {children}
      </div>
    </main>
  );
}
