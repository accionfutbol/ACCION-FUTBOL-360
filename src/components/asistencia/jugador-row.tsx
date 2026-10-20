"use client";

import type { MarcaAsistencia } from "@/lib/types";
import { MarcaButton } from "./marca-button";
import { Phone } from "lucide-react";

const marcas: MarcaAsistencia[] = ["OK", "F", "J", "L"];

interface JugadorRowProps {
  nombre: string;
  rut: string;
  estado: string;
  marca: MarcaAsistencia;
  telefonoApoderado: string | null;
  onMarcaChange: (marca: MarcaAsistencia) => void;
}

export function JugadorRow({
  nombre,
  rut,
  estado,
  marca,
  telefonoApoderado,
  onMarcaChange,
}: JugadorRowProps) {
  const whatsappUrl = telefonoApoderado
    ? `https://wa.me/56${telefonoApoderado.replace(/\D/g, "").replace(/^56/, "")}`
    : null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{nombre}</p>
        <p className="text-xs text-muted-foreground">{rut}</p>
      </div>

      <div className="flex items-center gap-1.5">
        {marcas.map((m) => (
          <MarcaButton
            key={m}
            marca={m}
            active={marca === m}
            onClick={() => onMarcaChange(m)}
          />
        ))}

        {marca === "F" && whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-white transition-colors hover:bg-green-700"
            title="Contactar apoderado por WhatsApp"
          >
            <Phone className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
