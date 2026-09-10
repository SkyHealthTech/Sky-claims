-- ============================================================
-- Sky Claims — Supabase Schema
-- Run this in the SKY CHAMBER Supabase project.
-- Practices + providers already exist — this adds claims tables only.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- SECTION A — Add billing credential columns to existing providers
-- (safe — uses IF NOT EXISTS)
-- ──────────────────────────────────────────────────────────────

alter table providers
  add column if not exists payee_number         text,
  add column if not exists practitioner_number  text,
  add column if not exists prac_id              text,
  add column if not exists business_arrangement text,
  add column if not exists ohip_billing_number  text;

-- ──────────────────────────────────────────────────────────────
-- SECTION B — Sky Claims tables
-- ──────────────────────────────────────────────────────────────

-- Eligibility checks -------------------------------------------
create table if not exists eligibility_checks (
  id              uuid primary key default uuid_generate_v4(),
  practice_id     uuid references practices(id) on delete cascade not null,
  provider_id     uuid references providers(id) on delete set null,
  province        text not null,
  health_card_no  text not null,
  patient_name    text,
  date_of_birth   date,
  checked_at      timestamptz default now(),
  eligible        boolean,
  coverage_type   text,
  message         text,
  raw_response    jsonb
);

-- Claims -------------------------------------------------------
create table if not exists claims (
  id                uuid primary key default uuid_generate_v4(),
  practice_id       uuid references practices(id) on delete cascade not null,
  provider_id       uuid references providers(id) on delete set null,
  province          text not null,
  patient_name      text,
  health_card_no    text not null,
  date_of_birth     date,
  service_date      date not null,
  diagnosis_code    text,
  fee_codes         jsonb default '[]',
  subtotal          numeric(10,2) default 0,
  claim_note        text,
  intermediary_ref  text,
  batch_id          text,
  status            text default 'draft',
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
  id                uuid primary key default uuid_generate_v4(),
  practice_id       uuid references practices(id) on delete cascade not null,
  province          text not null,
  remittance_date   date not null,
  period_start      date,
  period_end        date,
  total_claims      int default 0,
  total_paid        numeric(10,2) default 0,
  total_rejected    int default 0,
  total_held        numeric(10,2) default 0,
  raw_data          jsonb,
  processed_at      timestamptz default now(),
  created_at        timestamptz default now()
);

-- Remittance line items ----------------------------------------
create table if not exists remittance_lines (
  id                uuid primary key default uuid_generate_v4(),
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
-- SECTION C — Row Level Security
-- Sky Chamber uses practice_memberships for access control.
-- A user can access a practice's data if they have an active membership.
-- ──────────────────────────────────────────────────────────────

alter table eligibility_checks enable row level security;
alter table claims            enable row level security;
alter table remittances       enable row level security;
alter table remittance_lines  enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'eligibility_checks' and policyname = 'eligibility_member') then
    create policy eligibility_member on eligibility_checks
      using (
        practice_id in (
          select practice_id from practice_memberships
          where user_id = auth.uid() and is_active = true
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'claims' and policyname = 'claims_member') then
    create policy claims_member on claims
      using (
        practice_id in (
          select practice_id from practice_memberships
          where user_id = auth.uid() and is_active = true
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'remittances' and policyname = 'remittances_member') then
    create policy remittances_member on remittances
      using (
        practice_id in (
          select practice_id from practice_memberships
          where user_id = auth.uid() and is_active = true
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'remittance_lines' and policyname = 'remittance_lines_member') then
    create policy remittance_lines_member on remittance_lines
      using (
        remittance_id in (
          select r.id from remittances r
          join practice_memberships pm on pm.practice_id = r.practice_id
          where pm.user_id = auth.uid() and pm.is_active = true
        )
      );
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────
-- SECTION D — Indexes
-- ──────────────────────────────────────────────────────────────

create index if not exists claims_practice_id_idx   on claims(practice_id);
create index if not exists claims_status_idx        on claims(status);
create index if not exists claims_service_date_idx  on claims(service_date);
create index if not exists claims_health_card_idx   on claims(health_card_no);
create index if not exists eligibility_practice_idx on eligibility_checks(practice_id);
create index if not exists remittances_practice_idx on remittances(practice_id);
create index if not exists remittance_lines_rem_idx on remittance_lines(remittance_id);

-- ──────────────────────────────────────────────────────────────
-- SECTION E — Auto-update updated_at on claims
-- ──────────────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists claims_updated_at on claims;
create trigger claims_updated_at
  before update on claims
  for each row execute function set_updated_at();
