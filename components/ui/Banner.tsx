import { cn } from "@/lib/cn";
import React from "react";

interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "warning" | "error" | "info";
  title?: string;
}

export function Banner({
  className,
  variant = "info",
  title,
  children,
  ...props
}: BannerProps) {
  const variants = {
    warning: "bg-amber-100 text-amber-900 border-amber-200",
    error: "bg-red-100 text-red-900 border-red-200",
    info: "bg-blue-50 text-blue-900 border-blue-200",
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border p-4 text-sm",
        variants[variant],
        className
      )}
      {...props}
    >
      {title && <h3 className="font-bold">{title}</h3>}
      <div className="opacity-90">{children}</div>
    </div>
  );
}
