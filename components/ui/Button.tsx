import * as React from "react";
import { cn } from "@/lib/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "styfi" | "veyfi";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
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
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        "bg-neutral-900 text-neutral-0 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500",
      secondary:
        "bg-white border border-neutral-300 text-neutral-900 hover:bg-neutral-100 disabled:opacity-50",
      ghost:
        "bg-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50",

      // Brand Variants
      styfi:
        "bg-sunset-500 text-white hover:bg-sunset-600 disabled:bg-sunset-100 disabled:text-sunset-900",
      veyfi:
        "bg-disco-600 text-white hover:bg-disco-700 disabled:bg-disco-100 disabled:text-disco-900",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-12 px-6 text-sm font-bold",
      lg: "h-14 px-8 text-base font-bold",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-box transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? <Spinner /> : children}
      </button>
    );
  }
);
Button.displayName = "Button";
