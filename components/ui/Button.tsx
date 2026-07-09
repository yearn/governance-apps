import * as React from "react";
import { cn } from "@/lib/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "styfi" | "veyfi" | "yeth";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  static?: boolean;
}

type ButtonClassNameOptions = {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  static?: boolean;
};

const BUTTON_BASE_CLASS_NAME =
  "inline-flex min-w-10 items-center justify-center rounded-box transition-[background-color,border-color,color,box-shadow,scale,transform] duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-text-primary focus:ring-offset-2 focus:ring-offset-app disabled:cursor-not-allowed disabled:active:scale-100";
const BUTTON_VARIANT_CLASS_NAMES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-neutral-900 text-neutral-0 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500",
  secondary:
    "bg-surface border border-border text-text-primary hover:bg-surface-secondary disabled:opacity-50",
  ghost:
    "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-secondary/60",
  styfi:
    "bg-sunset-600 text-white hover:bg-sunset-500 disabled:bg-sunset-100 disabled:text-sunset-900",
  veyfi:
    "bg-disco-700 text-white hover:bg-disco-600 disabled:bg-disco-100 disabled:text-disco-900",
  yeth:
    "bg-tokyo-600 text-white hover:bg-tokyo-700 disabled:bg-tokyo-100 disabled:text-tokyo-900",
};
const BUTTON_SIZE_CLASS_NAMES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-10 px-3 text-xs",
  md: "h-12 px-6 text-sm font-bold",
  lg: "h-14 px-8 text-base font-bold",
};
const BUTTON_PRESS_CLASS_NAME = "active:scale-[0.96]";

export function getButtonClassName({
  variant = "primary",
  size = "md",
  className,
  static: isStatic,
}: ButtonClassNameOptions = {}) {
  return cn(
    BUTTON_BASE_CLASS_NAME,
    BUTTON_VARIANT_CLASS_NAMES[variant],
    BUTTON_SIZE_CLASS_NAMES[size],
    !isStatic && BUTTON_PRESS_CLASS_NAME,
    className
  );
}

const Spinner = () => (
  <svg
    className="animate-spin h-5 w-5 text-current"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      disabled,
      children,
      static: isStatic,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={getButtonClassName({
          variant,
          size,
          className,
          static: isStatic,
        })}
        {...props}
      >
        {isLoading ? <Spinner /> : children}
      </button>
    );
  }
);
Button.displayName = "Button";
