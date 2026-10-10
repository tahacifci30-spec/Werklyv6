-- Werkly: nieuw verloop (installatie plannen, factuur, betaald, afgerond), voorkeursmoment van de klant
-- en datumvoorstel. Uitvoeren in Supabase > SQL Editor, ná 0001 en 0002 en VOORDAT u de nieuwe versie publiceert.
-- Veilig om opnieuw uit te voeren.

-- Nieuwe velden op de aanvragen
alter table public.requests
  add column if not exists preferred jsonb,             -- voorkeursmoment van de klant
  add column if not exists install_appointment jsonb,   -- afspraak voor de installatie
  add column if not exists proposal jsonb,              -- voorstel met alternatieve momenten
  add column if not exists install jsonb,               -- installatieverslag van de monteur
  add column if not exists invoice jsonb;               -- factuur

-- Statussen: oude controle weghalen, oude waarden omzetten, nieuwe controle zetten
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.requests'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%status%'
  loop
    execute format('alter table public.requests drop constraint %I', c);
  end loop;
end $$;

update public.requests set status = 'new' where status in ('in_progress', 'visit_to_plan');
update public.requests set status = 'quote_review' where status = 'quote_preparing';
update public.requests set status = 'install_to_plan' where status = 'accepted';

alter table public.requests add constraint requests_status_check check (status in (
  'new', 'visit_planned', 'visit_done', 'quote_review', 'quote_sent',
  'install_to_plan', 'install_planned', 'install_done', 'invoice_sent', 'completed', 'rejected'
));

-- Bedrijfsgegevens voor de factuur (adres, KvK, btw, IBAN, betaaltermijn) en factuurteller
alter table public.company_settings
  add column if not exists details jsonb not null default '{}'::jsonb;

-- Gewenst pakket bij een demo-aanvraag
alter table public.demo_requests add column if not exists plan text;
