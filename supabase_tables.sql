-- Partner Mode support table.
-- Run this in your Supabase project's SQL editor (Dashboard -> SQL Editor -> New query).
-- Matches the exact columns partnerService.ts reads/writes.

create table if not exists public.partner_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid references auth.users(id) on delete cascade,
  invite_code text not null unique,
  status text not null check (status in ('pending', 'connected')),
  created_at timestamptz not null default now(),
  connected_at timestamptz
);

create index if not exists partner_connections_user_id_idx on public.partner_connections(user_id);
create index if not exists partner_connections_invite_code_idx on public.partner_connections(invite_code);

alter table public.partner_connections enable row level security;

-- A user can see their own connection row(s).
create policy "Users can view own partner connections"
  on public.partner_connections for select
  using (auth.uid() = user_id or auth.uid() = partner_id);

-- A user can create their own invite row.
create policy "Users can create own partner connections"
  on public.partner_connections for insert
  with check (auth.uid() = user_id);

-- A user can update their own row (e.g. cancel) or redeem someone else's
-- pending invite (sets partner_id = themself).
create policy "Users can update own or redeem pending partner connections"
  on public.partner_connections for update
  using (auth.uid() = user_id or (status = 'pending' and partner_id is null));

-- A user can delete their own connection row (disconnect).
create policy "Users can delete own partner connections"
  on public.partner_connections for delete
  using (auth.uid() = user_id);

-- Lets a connected partner read your sleep_records (needed by
-- partnerService.getPartnerNights). Safe to run even if a similar policy
-- already exists under a different name — Postgres will just error on
-- create policy if the exact name collides, in which case skip this block.
create policy "Partners can view each others sleep records"
  on public.sleep_records for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.partner_connections pc
      where pc.status = 'connected'
        and (
          (pc.user_id = auth.uid() and pc.partner_id = sleep_records.user_id)
          or (pc.partner_id = auth.uid() and pc.user_id = sleep_records.user_id)
        )
    )
  );
