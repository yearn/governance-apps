import * as React from "react";
import { cn } from "@/lib/cn";

interface AmountInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (val: string) => void;
  onMaxClick?: () => void;
  maxLabel?: string;
  tokenSymbol?: string;
  error?: string;
}

export const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  (
    {
      className,
      value,
      onChange,
      onMaxClick,
      maxLabel,
      tokenSymbol,
      error,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full">
        <div
          className={cn(
            "relative flex items-center rounded-box border bg-neutral-100 transition-colors",
            error
              ? "border-red-500"
              : "border-transparent focus-within:border-neutral-900",
            disabled && "opacity-60 cursor-not-allowed",
            className
          )}
        >
          <input
            ref={ref}
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            disabled={disabled}
            value={value}
            onChange={(e) => {
              // Simple regex to allow only numbers and one decimal point
              if (/^\d*\.?\d*$/.test(e.target.value)) {
                onChange(e.target.value);
              }
            }}
            className={cn(
              "w-full bg-transparent p-4 text-2xl font-bold outline-none font-number placeholder:text-neutral-400",
              disabled && "cursor-not-allowed"
            )}
            {...props}
          />

          <div className="flex items-center gap-2 pr-4">
            {onMaxClick && (
              <button
                type="button"
                onClick={onMaxClick}
                disabled={disabled}
                className="text-xs font-bold uppercase text-neutral-500 hover:text-neutral-900 disabled:hover:text-neutral-500"
              >
                Max
              </button>
            )}
            {tokenSymbol && (
              <span className="text-sm font-bold text-neutral-900 bg-white px-2 py-1 rounded border border-neutral-200">
                {tokenSymbol}
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 flex justify-between text-xs">
          {error ? (
            <span className="text-red-500 font-medium">{error}</span>
          ) : (
            <span className="text-neutral-500">&nbsp;</span>
          )}
          {maxLabel && (
            <span className="text-neutral-500 text-right">{maxLabel}</span>
          )}
        </div>
      </div>
    );
  }
);
AmountInput.displayName = "AmountInput";
