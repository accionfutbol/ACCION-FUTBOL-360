"use client";

import type { MarcaAsistencia } from "@/lib/types";
import { cn } from "@/lib/utils";

const marcaConfig: Record<
  MarcaAsistencia,
  { label: string; color: string; activeColor: string }
> = {
  OK: {
    label: "OK",
    color: "border-emerald-500/30 text-emerald-400/50",
    activeColor: "bg-emerald-500 text-white border-emerald-500",
  },
  F: {
    label: "F",
    color: "border-red-500/30 text-red-400/50",
    activeColor: "bg-red-500 text-white border-red-500",
  },
  J: {
    label: "J",
    color: "border-yellow-500/30 text-yellow-400/50",
    activeColor: "bg-yellow-500 text-black border-yellow-500",
  },
  L: {
    label: "L",
    color: "border-blue-500/30 text-blue-400/50",
    activeColor: "bg-blue-500 text-white border-blue-500",
  },
  NA: {
    label: "N/A",
    color: "border-gray-500/30 text-gray-400/50",
    activeColor: "bg-gray-500 text-white border-gray-500",
  },
};

interface MarcaButtonProps {
  marca: MarcaAsistencia;
  active: boolean;
  onClick: () => void;
}

export function MarcaButton({ marca, active, onClick }: MarcaButtonProps) {
  const config = marcaConfig[marca];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 w-10 rounded-lg border-2 text-xs font-bold transition-all active:scale-95",
        active ? config.activeColor : config.color
      )}
    >
      {config.label}
    </button>
  );
}
