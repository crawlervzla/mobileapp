-- Mobileapp en el proyecto Supabase compartido de AComprarYa.
-- Las filas antiguas quedan con consent_version nulo; no se les asigna una versión posterior.

alter table public.mob_leads add column if not exists consent_version text;

alter table public.mob_leads alter column startup_capital drop not null;
alter table public.mob_leads alter column project_budget drop not null;

comment on column public.mob_leads.consent_version is
  'Identificador del aviso de mobileapp.cl aceptado. Nulo en filas anteriores; no rellenar con una versión posterior.';

-- El límite por correo y la inserción ocurren en la misma transacción.
-- pg_advisory_xact_lock serializa las solicitudes simultáneas del mismo correo.
-- No guarda la dirección IP.

create or replace function public.mob_insert_mobileapp_lead(payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  lead_email text;
  recent_count integer;
begin
  lead_email := lower(btrim(payload->>'email'));
  if lead_email is null or lead_email = '' then
    return 'invalid';
  end if;

  perform pg_advisory_xact_lock(hashtext('mobileapp-lead:' || lead_email));

  select count(*) into recent_count
  from public.mob_leads
  where lower(email) = lead_email
    and created_at >= now() - interval '1 hour';

  if recent_count >= 3 then
    return 'rate_limited';
  end if;

  insert into public.mob_leads (
    full_name,
    email,
    phone,
    location,
    business_name,
    business_stage,
    industry,
    services,
    challenge,
    startup_capital,
    project_budget,
    timeline,
    consent_at,
    consent_version
  ) values (
    payload->>'full_name',
    lead_email,
    nullif(payload->>'phone', ''),
    payload->>'location',
    nullif(payload->>'business_name', ''),
    payload->>'business_stage',
    payload->>'industry',
    coalesce(array(select jsonb_array_elements_text(payload->'services')), '{}'),
    payload->>'challenge',
    nullif(payload->>'startup_capital', ''),
    nullif(payload->>'project_budget', ''),
    payload->>'timeline',
    now(),
    nullif(payload->>'consent_version', '')
  );

  return 'inserted';
end;
$$;

revoke all on function public.mob_insert_mobileapp_lead(jsonb) from public, anon, authenticated;
grant execute on function public.mob_insert_mobileapp_lead(jsonb) to service_role;
