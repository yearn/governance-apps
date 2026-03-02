import { Button } from "@/components/ui/Button";
import { yethCopy as copy } from "../messages";

export function ActionDeck({
  onExit,
  onStay,
  claimableEth,
  exitPending,
  stayPending,
  disabled,
}: {
  onExit: () => void;
  onStay: () => void;
  claimableEth: string;
  exitPending: boolean;
  stayPending: boolean;
  disabled: boolean;
}) {
  const actionsDisabled = disabled || exitPending || stayPending;

  return (
    <section className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto w-full">
      <article className="bg-surface border border-border shadow-lg rounded-2xl p-6 h-full flex flex-col">
        <header className="space-y-2 min-h-16">
          <div className="inline-flex rounded-md bg-tokyo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-tokyo-900">
            {copy.actions.exit.subtitle}
          </div>
          <h3 className="text-lg font-bold text-text-primary">{copy.actions.exit.title}</h3>
        </header>
        <ul className="space-y-1 text-sm text-text-secondary list-disc pl-4 flex-1 mt-3">
          {copy.actions.exit.body.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <Button
          variant="yeth"
          size="lg"
          className="w-full shadow-md mt-6"
          onClick={onExit}
          isLoading={exitPending}
          disabled={actionsDisabled}
        >
          {copy.actions.exit.cta(claimableEth)}
        </Button>
      </article>

      <article className="bg-transparent border border-transparent p-6 h-full flex flex-col">
        <header className="space-y-2 min-h-16">
          <div className="h-[18px]" aria-hidden />
          <h3 className="text-lg font-bold text-text-primary">{copy.actions.stay.title}</h3>
        </header>
        <ul className="space-y-1 text-sm text-text-secondary list-disc pl-4 flex-1 mt-3">
          {copy.actions.stay.body.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <Button
          variant="ghost"
          size="lg"
          className="mt-6 w-full border-2 border-tokyo-600 bg-tokyo-100/40 text-tokyo-700 hover:bg-tokyo-100 hover:text-tokyo-700 dark:border-tokyo-100/40 dark:bg-tokyo-600/25 dark:text-tokyo-100 dark:hover:bg-tokyo-600/40 dark:hover:text-tokyo-100"
          onClick={onStay}
          isLoading={stayPending}
          disabled={actionsDisabled}
        >
          {copy.actions.stay.cta}
        </Button>
      </article>
    </section>
  );
}
