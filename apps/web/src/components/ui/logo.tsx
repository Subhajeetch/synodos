import type { SVGProps } from "react";
import { cn } from "cn";

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      role="img"
      aria-label="Synodos"
      viewBox="0 0 850 200"
      className={cn(
        "text-foreground [--logo-background:var(--background)]",
        className,
      )}
      {...props}
    >
      <use href="/synodos-logo.svg#synodos-logo-art" />
    </svg>
  );
}
