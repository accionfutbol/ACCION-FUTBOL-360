"use client";

import { useState, useRef, useMemo } from "react";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";

interface Sede { id: string; nombre: string }
interface Categoria { id: string; nombre: string; sede_id: string }

interface FilaCSV {
  [key: string]: string;
}

interface FilaProcesada {
  nombre: string;
  rut: string;
  fecha_nacimiento: string | null;
  anio_nacimiento: number | null;
  sexo: string | null;
  nacionalidad: string | null;
  comuna: string | null;
  telefono_jugador: string | null;
  email_jugador: string | null;
  nombre_apoderado: string | null;
  telefono_apoderado: string | null;
  email_apoderado: string | null;
  estado: string;
  tipo: string | null;
  posicion_principal: string | null;
  error?: string;
}

const COL_MAP: Record<string, string> = {
  nombre: "nombre",
  jugador: "nombre",
  "nombre jugador": "nombre",
  "nombre completo": "nombre",
  rut: "rut",
  "rut jugador": "rut",
  "fecha nacimiento": "fecha_nacimiento",
  "fecha de nacimiento": "fecha_nacimiento",
  nacimiento: "fecha_nacimiento",
  "año nacimiento": "anio_nacimiento",
  "año": "anio_nacimiento",
  anio: "anio_nacimiento",
  sexo: "sexo",
  genero: "sexo",
  género: "sexo",
  nacionalidad: "nacionalidad",
  comuna: "comuna",
  telefono: "telefono_jugador",
  "telefono jugador": "telefono_jugador",
  "tel jugador": "telefono_jugador",
  celular: "telefono_jugador",
  email: "email_jugador",
  "email jugador": "email_jugador",
  correo: "email_jugador",
  apoderado: "nombre_apoderado",
  "nombre apoderado": "nombre_apoderado",
  "tel apoderado": "telefono_apoderado",
  "telefono apoderado": "telefono_apoderado",
  "email apoderado": "email_apoderado",
  "correo apoderado": "email_apoderado",
  estado: "estado",
  tipo: "tipo",
  posicion: "posicion_principal",
  "posición": "posicion_principal",
  "posicion principal": "posicion_principal",
};

function normalizeKey(key: string): string {
  const k = key.toLowerCase().trim().replace(/[_\-\.]/g, " ").replace(/\s+/g, " ");
  return COL_MAP[k] ?? k;
}

function cleanRut(rut: string): string {
  return rut.replace(/\s/g, "").replace(/\./g, "").toUpperCase();
}

export function CargaMasiva({
  sedes,
  categorias,
  onDone,
  onClose,
}: {
  sedes: Sede[];
  categorias: Categoria[];
  onDone: () => void;
  onClose: () => void;
}) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [rawRows, setRawRows] = useState<FilaCSV[]>([]);
  const [headerMap, setHeaderMap] = useState<Record<string, string>>({});
  const [sedeId, setSedeId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: number; errors: string[] }>({ ok: 0, errors: [] });

  const categoriasFiltered = categorias.filter((c) => c.sede_id === sedeId);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (res) => {
        if (res.data.length === 0) return;
        const rows = res.data as FilaCSV[];
        setRawRows(rows);

        const headers = Object.keys(rows[0]);
        const map: Record<string, string> = {};
        for (const h of headers) {
          const norm = normalizeKey(h);
          if (["nombre", "rut", "fecha_nacimiento", "anio_nacimiento", "sexo", "nacionalidad", "comuna", "telefono_jugador", "email_jugador", "nombre_apoderado", "telefono_apoderado", "email_apoderado", "estado", "tipo", "posicion_principal"].includes(norm)) {
            map[h] = norm;
          }
        }
        setHeaderMap(map);
        setStep("preview");
      },
    });
  }

  const processed: FilaProcesada[] = useMemo(() => {
    const seen = new Set<string>();
    return rawRows.map((row) => {
      const mapped: any = {};
      for (const [csvCol, dbCol] of Object.entries(headerMap)) {
        mapped[dbCol] = (row[csvCol] ?? "").trim();
      }

      const nombre = mapped.nombre || "";
      let rut = mapped.rut ? cleanRut(mapped.rut) : "";
      let error = "";

      if (!nombre) error = "Sin nombre";
      if (!rut) {
        if (!error) error = "Sin RUT";
      } else if (seen.has(rut)) {
        error = "RUT duplicado en archivo";
      }
      seen.add(rut);

      let anio: number | null = null;
      if (mapped.anio_nacimiento) {
        anio = parseInt(mapped.anio_nacimiento);
        if (isNaN(anio)) anio = null;
      } else if (mapped.fecha_nacimiento) {
        const d = parseDateFlex(mapped.fecha_nacimiento);
        if (d) anio = d.getFullYear();
      }

      return {
        nombre,
        rut,
        fecha_nacimiento: mapped.fecha_nacimiento ? parseDateToISO(mapped.fecha_nacimiento) : null,
        anio_nacimiento: anio,
        sexo: mapped.sexo || null,
        nacionalidad: mapped.nacionalidad || null,
        comuna: mapped.comuna || null,
        telefono_jugador: mapped.telefono_jugador || null,
        email_jugador: mapped.email_jugador || null,
        nombre_apoderado: mapped.nombre_apoderado || null,
        telefono_apoderado: mapped.telefono_apoderado || null,
        email_apoderado: mapped.email_apoderado || null,
        estado: mapped.estado?.toUpperCase() || "NEW",
        tipo: mapped.tipo?.toUpperCase() || null,
        posicion_principal: mapped.posicion_principal?.toUpperCase() || null,
        error,
      };
    });
  }, [rawRows, headerMap]);

  const valid = processed.filter((p) => !p.error);
  const invalid = processed.filter((p) => !!p.error);

  function removeRow(i: number) {
    setRawRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleImport() {
    if (!sedeId || !categoriaId) return;
    setLoading(true);
    const errors: string[] = [];
    let ok = 0;

    const BATCH = 50;
    for (let i = 0; i < valid.length; i += BATCH) {
      const batch = valid.slice(i, i + BATCH).map(({ error: _e, ...row }) => ({
        ...row,
        sede_id: sedeId,
        categoria_id: categoriaId,
        estado: row.estado || "NEW",
      }));

      const { error, data } = await supabase
        .from("jugadores")
        .insert(batch)
        .select("id");

      if (error) {
        if (error.message.includes("duplicate")) {
          for (const row of batch) {
            const { error: singleErr } = await supabase.from("jugadores").insert(row);
            if (singleErr) {
              errors.push(`${row.nombre} (${row.rut}): ${singleErr.message.includes("duplicate") ? "RUT ya existe" : singleErr.message}`);
            } else {
              ok++;
            }
          }
        } else {
          errors.push(`Lote ${Math.floor(i / BATCH) + 1}: ${error.message}`);
        }
      } else {
        ok += data?.length ?? batch.length;
      }
    }

    setResult({ ok, errors });
    setStep("result");
    setLoading(false);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-3 top-[5%] z-50 mx-auto max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-xl md:inset-x-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold">Carga masiva</h2>
              <p className="text-xs text-muted-foreground">Importar jugadores desde CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {/* ── STEP 1: Upload ── */}
          {step === "upload" && (
            <div className="space-y-5">
              <div
                onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-12 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">Arrastra o haz click para subir</p>
                  <p className="text-xs text-muted-foreground">Archivo .csv (separado por comas o punto y coma)</p>
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Columnas reconocidas</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Nombre", "RUT", "Fecha Nacimiento", "Año", "Sexo", "Comuna", "Teléfono", "Email", "Apoderado", "Tel Apoderado", "Email Apoderado", "Estado", "Tipo", "Posición"].map((c) => (
                    <span key={c} className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{c}</span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Solo Nombre y RUT son obligatorios. Las demás son opcionales.</p>
              </div>
            </div>
          )}

          {/* ── STEP 2: Preview ── */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Sede + Categoría */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Sede destino</label>
                  <select
                    value={sedeId}
                    onChange={(e) => { setSedeId(e.target.value); setCategoriaId(""); }}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar</option>
                    {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Categoría destino</label>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar</option>
                    {categoriasFiltered.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>

              {/* Columnas detectadas */}
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">
                  Columnas mapeadas: {Object.entries(headerMap).map(([csv, db]) => `${csv} → ${db}`).join(", ") || "ninguna reconocida"}
                </p>
              </div>

              {/* Stats */}
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg border border-border bg-card p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{processed.length}</p>
                  <p className="text-[11px] text-muted-foreground">Total filas</p>
                </div>
                <div className="flex-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{valid.length}</p>
                  <p className="text-[11px] text-emerald-600/70">Válidas</p>
                </div>
                {invalid.length > 0 && (
                  <div className="flex-1 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
                    <p className="text-2xl font-bold text-red-500">{invalid.length}</p>
                    <p className="text-[11px] text-red-500/70">Con errores</p>
                  </div>
                )}
              </div>

              {/* Tabla preview */}
              <div className="max-h-64 overflow-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Nombre</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">RUT</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Estado</th>
                      <th className="w-8 px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {processed.map((row, i) => (
                      <tr key={i} className={`border-t border-border ${row.error ? "bg-red-500/5" : ""}`}>
                        <td className="px-3 py-1.5">
                          {row.nombre || <span className="italic text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-[11px]">{row.rut || "—"}</td>
                        <td className="px-3 py-1.5">
                          {row.error ? (
                            <span className="inline-flex items-center gap-1 text-red-500">
                              <AlertTriangle className="h-3 w-3" /> {row.error}
                            </span>
                          ) : (
                            <span className="text-emerald-600">OK</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setStep("upload"); setRawRows([]); }} className="flex-1">
                  Volver
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={loading || valid.length === 0 || !sedeId || !categoriaId}
                  className="flex-1 gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Importar {valid.length} jugador{valid.length !== 1 ? "es" : ""}
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Result ── */}
          {step === "result" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{result.ok} jugador{result.ok !== 1 ? "es" : ""} importado{result.ok !== 1 ? "s" : ""}</p>
                <p className="text-sm text-muted-foreground">
                  en {sedes.find((s) => s.id === sedeId)?.nombre} · {categorias.find((c) => c.id === categoriaId)?.nombre}
                </p>
              </div>

              {result.errors.length > 0 && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-left">
                  <p className="mb-1 text-xs font-semibold text-red-500">Errores ({result.errors.length})</p>
                  <div className="max-h-32 space-y-0.5 overflow-auto">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-400">{err}</p>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={() => { onDone(); onClose(); }} className="w-full">
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function parseDateFlex(str: string): Date | null {
  if (!str) return null;
  const s = str.trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
  // YYYY-MM-DD
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) return new Date(+ymd[1], +ymd[2] - 1, +ymd[3]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseDateToISO(str: string): string | null {
  const d = parseDateFlex(str);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
