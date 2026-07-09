import * as React from "react";
import { cn } from "@/lib/cn";

type CardVariant = "default" | "flat";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const CARD_VARIANT_CLASS_NAMES: Record<CardVariant, string> = {
  default: "border-border bg-surface shadow-sm",
  flat: "border-transparent bg-surface-secondary/50 shadow-none",
};

export const Card = React.forwardRef<
  HTMLDivElement,
  CardProps
>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-box border p-6 transition-[background-color,border-color,box-shadow] duration-150 ease-out",
      CARD_VARIANT_CLASS_NAMES[variant],
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";
