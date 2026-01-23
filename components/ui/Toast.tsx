"use client";

import type { ReactNode } from "react";
import toastMaster, { Toaster as HotToaster, type ToastOptions } from "react-hot-toast";
import {
  IconAlertCritical,
  IconAlertError,
  IconAlertWarning,
  IconCheckmark,
} from "@/components/icons/ToastIcons";

export type ToastCTA = {
  label: string;
  onClick: () => void;
};

type ToastOptionsWithCTA = ToastOptions & { cta?: ToastCTA };

function ToastContent({ content, cta }: { content: ReactNode; cta?: ToastCTA }) {
  return (
    <div className="flex items-center gap-4">
      <span>{content}</span>
      {cta && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            cta.onClick();
          }}
          className="rounded bg-black/10 px-2 py-1 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-black/20"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}

function buildMessage(content: ReactNode, cta?: ToastCTA) {
  return <ToastContent content={content} cta={cta} />;
}

function applyStyle(
  baseStyle: ToastOptions["style"],
  overrides?: ToastOptions["style"]
) {
  return { ...baseStyle, ...overrides };
}

const baseToastStyle: ToastOptions["style"] = {
  maxWidth: "calc(100vw - 32px)",
  width: "fit-content",
};

const baseToast = toastMaster;
const baseSuccess = toastMaster.success;
const baseError = toastMaster.error;
const baseLoading = toastMaster.loading;

const toast = Object.assign(toastMaster, {
  success: (content: ReactNode, options?: ToastOptionsWithCTA) => {
    const { cta, ...rest } = options ?? {};
    return baseSuccess(buildMessage(content, cta), {
      ...rest,
      icon: <IconCheckmark className="h-5 w-5 text-white" />,
      style: applyStyle(
        { ...baseToastStyle, backgroundColor: "#00796D", color: "#FFFFFF" },
        rest.style
      ),
    });
  },
  error: (content: ReactNode, options?: ToastOptionsWithCTA) => {
    const { cta, ...rest } = options ?? {};
    return baseError(buildMessage(content, cta), {
      ...rest,
      icon: <IconAlertCritical className="h-5 w-5 text-white" />,
      style: applyStyle(
        { ...baseToastStyle, backgroundColor: "#C73203", color: "#FFFFFF" },
        rest.style
      ),
    });
  },
  info: (content: ReactNode, options?: ToastOptionsWithCTA) => {
    const { cta, ...rest } = options ?? {};
    return baseToast(buildMessage(content, cta), {
      ...rest,
      icon: <IconAlertError className="h-5 w-5 text-white" />,
      style: applyStyle(
        { ...baseToastStyle, backgroundColor: "#0657F9", color: "#FFFFFF" },
        rest.style
      ),
    });
  },
  warning: (content: ReactNode, options?: ToastOptionsWithCTA) => {
    const { cta, ...rest } = options ?? {};
    return baseToast(buildMessage(content, cta), {
      ...rest,
      icon: <IconAlertWarning className="h-5 w-5 text-black" />,
      style: applyStyle(
        { ...baseToastStyle, backgroundColor: "#FFDC53", color: "#000000" },
        rest.style
      ),
    });
  },
  loading: (content: ReactNode, options?: ToastOptionsWithCTA) => {
    const { cta, ...rest } = options ?? {};
    return baseLoading(buildMessage(content, cta), {
      ...rest,
      style: applyStyle(
        { ...baseToastStyle, backgroundColor: "#0657F9", color: "#FFFFFF" },
        rest.style
      ),
    });
  },
});

export const Toaster = () => {
  return (
    <HotToaster
      position="bottom-right"
      containerStyle={{ top: 20, left: 20, bottom: 20, right: 20 }}
      toastOptions={{
        duration: 5000,
        className: "rounded-lg px-4 py-3 text-sm font-semibold shadow-lg",
        style: baseToastStyle,
      }}
    />
  );
};

export { toast };
