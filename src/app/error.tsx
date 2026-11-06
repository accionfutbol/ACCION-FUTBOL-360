"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
      <h1 className="mb-2 text-2xl font-bold">Algo salió mal</h1>
      <p className="mb-6 text-muted-foreground">
        Ocurrió un error inesperado. Por favor, intenta de nuevo.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
