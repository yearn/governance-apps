import { Button } from "@/components/ui/Button";
import { yethCopy as copy } from "../messages";

export function ActionDeck({
  onExit,
  onStay,
  exitPending,
  stayPending,
  disabled,
}: {
  onExit: () => void;
  onStay: () => void;
  exitPending: boolean;
  stayPending: boolean;
  disabled: boolean;
}) {
  const actionsDisabled = disabled || exitPending || stayPending;

  return (
    <section className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto w-full">
      <article className="bg-white border border-neutral-200 shadow-lg rounded-2xl p-6 space-y-5">
        <header className="space-y-2">
          <div className="inline-flex rounded-md bg-tokyo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-tokyo-900">
            {copy.actions.exit.subtitle}
          </div>
          <h3 className="text-lg font-bold text-neutral-900">{copy.actions.exit.title}</h3>
        </header>
        <ul className="space-y-1 text-sm text-neutral-600 list-disc pl-4">
          {copy.actions.exit.body.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <Button
          variant="yeth"
          size="lg"
          className="w-full shadow-md"
          onClick={onExit}
          isLoading={exitPending}
          disabled={actionsDisabled}
        >
          {copy.actions.exit.cta}
        </Button>
      </article>

      <article className="bg-transparent border border-transparent p-6 space-y-5">
        <header className="space-y-2">
          <h3 className="text-lg font-bold text-neutral-900">{copy.actions.stay.title}</h3>
        </header>
        <ul className="space-y-1 text-sm text-neutral-600 list-disc pl-4">
          {copy.actions.stay.body.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <Button
          variant="ghost"
          size="lg"
          className="w-full border-2 border-tokyo-600 text-tokyo-600 bg-transparent hover:bg-tokyo-100"
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
