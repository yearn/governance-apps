import * as React from "react";
import { cn } from "@/lib/cn";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-box border border-border bg-surface p-6 shadow-sm",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";
