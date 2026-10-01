-- Ajmo · Supabase podešavanje (besplatni AI limit + podaci korisnika)
-- Supabase → SQL Editor → New query → zalijepi cijeli fajl → Run.
-- Bezbjedno je pokrenuti više puta (već napravljeno se preskače ili osvježi).

-- =====================================================================
-- 1) Podaci aplikacije po korisniku (obroci, istorija, težina, podešavanja)
--    Ranije su bili u user_metadata naloga, koji ulazi u login token.
-- =====================================================================
create table if not exists public.user_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,  -- brisanje naloga briše i podatke
  state      jsonb not null,
  updated_at timestamptz not null default now(),
  constraint user_state_size check (pg_column_size(state) < 2000000)       -- zaštita od ogromnih upisa (~2 MB)
);

-- RLS: svaki korisnik vidi i mijenja SAMO svoj red.
alter table public.user_state enable row level security;
drop policy if exists user_state_select_own on public.user_state;
drop policy if exists user_state_insert_own on public.user_state;
drop policy if exists user_state_update_own on public.user_state;
create policy user_state_select_own on public.user_state for select to authenticated using (auth.uid() = user_id);
create policy user_state_insert_own on public.user_state for insert to authenticated with check (auth.uid() = user_id);
create policy user_state_update_own on public.user_state for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.user_state to authenticated;
revoke all on public.user_state from anon;

-- =====================================================================
-- 2) Besplatni AI limit (brojač poziva)
-- =====================================================================

-- Dnevni brojač AI poziva po korisniku / uređaju / IP adresi.
-- subject: 'u:<user_id>' (nalog), 'd:<device_id>' (gost), 'ip:<adresa>' (gost, širi limit)
create table if not exists public.ai_usage (
  subject text not null,
  day     date not null,
  kind    text not null,            -- estimate / coach
  count   int  not null default 0,
  primary key (subject, day, kind)
);

-- RLS uključen bez ijedne politike: tabelu može čitati/pisati samo server (service_role ključ),
-- nikako aplikacija u pregledaču.
alter table public.ai_usage enable row level security;

-- Atomski: uračunaj poziv samo ako je ispod limita. Vraća novi broj, ili NULL kad je limit dostignut.
create or replace function public.ai_usage_hit(p_subject text, p_day date, p_kind text, p_limit int)
returns int
language plpgsql security definer set search_path = public
as $$
declare c int;
begin
  if p_limit <= 0 then return null; end if;
  insert into ai_usage(subject, day, kind, count) values (p_subject, p_day, p_kind, 1)
  on conflict (subject, day, kind) do update
    set count = ai_usage.count + 1
    where ai_usage.count < p_limit
  returning count into c;
  return c;
end $$;

-- Vraćanje poziva kad AI nije uspio (korisnik ne gubi besplatnu procjenu zbog naše greške).
create or replace function public.ai_usage_refund(p_subject text, p_day date, p_kind text)
returns int
language plpgsql security definer set search_path = public
as $$
declare c int;
begin
  update ai_usage set count = greatest(count - 1, 0)
   where subject = p_subject and day = p_day and kind = p_kind
  returning count into c;
  -- usput počisti stare dane (brojač treba samo za danas)
  delete from ai_usage where day < p_day - 7;
  return coalesce(c, 0);
end $$;

-- Funkcije smije zvati samo server.
revoke all on function public.ai_usage_hit(text, date, text, int) from public, anon, authenticated;
revoke all on function public.ai_usage_refund(text, date, text) from public, anon, authenticated;
grant execute on function public.ai_usage_hit(text, date, text, int) to service_role;
grant execute on function public.ai_usage_refund(text, date, text) to service_role;
