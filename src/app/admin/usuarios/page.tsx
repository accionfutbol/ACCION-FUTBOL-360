"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Search, Users, UserCog, Pencil } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  role: string;
  nombre: string;
  created_at: string;
}

interface Entrenador {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: string;
  user_id: string;
}

interface Apoderado {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  user_id: string;
  hijos_count: number;
}

type Tab = "profiles" | "entrenadores" | "apoderados";

export default function UsuariosAdminPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("profiles");
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  // Data
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [entrenadores, setEntrenadores] = useState<Entrenador[]>([]);
  const [apoderados, setApoderados] = useState<Apoderado[]>([]);

  // Edit profile
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit entrenador
  const [editEnt, setEditEnt] = useState<Entrenador | null>(null);
  const [entNombre, setEntNombre] = useState("");
  const [entTelefono, setEntTelefono] = useState("");
  const [entRol, setEntRol] = useState("DT");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: profs }, { data: ents }, { data: apos }, { data: rels }] = await Promise.all([
      supabase.from("profiles").select("*").order("nombre"),
      supabase.from("entrenadores").select("*").order("nombre"),
      supabase.from("apoderados").select("*").order("nombre"),
      supabase.from("jugador_apoderado").select("apoderado_id"),
    ]);

    setProfiles((profs ?? []) as Profile[]);
    setEntrenadores((ents ?? []) as Entrenador[]);

    const hijosCount: Record<string, number> = {};
    (rels ?? []).forEach((r: any) => {
      hijosCount[r.apoderado_id] = (hijosCount[r.apoderado_id] ?? 0) + 1;
    });

    setApoderados(
      ((apos ?? []) as any[]).map((a) => ({
        ...a,
        hijos_count: hijosCount[a.id] ?? 0,
      }))
    );

    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  function openEditProfile(p: Profile) {
    setEditProfile(p);
    setEditNombre(p.nombre);
    setEditRole(p.role);
  }

  async function saveProfile() {
    if (!editProfile) return;
    setSaving(true);
    await supabase.from("profiles").update({ nombre: editNombre, role: editRole as any }).eq("id", editProfile.id);
    setSaving(false);
    setEditProfile(null);
    loadData();
  }

  function openEditEntrenador(e: Entrenador) {
    setEditEnt(e);
    setEntNombre(e.nombre);
    setEntTelefono(e.telefono ?? "");
    setEntRol(e.rol);
  }

  async function saveEntrenador() {
    if (!editEnt) return;
    setSaving(true);
    await supabase.from("entrenadores").update({ nombre: entNombre, telefono: entTelefono || null, rol: entRol as any }).eq("id", editEnt.id);
    setSaving(false);
    setEditEnt(null);
    loadData();
  }

  function roleColor(role: string) {
    switch (role) {
      case "admin": return "bg-purple-500/20 text-purple-400";
      case "entrenador": return "bg-primary/20 text-primary";
      case "apoderado": return "bg-blue-500/20 text-blue-400";
      default: return "";
    }
  }

  const b = busqueda.toLowerCase();
  const filteredProfiles = profiles.filter((p) => !b || p.nombre.toLowerCase().includes(b) || p.email.toLowerCase().includes(b));
  const filteredEntrenadores = entrenadores.filter((e) => !b || e.nombre.toLowerCase().includes(b) || e.email.toLowerCase().includes(b));
  const filteredApoderados = apoderados.filter((a) => !b || a.nombre.toLowerCase().includes(b) || a.email.toLowerCase().includes(b));

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Gestión de Usuarios</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border p-1">
        {([
          { key: "profiles" as Tab, label: "Perfiles", icon: Users, count: profiles.length },
          { key: "entrenadores" as Tab, label: "Entrenadores", icon: UserCog, count: entrenadores.length },
          { key: "apoderados" as Tab, label: "Apoderados", icon: Users, count: apoderados.length },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nombre o email..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9" />
      </div>

      {/* PROFILES TAB */}
      {tab === "profiles" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-xs">{p.email}</TableCell>
                      <TableCell>
                        <Badge className={roleColor(p.role)}>{p.role}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(p.created_at).toLocaleDateString("es-CL")}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEditProfile(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ENTRENADORES TAB */}
      {tab === "entrenadores" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntrenadores.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.nombre}</TableCell>
                      <TableCell className="text-xs">{e.email}</TableCell>
                      <TableCell className="text-xs">{e.telefono ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{e.rol}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEditEntrenador(e)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* APODERADOS TAB */}
      {tab === "apoderados" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead className="text-center">Hijos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApoderados.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.nombre}</TableCell>
                      <TableCell className="text-xs">{a.email}</TableCell>
                      <TableCell className="text-xs">{a.telefono ?? "—"}</TableCell>
                      <TableCell className="text-center">{a.hijos_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Profile Dialog */}
      <Dialog open={!!editProfile} onOpenChange={(open) => { if (!open) setEditProfile(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">{editProfile?.email}</p>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={editRole} onValueChange={(v: string | null) => setEditRole(v ?? "entrenador")}>
                <SelectTrigger><SelectValue>{editRole}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="entrenador">Entrenador</SelectItem>
                  <SelectItem value="apoderado">Apoderado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveProfile} disabled={saving} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Entrenador Dialog */}
      <Dialog open={!!editEnt} onOpenChange={(open) => { if (!open) setEditEnt(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar entrenador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">{editEnt?.email}</p>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={entNombre} onChange={(e) => setEntNombre(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={entTelefono} onChange={(e) => setEntTelefono(e.target.value)} placeholder="+569..." />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={entRol} onValueChange={(v: string | null) => setEntRol(v ?? "DT")}>
                <SelectTrigger><SelectValue>{entRol}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DT">DT</SelectItem>
                  <SelectItem value="ASISTENTE">Asistente</SelectItem>
                  <SelectItem value="PF">Preparador Físico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveEntrenador} disabled={saving} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
