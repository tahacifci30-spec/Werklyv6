-- Werkly: eigen agenda-items, niet-beschikbaar, installatievoorkeur van de klant.
-- Uitvoeren in Supabase > SQL Editor, ná 0001, 0002 en 0003. Veilig om opnieuw uit te voeren.

-- Gewenst moment voor de installatie (gekozen door de klant bij het akkoord)
alter table public.requests add column if not exists install_preferred jsonb;

-- Eigen agenda-items (bijvoorbeeld een bespreking) en dagen waarop een monteur niet kan werken
create table if not exists public.agenda_items (
  id text primary key,
  company_id uuid not null references public.companies on delete cascade,
  kind text not null check (kind in ('item', 'off')),
  title text not null,
  date date not null,
  date_to date,
  start text,
  "end" text,
  who text not null,
  created_by text not null
);
create index if not exists agenda_items_company_date on public.agenda_items (company_id, date);

-- RLS aan, geen policies: alleen de server (service-role sleutel) leest en schrijft hier.
alter table public.agenda_items enable row level security;
