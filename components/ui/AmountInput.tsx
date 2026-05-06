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
      id,
      name,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? `amount-${generatedId.replace(/:/g, "")}`;
    const inputName = name ?? inputId;

    return (
      <div className="w-full">
        <div
          className={cn(
            "relative flex items-center rounded-box border bg-surface-secondary transition-colors",
            error
              ? "border-red-500"
              : "border-transparent focus-within:border-text-primary",
            disabled && "opacity-60 cursor-not-allowed",
            className
          )}
        >
          <input
            ref={ref}
            id={inputId}
            name={inputName}
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            disabled={disabled}
            value={value}
            onChange={(e) => {
              // Only allow digits and one decimal point
              if (/^\d*\.?\d*$/.test(e.target.value)) {
                onChange(e.target.value);
              }
            }}
            className={cn(
              "w-full bg-transparent p-4 text-2xl font-bold outline-none font-number placeholder:text-text-tertiary",
              disabled && "cursor-not-allowed"
            )}
            {...props}
          />

          <div className="flex items-center gap-2 pr-4 shrink-0">
            {onMaxClick && (
              <button
                type="button"
                onClick={onMaxClick}
                disabled={disabled}
                className="rounded-md bg-surface border border-border px-2 py-1 text-xs font-bold uppercase text-text-primary shadow-sm hover:border-border-hover hover:bg-surface-secondary active:translate-y-px transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                Max
              </button>
            )}

            {tokenSymbol && (
              <span className="text-sm font-bold text-text-primary select-none">
                {tokenSymbol}
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 flex justify-between text-xs min-h-[1.25em]">
          <div className="flex-1">
            {error ? (
              <span className="text-red-500 font-medium animate-in fade-in slide-in-from-top-1">
                {error}
              </span>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>

          {maxLabel && (
            <button
              type="button"
              onClick={onMaxClick}
              disabled={disabled || !onMaxClick}
              className={cn(
                "text-text-tertiary text-right transition-colors font-number shrink-0 ml-4",
                onMaxClick && !disabled
                  ? "hover:text-text-primary hover:underline cursor-pointer"
                  : "cursor-default"
              )}
            >
              {maxLabel}
            </button>
          )}
        </div>
      </div>
    );
  }
);
AmountInput.displayName = "AmountInput";
