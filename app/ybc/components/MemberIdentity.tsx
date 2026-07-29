import { useEffect, useId, useRef, useState } from "react";
import { IconPencil } from "@/components/icons/IconPencil";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AddressLink } from "@/components/ui/ExplorerLink";
import type { YbcDisplayIdentity } from "../identity";
import { YBC_MEMBER_ALIAS_MAX_LENGTH } from "../memberAliases";
import { ybcCopy as copy } from "../messages";
import type { YbcMemberAliasMutationResult } from "../useYbcMemberAliases";

type MemberIdentityProps = {
  alias?: string;
  identity: YbcDisplayIdentity;
  isCurrentMember?: boolean;
  onResetAlias?: (address: string) => YbcMemberAliasMutationResult;
  onSetAlias?: (
    address: string,
    alias: string
  ) => YbcMemberAliasMutationResult;
};

export function MemberIdentity({
  alias,
  identity,
  isCurrentMember = false,
  onResetAlias,
  onSetAlias,
}: MemberIdentityProps) {
  const inputId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(alias ?? identity.label);
  const [error, setError] = useState<string | null>(null);
  const canEdit = Boolean(onResetAlias && onSetAlias);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }

    if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      editButtonRef.current?.focus();
    }
  }, [isEditing]);

  const closeEditor = () => {
    setDraft(alias ?? identity.label);
    setError(null);
    restoreFocusRef.current = true;
    setIsEditing(false);
  };

  const submitAlias = () => {
    if (!onSetAlias) return;

    const result = onSetAlias(identity.address, draft);
    if (result !== "saved") {
      setError(getMutationError(result));
      return;
    }

    setError(null);
    restoreFocusRef.current = true;
    setIsEditing(false);
  };

  const resetAlias = () => {
    if (!onResetAlias) return;

    const result = onResetAlias(identity.address);
    if (result !== "saved") {
      setError(getMutationError(result));
      return;
    }

    setError(null);
    restoreFocusRef.current = true;
    setIsEditing(false);
  };

  return (
    <div className="w-full min-w-0 max-w-full">
      {isEditing ? (
        <>
          <form
            className="min-w-0 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitAlias();
            }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <label
                className="text-xs font-bold uppercase text-text-tertiary"
                htmlFor={inputId}
              >
                {copy.members.alias.fieldLabel}
              </label>
              {isCurrentMember ? (
                <Badge variant="brand">{copy.members.states.you}</Badge>
              ) : null}
            </div>
            <input
              ref={inputRef}
              id={inputId}
              className="h-10 w-full min-w-0 rounded-box border border-border bg-surface px-3 text-sm text-text-primary outline-none transition-[border-color,box-shadow] focus:border-text-primary focus:ring-2 focus:ring-text-primary/10"
              value={draft}
              maxLength={YBC_MEMBER_ALIAS_MAX_LENGTH}
              aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`}
              aria-invalid={Boolean(error)}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => {
                setDraft(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeEditor();
                }
              }}
            />
            <p id={descriptionId} className="text-xs leading-5 text-text-tertiary">
              {copy.members.alias.browserOnly}
            </p>
            {error ? (
              <p id={errorId} className="text-xs text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm">
                {copy.members.alias.save}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={closeEditor}
              >
                {copy.members.alias.cancel}
              </Button>
              {alias ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={resetAlias}
                >
                  {copy.members.alias.reset}
                </Button>
              ) : null}
            </div>
          </form>
          <div className="mt-1 min-w-0">
            <AddressLink
              address={identity.address}
              className="min-w-0"
              variant="compact"
            />
          </div>
        </>
      ) : (
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-0">
          {canEdit ? (
            <button
              ref={editButtonRef}
              type="button"
              className="group/name inline-flex min-h-10 min-w-10 max-w-full items-center gap-1 rounded text-left font-bold text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
              aria-label={`${copy.members.alias.edit}: ${identity.label}`}
              title={copy.members.alias.edit}
              onClick={() => {
                setDraft(alias ?? identity.label);
                setError(null);
                setIsEditing(true);
              }}
            >
              <span className="min-w-0 max-w-full break-words [overflow-wrap:anywhere]">
                {identity.label}
              </span>
              <IconPencil
                className="pointer-events-none size-4 shrink-0 text-text-tertiary opacity-0 transition-opacity duration-150 ease-out [@media(pointer:fine)]:group-hover/name:opacity-100 group-focus-visible/name:opacity-100"
                aria-hidden="true"
              />
            </button>
          ) : (
            <span className="min-w-0 max-w-full break-words font-bold text-text-primary [overflow-wrap:anywhere]">
              {identity.label}
            </span>
          )}
          {isCurrentMember ? (
            <Badge variant="brand">{copy.members.states.you}</Badge>
          ) : null}
          <AddressLink
            address={identity.address}
            className="min-w-0"
            variant="compact"
          />
        </div>
      )}
    </div>
  );
}

function getMutationError(
  result: Exclude<YbcMemberAliasMutationResult, "saved">
): string {
  return result === "storage-error"
    ? copy.members.alias.storageError
    : copy.members.alias.invalid;
}
