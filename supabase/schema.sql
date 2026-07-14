create extension if not exists pgcrypto;

create table if not exists public.repository_entities (
  id uuid primary key default gen_random_uuid(),
  entity_key text not null unique,
  entity_id text,
  entity_name text not null,
  entity_type text,
  author text,
  publisher text,
  contact text,
  account_manager text,
  group_type text,
  source text not null default 'sheet',
  source_sheet_id text,
  series_count integer not null default 0,
  books numeric,
  active_in_sheet boolean not null default true,
  raw_row jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.repository_ips (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_sheet_id text,
  source_row_number integer,
  source_hash text,
  entity_key text not null,
  entity_id text,
  entity_name text not null,
  entity_type text,
  author text,
  publisher text,
  contact text,
  account_manager text,
  status text,
  closures text,
  ip_id text,
  series text not null,
  asin text,
  market text,
  language text,
  genre text,
  subgenre text,
  length_hrs numeric,
  total_books numeric,
  rating numeric,
  num_ratings numeric,
  amazon text,
  goodreads text,
  source text not null default 'sheet',
  deal_id text,
  active_in_sheet boolean not null default true,
  removed_from_sheet_at timestamptz,
  raw_row jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deals (
  deal_id text primary key,
  entity_key text,
  entity_name text,
  status text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sheet_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_sheet_id text not null,
  spreadsheet_id text,
  gid text,
  tab_name text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_read integer not null default 0,
  rows_upserted integer not null default 0,
  rows_marked_removed integer not null default 0,
  status text not null default 'started',
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_repository_entities_name on public.repository_entities using btree (lower(entity_name));
create index if not exists idx_repository_entities_source_sheet on public.repository_entities (source_sheet_id);
create index if not exists idx_repository_ips_entity_key on public.repository_ips (entity_key);
create index if not exists idx_repository_ips_entity_name on public.repository_ips using btree (lower(entity_name));
create index if not exists idx_repository_ips_series on public.repository_ips using btree (lower(series));
create index if not exists idx_repository_ips_source_sheet_active on public.repository_ips (source_sheet_id, active_in_sheet);
create index if not exists idx_repository_ips_ip_id on public.repository_ips (ip_id);
create index if not exists idx_deals_entity_key on public.deals (entity_key);
create index if not exists idx_sheet_import_runs_started on public.sheet_import_runs (started_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists repository_entities_set_updated_at on public.repository_entities;
create trigger repository_entities_set_updated_at
before update on public.repository_entities
for each row execute function public.set_updated_at();

drop trigger if exists repository_ips_set_updated_at on public.repository_ips;
create trigger repository_ips_set_updated_at
before update on public.repository_ips
for each row execute function public.set_updated_at();

drop trigger if exists deals_set_updated_at on public.deals;
create trigger deals_set_updated_at
before update on public.deals
for each row execute function public.set_updated_at();

alter table public.repository_entities enable row level security;
alter table public.repository_ips enable row level security;
alter table public.deals enable row level security;
alter table public.sheet_import_runs enable row level security;

-- No public RLS policies are added yet. The app reads/writes through Vercel API
-- routes using a backend-only Supabase secret key.
