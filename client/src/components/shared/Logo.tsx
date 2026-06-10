import clsx from "clsx";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
};

export function Logo({ size = "md", showWordmark = true, className }: LogoProps) {
  return (
    <div className={clsx("flex items-center gap-3", className)}>
      <img
        src="/off-prompt-logo.svg"
        alt="Off Prompt"
        className={clsx(
          size === "sm" && "h-10 w-10",
          size === "md" && "h-14 w-14",
          size === "lg" && "h-20 w-20 md:h-24 md:w-24"
        )}
      />
      {showWordmark && (
        <div>
          <p
            className={clsx(
              "font-display font-black uppercase text-white",
              size === "sm" && "text-lg",
              size === "md" && "text-2xl",
              size === "lg" && "text-4xl md:text-5xl"
            )}
          >
            Off Prompt
          </p>
          <p className="text-xs font-bold uppercase text-brand-cyan">
            Social deduction
          </p>
        </div>
      )}
    </div>
  );
}
