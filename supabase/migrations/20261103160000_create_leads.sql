-- Mobileapp en el proyecto Supabase compartido de AComprarYa (us-east-1).
-- La tabla usa el prefijo mob_ para separar estos datos de los de AComprarYa.

create table if not exists public.mob_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  location text not null,
  business_name text,
  business_stage text not null check (business_stage in ('idea', 'validacion', 'operativo')),
  industry text not null,
  services text[] not null,
  challenge text not null,
  startup_capital text not null,
  project_budget text not null,
  timeline text not null,
  consent_at timestamptz not null,
  status text not null default 'nuevo' check (status in ('nuevo', 'en_revision', 'respondido', 'descartado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mob_leads enable row level security;

revoke all on table public.mob_leads from anon, authenticated;
