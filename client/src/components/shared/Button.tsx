import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  icon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg font-bold transition duration-200 focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:ring-offset-2 focus:ring-offset-brand-navy disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" && "px-3 py-2 text-sm",
        size === "md" && "px-5 py-3 text-base",
        size === "lg" && "px-7 py-4 text-lg",
        variant === "primary" &&
          "bg-gradient-to-r from-brand-blue via-[#1557ff] to-brand-cyan text-white shadow-blue hover:-translate-y-0.5 hover:shadow-glow active:translate-y-0",
        variant === "secondary" &&
          "border border-brand-cyan/35 bg-white/8 text-white hover:border-brand-cyan hover:bg-white/12",
        variant === "danger" &&
          "border border-danger/60 bg-danger/14 text-white hover:bg-danger/24",
        variant === "ghost" && "text-brand-muted hover:bg-white/8 hover:text-white",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
