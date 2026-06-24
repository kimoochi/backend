-- ===========================================================================
-- Notes Feature Table (tenant-scoped via memberships)
-- ===========================================================================

create table notes (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  author_id   uuid not null references users(id) on delete cascade default auth.uid(),
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Grant access to authenticated users
grant select, insert on notes to authenticated;

-- Row-Level Security
alter table notes enable row level security;

-- Policies: users belong to groups (tenants) via `memberships`.
-- A user may read and create notes only for groups they belong to.
create policy "Users can read notes in groups they belong to"
  on notes for select
  to authenticated
  using (
    group_id in (
      select group_id from memberships where user_id = auth.uid()
    )
  );

create policy "Users can create notes in groups they belong to"
  on notes for insert
  to authenticated
  with check (
    group_id in (
      select group_id from memberships where user_id = auth.uid()
    ) and
    author_id = auth.uid()
  );
