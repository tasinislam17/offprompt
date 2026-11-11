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
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl font-extrabold transition duration-200 focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:ring-offset-2 focus:ring-offset-brand-navy disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" && "px-3 py-2 text-sm",
        size === "md" && "px-5 py-3 text-base",
        size === "lg" && "px-7 py-4 text-lg",
        variant === "primary" &&
          "border border-brand-blue bg-gradient-to-b from-brand-blue to-[#ff9e37] text-brand-navy shadow-blue hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0",
        variant === "secondary" &&
          "border border-white/20 bg-white/5 text-white hover:border-brand-cyan/60 hover:bg-white/10",
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
