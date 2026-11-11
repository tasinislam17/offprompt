import type { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("glass-panel w-full max-w-full rounded-2xl p-5 md:p-6", className)} {...props} />;
}
