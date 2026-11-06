"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Video, ExternalLink, Loader2 } from "lucide-react";

interface Album {
  id: string;
  concepto: string;
  mes: string | null;
  tipo: string;
  link_drive: string | null;
  sede_nombre?: string;
  categoria_nombre?: string;
  created_at: string;
}

export default function FotosApoderadoPage() {
  const supabase = createClient();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: sedes }, { data: cats }] = await Promise.all([
        supabase.from("sedes").select("id, nombre"),
        supabase.from("categorias").select("id, nombre"),
      ]);

      const sedeMap = new Map((sedes ?? []).map((s: any) => [s.id, s.nombre]));
      const catMap = new Map((cats ?? []).map((c: any) => [c.id, c.nombre]));

      const { data } = (await supabase
        .from("albums")
        .select("*")
        .order("created_at", { ascending: false })) as { data: any[] | null; error: any };

      setAlbums(
        (data ?? []).map((a: any) => ({
          ...a,
          sede_nombre: sedeMap.get(a.sede_id) ?? "",
          categoria_nombre: catMap.get(a.categoria_id) ?? "",
        }))
      );
      setLoading(false);
    }
    load();
  }, [supabase]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Fotos y Videos</h1>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : albums.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Camera className="mx-auto h-8 w-8 mb-2" />
          <p>No hay álbumes disponibles</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {albums.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {a.tipo === "FOTO" ? (
                      <Camera className="h-4 w-4 text-primary" />
                    ) : (
                      <Video className="h-4 w-4 text-primary" />
                    )}
                    <h3 className="text-sm font-bold">{a.concepto}</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {a.tipo}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                  {a.mes && <span>{a.mes}</span>}
                  {a.sede_nombre && <span>· {a.sede_nombre}</span>}
                  {a.categoria_nombre && <span>· {a.categoria_nombre}</span>}
                </div>
                {a.link_drive && (
                  <a
                    href={a.link_drive}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                  >
                    <ExternalLink className="h-3 w-3" /> Abrir en Drive
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
