"use client";

import { Toaster as HotToaster, toast } from "react-hot-toast";

export const Toaster = () => {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        duration: 5000,
        className: "font-sans text-sm font-medium",
        success: {
          iconTheme: { primary: "#0C0C0C", secondary: "#FFFFFF" },
          style: {
            background: "#FFFFFF",
            color: "#0C0C0C",
            border: "1px solid #E1E1E1",
          },
        },
        error: {
          iconTheme: { primary: "#C73203", secondary: "#FFFFFF" },
          style: {
            background: "#FFFFFF",
            color: "#C73203",
            border: "1px solid #C73203",
          },
        },
        loading: {
          style: {
            background: "#FFFFFF",
            color: "#0C0C0C",
            border: "1px solid #E1E1E1",
          },
        },
      }}
    />
  );
};

export { toast };
