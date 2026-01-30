"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-app text-text-primary">
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-bold">Something went wrong!</h2>
        <p className="text-text-secondary max-w-md">
          An unexpected error occurred.
        </p>
        <div className="pt-4">
          <Button variant="secondary" onClick={() => reset()}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
