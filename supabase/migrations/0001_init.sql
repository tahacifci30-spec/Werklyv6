-- Werkly: eerste schema. Uitvoeren in Supabase > SQL Editor (één keer).
-- Raakt de bestaande tabel public.leads alleen aan om haar dicht te zetten (stap 1).

-- ---------------------------------------------------------------------------
-- STAP 1: lek dichten. public.leads had RLS UIT: iedereen met de publishable key
-- (staat in elke browser) kon alle klantgegevens lezen, wijzigen en verwijderen.
-- Zonder policies is de tabel daarna alleen bereikbaar met de service-role sleutel.
-- De data blijft staan; de oude app gebruikt deze tabel niet meer.
-- ---------------------------------------------------------------------------
alter table public.leads enable row level security;
revoke all on public.leads from anon, authenticated;

-- ---------------------------------------------------------------------------
-- STAP 2: nieuwe tabellen
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Voor Supabase Auth (volgende stap): koppelt een gebruiker aan een bedrijf en rol.
create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  company_id uuid not null references public.companies on delete cascade,
  role text not null check (role in ('owner', 'technician')),
  full_name text not null
);

create table public.company_settings (
  company_id uuid primary key references public.companies on delete cascade,
  company_name text not null,
  phone text not null default '',
  email text not null,
  pricing jsonb not null,             -- zelfde vorm als PricingRules in lib/pricing/rules.ts
  updated_at timestamptz not null default now()
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies on delete cascade,
  created_at timestamptz not null default now(),
  customer jsonb not null,            -- {name,email,phone,postcode,street,city}
  answers jsonb not null,             -- {vraag-id: optie-id | "unknown"}
  estimate jsonb not null,            -- {min,max,unknownFactors[]}
  status text not null default 'new' check (status in (
    'new','in_progress','visit_to_plan','visit_planned','visit_done',
    'quote_preparing','quote_review','quote_sent','accepted','rejected')),
  appointment jsonb,                  -- {date,time,technician}
  tech_check jsonb not null,          -- per veld {value, source}
  quote jsonb,                        -- {items[],generated_at,reviewed_at,sent_at,decided_at}
  token text not null unique check (token ~ '^[0-9a-f]{32}$'),  -- geheime offertelink
  consent_at timestamptz not null,
  customer_photos text[] not null default '{}',
  notes jsonb not null default '[]',
  log jsonb not null default '[]'
);
create index requests_company_status on public.requests (company_id, status);
create index requests_company_created on public.requests (company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- STAP 3: RLS aan op alles. De app praat via de server met de service-role sleutel
-- (die RLS omzeilt) en filtert zelf op company_id. Er is bewust GEEN policy voor
-- anon: de publieke intake schrijft uitsluitend via /api/intake op de server.
-- De policies voor ingelogde gebruikers zijn voorbereid voor Supabase Auth.
-- ---------------------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_settings enable row level security;
alter table public.requests enable row level security;

create or replace function public.my_company() returns uuid
  language sql stable security definer set search_path = public
  as $$ select company_id from public.profiles where user_id = auth.uid() $$;

create policy own_company on public.companies for select to authenticated
  using (id = public.my_company());
create policy own_profile on public.profiles for select to authenticated
  using (company_id = public.my_company());
create policy own_settings on public.company_settings for all to authenticated
  using (company_id = public.my_company()) with check (company_id = public.my_company());
create policy own_requests on public.requests for all to authenticated
  using (company_id = public.my_company()) with check (company_id = public.my_company());

-- ---------------------------------------------------------------------------
-- STAP 4: eerste bedrijf. Dit id staat als standaard in lib/defaults.ts
-- (overschrijfbaar met DEFAULT_COMPANY_ID in .env.local).
-- ---------------------------------------------------------------------------
insert into public.companies (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Demo Installatie');

insert into public.company_settings (company_id, company_name, phone, email, pricing)
values (
  '00000000-0000-0000-0000-000000000001', 'Demo Installatie', '013 000 00 00', 'info@demo-installatie.nl',
  '{"firstUnit":1850,"extraUnit":1350,"unitsBySpaces":{"living":1,"bedroom":1,"living_bedroom":2,"multiple":3},
    "areaSurcharge":{"lt20":0,"20_30":250,"30_40":500,"gt40":900},
    "propertySurcharge":{"apartment":0,"terraced":0,"corner":100,"detached":200},
    "purposeSurcharge":{"cooling":0,"both":300},
    "systemSurcharge":{"multisplit":350,"separate":0},
    "existingAdjustment":{"none":0,"replace":-150,"piping":-250},
    "spreadLow":0.92,"spreadHigh":1.15,"unknownSpread":0.04,"rounding":50,
    "quote":{"installation":650,"extraPipeMid":150,"extraPipeLong":300,"hardWall":120,"meterBoxWork":250}}'::jsonb
);
