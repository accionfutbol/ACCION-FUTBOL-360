-- Biblioteca de ejercicios de entrenamiento
create table if not exists biblioteca_ejercicios (
  id bigint primary key,
  categoria text not null,
  subcategoria text,
  nombre text not null,
  fase_modelo text,
  momento_juego text,
  objetivo text,
  formato text,
  imagen_url text,
  created_at timestamptz default now()
);

-- Índices para búsqueda rápida
create index if not exists idx_bib_categoria on biblioteca_ejercicios(categoria);
create index if not exists idx_bib_fase on biblioteca_ejercicios(fase_modelo);
create index if not exists idx_bib_momento on biblioteca_ejercicios(momento_juego);
create index if not exists idx_bib_nombre on biblioteca_ejercicios using gin(to_tsvector('spanish', nombre));

-- RLS: todos los usuarios autenticados pueden leer
alter table biblioteca_ejercicios enable row level security;

create policy "biblioteca_read" on biblioteca_ejercicios
  for select using (true);

create policy "biblioteca_admin_write" on biblioteca_ejercicios
  for all using (
    exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    )
  );
