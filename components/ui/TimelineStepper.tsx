import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

export type TimelineStepStatus = "complete" | "current" | "upcoming" | "blocked";

export type TimelineStep = {
  id: string;
  label: string;
  description?: string;
  status: TimelineStepStatus;
};

type TimelineStepperProps = {
  steps: TimelineStep[];
  "aria-label": string;
  className?: string;
};

const STEP_STATUS_COPY: Record<TimelineStepStatus, string> = {
  complete: "Complete",
  current: "Current",
  upcoming: "Upcoming",
  blocked: "Closed",
};

const STEP_BADGE_VARIANT = {
  complete: "success",
  current: "brand",
  upcoming: "neutral",
  blocked: "warning",
} as const;

const STEP_DOT_CLASS_NAME: Record<TimelineStepStatus, string> = {
  complete: "border-green-600 bg-green-600",
  current: "border-yearn-blue bg-yearn-blue",
  upcoming: "border-border bg-surface",
  blocked: "border-amber-500 bg-amber-500",
};

export function TimelineStepper({
  steps,
  "aria-label": ariaLabel,
  className,
}: TimelineStepperProps) {
  return (
    <ol aria-label={ariaLabel} className={cn("space-y-3", className)}>
      {steps.map((step, index) => (
        <li
          key={step.id}
          aria-current={step.status === "current" ? "step" : undefined}
          className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3"
        >
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "mt-1 size-3 rounded-full border-2",
                STEP_DOT_CLASS_NAME[step.status]
              )}
              aria-hidden="true"
            />
            {index < steps.length - 1 ? (
              <span className="mt-1 h-full min-h-10 w-px bg-border" aria-hidden="true" />
            ) : null}
          </div>
          <div className="rounded-box border border-border bg-surface px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-text-primary">{step.label}</p>
              <Badge variant={STEP_BADGE_VARIANT[step.status]}>
                {STEP_STATUS_COPY[step.status]}
              </Badge>
            </div>
            {step.description ? (
              <p className="mt-1 text-sm leading-5 text-text-secondary">
                {step.description}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
