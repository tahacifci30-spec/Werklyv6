-- Werkly: aanvulling voor publiceren (Netlify). Uitvoeren in Supabase > SQL Editor, ná 0001.

-- Privé opslagplek voor foto's. Geen publieke toegang: de app haalt ze op via de server
-- (/api/photo/...) en alleen voor ingelogde gebruikers.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- Demo-aanvragen vanaf de marketingsite (het formulier op de startpagina).
create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  company text not null,
  email text not null,
  size text,
  consent_at timestamptz not null
);

-- RLS aan, geen policies: alleen de server (service-role sleutel) schrijft en leest hier.
alter table public.demo_requests enable row level security;
