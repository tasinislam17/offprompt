import clsx from "clsx";

type StatusPillProps = {
  label: string;
  tone?: "neutral" | "success" | "danger" | "warning" | "blue" | "purple";
};

export function StatusPill({ label, tone = "neutral" }: StatusPillProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase",
        tone === "neutral" && "border-white/15 bg-white/8 text-brand-muted",
        tone === "success" && "border-success/45 bg-success/12 text-success",
        tone === "danger" && "border-danger/45 bg-danger/12 text-danger",
        tone === "warning" && "border-warning/45 bg-warning/12 text-warning",
        tone === "blue" && "border-brand-cyan/45 bg-brand-blue/16 text-brand-cyan",
        tone === "purple" && "border-brand-purple/45 bg-brand-purple/14 text-white"
      )}
    >
      {label}
    </span>
  );
}
