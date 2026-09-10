-- ============================================================
-- Sky Claims — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
--
-- If Sky Claims shares the Sky Chamber Supabase project:
--   • practices + providers tables already exist — skip Section A
--   • Run Section B (billing credential columns) and Section C (claims tables)
--
-- If Sky Claims has its OWN separate Supabase project:
--   • Run everything (Sections A + B + C)
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- SECTION A — Core tables (skip if sharing Sky Chamber project)
-- ──────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

create table if not exists practices (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid references auth.users(id) on delete cascade not null,
  name                  text not null default '',
  province              text not null default '',
  city                  text,
  phone                 text,
  email                 text,
  -- Stripe
  stripe_customer_id    text unique,
  stripe_subscription_id text,
  subscription_status   text default 'trialing',
  plan                  text default 'claims_solo',
  billing_cycle         text default 'monthly',
  trial_ends_at         timestamptz,
  current_period_end    timestamptz,
  -- Onboarding
  onboarding_done       boolean default false,
  created_at            timestamptz default now()
);

create table if not exists providers (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete cascade not null,
  practice_id           uuid references practices(id) on delete cascade,
  first_name            text default '',
  last_name             text default '',
  role                  text default 'OD',
  licence_number        text,
  -- BC billing
  payee_number          text,
  practitioner_number   text,
  -- AB billing
  prac_id               text,
  business_arrangement  text,
  -- ON billing
  ohip_billing_number   text,
  created_at            timestamptz default now(),
  unique(user_id)
);

-- ──────────────────────────────────────────────────────────────
-- SECTION B — Billing credential columns
-- (Only needed if sharing Sky Chamber project AND these columns
--  don't already exist on your providers table)
-- ──────────────────────────────────────────────────────────────

alter table providers
  add column if not exists payee_number         text,
  add column if not exists practitioner_number  text,
  add column if not exists prac_id              text,
  add column if not exists business_arrangement text,
  add column if not exists ohip_billing_number  text;

alter table practices
  add column if not exists plan                  text default 'claims_solo',
  add column if not exists trial_ends_at         timestamptz,
  add column if not exists current_period_end    timestamptz;

-- ──────────────────────────────────────────────────────────────
-- SECTION C — Sky Claims tables (always run)
-- ──────────────────────────────────────────────────────────────

-- Eligibility checks -------------------------------------------
create table if not exists eligibility_checks (
  id              uuid primary key default gen_random_uuid(),
  practice_id     uuid references practices(id) on delete cascade not null,
  provider_id     uuid references providers(id) on delete set null,
  province        text not null,
  health_card_no  text not null,            -- PHN / Alberta Health # / HIN
  patient_name    text,
  date_of_birth   date,
  checked_at      timestamptz default now(),
  eligible        boolean,
  coverage_type   text,                     -- e.g. 'MSP', 'AHCIP', 'OHIP'
  message         text,                     -- human-readable result
  raw_response    jsonb                     -- full intermediary response
);

-- Claims -------------------------------------------------------
create table if not exists claims (
  id                uuid primary key default gen_random_uuid(),
  practice_id       uuid references practices(id) on delete cascade not null,
  provider_id       uuid references providers(id) on delete set null,
  province          text not null,
  -- Patient
  patient_name      text,
  health_card_no    text not null,
  date_of_birth     date,
  -- Service
  service_date      date not null,
  diagnosis_code    text,
  fee_codes         jsonb default '[]',     -- [{code, units, amount}]
  subtotal          numeric(10,2) default 0,
  -- Billing
  claim_note        text,
  intermediary_ref  text,                   -- Teleplan / H-Link sequence #
  batch_id          text,                   -- submission batch reference
  -- Status
  status            text default 'draft',   -- draft | submitted | accepted | rejected | paid
  submitted_at      timestamptz,
  paid_at           timestamptz,
  paid_amount       numeric(10,2),
  rejection_code    text,
  rejection_reason  text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Remittances --------------------------------------------------
create table if not exists remittances (
  id                uuid primary key default gen_random_uuid(),
  practice_id       uuid references practices(id) on delete cascade not null,
  province          text not null,
  remittance_date   date not null,
  period_start      date,
  period_end        date,
  total_claims      int default 0,
  total_paid        numeric(10,2) default 0,
  total_rejected    int default 0,
  total_held        numeric(10,2) default 0,
  raw_data          jsonb,                  -- full ERA / remittance file
  processed_at      timestamptz default now(),
  created_at        timestamptz default now()
);

-- Remittance line items (individual claim results in an ERA)
create table if not exists remittance_lines (
  id                uuid primary key default gen_random_uuid(),
  remittance_id     uuid references remittances(id) on delete cascade not null,
  claim_id          uuid references claims(id) on delete set null,
  health_card_no    text,
  service_date      date,
  fee_code          text,
  billed_amount     numeric(10,2),
  paid_amount       numeric(10,2),
  adjustment_code   text,
  explanation       text
);

-- ──────────────────────────────────────────────────────────────
-- SECTION D — Row Level Security
-- ──────────────────────────────────────────────────────────────

alter table practices         enable row level security;
alter table providers         enable row level security;
alter table eligibility_checks enable row level security;
alter table claims            enable row level security;
alter table remittances       enable row level security;
alter table remittance_lines  enable row level security;

-- Practices: owner only
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'practices' and policyname = 'practices_owner') then
    create policy practices_owner on practices
      using (owner_id = auth.uid());
  end if;
end $$;

-- Providers: own row or same practice
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'providers' and policyname = 'providers_own') then
    create policy providers_own on providers
      using (
        user_id = auth.uid()
        or practice_id in (select id from practices where owner_id = auth.uid())
      );
  end if;
end $$;

-- Claims: practice owner
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'claims' and policyname = 'claims_practice') then
    create policy claims_practice on claims
      using (practice_id in (select id from practices where owner_id = auth.uid()));
  end if;
end $$;

-- Eligibility: practice owner
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'eligibility_checks' and policyname = 'eligibility_practice') then
    create policy eligibility_practice on eligibility_checks
      using (practice_id in (select id from practices where owner_id = auth.uid()));
  end if;
end $$;

-- Remittances: practice owner
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'remittances' and policyname = 'remittances_practice') then
    create policy remittances_practice on remittances
      using (practice_id in (select id from practices where owner_id = auth.uid()));
  end if;
end $$;

-- Remittance lines: via remittance → practice
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'remittance_lines' and policyname = 'remittance_lines_practice') then
    create policy remittance_lines_practice on remittance_lines
      using (
        remittance_id in (
          select r.id from remittances r
          join practices p on p.id = r.practice_id
          where p.owner_id = auth.uid()
        )
      );
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────
-- SECTION E — Indexes
-- ──────────────────────────────────────────────────────────────

create index if not exists claims_practice_id_idx       on claims(practice_id);
create index if not exists claims_status_idx            on claims(status);
create index if not exists claims_service_date_idx      on claims(service_date);
create index if not exists claims_health_card_idx       on claims(health_card_no);
create index if not exists eligibility_practice_idx     on eligibility_checks(practice_id);
create index if not exists remittances_practice_idx     on remittances(practice_id);
create index if not exists remittance_lines_rem_idx     on remittance_lines(remittance_id);

-- ──────────────────────────────────────────────────────────────
-- SECTION F — Auto-update updated_at on claims
-- ──────────────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists claims_updated_at on claims;
create trigger claims_updated_at
  before update on claims
  for each row execute function set_updated_at();
