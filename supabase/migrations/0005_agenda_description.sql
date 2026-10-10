-- Werkly: beschrijving bij agenda-items. Uitvoeren in Supabase > SQL Editor, ná 0004. Veilig om opnieuw uit te voeren.
alter table public.agenda_items add column if not exists description text;
