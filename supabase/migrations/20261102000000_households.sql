-- Households, members and invites.
-- Clients can only read these tables directly. Every membership change goes through a
-- function below, so the rules (one owner per household, single-use invites) can't be bypassed.

create type public.member_role as enum ('owner', 'editor', 'viewer');

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  -- Restrict: deleting an account must not leave a household without its owner.
  user_id uuid not null references auth.users on delete restrict,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 50),
  role public.member_role not null,
  joined_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create index members_user_id_idx on public.members (user_id);
create unique index members_one_owner_idx on public.members (household_id) where role = 'owner';

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  code text not null unique,
  role public.member_role not null check (role <> 'owner'),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  revoked_at timestamptz,
  used_at timestamptz,
  used_by uuid references auth.users on delete set null
);

create index invites_household_id_idx on public.invites (household_id);

alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;

revoke all on public.households, public.members, public.invites from anon, authenticated;
grant select, delete on public.households to authenticated;
grant update (name) on public.households to authenticated;
grant select on public.members, public.invites to authenticated;

-- Lives outside the API-exposed schema. Security definer so that policies on members can
-- check membership without triggering themselves.
create schema private;
grant usage on schema private to authenticated;

create function private.household_role(target_household uuid)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.members
  where household_id = target_household and user_id = auth.uid();
$$;

revoke all on function private.household_role(uuid) from public, anon;
grant execute on function private.household_role(uuid) to authenticated;

create policy "members can read their households" on public.households
  for select to authenticated
  using (private.household_role(id) is not null);

create policy "owners can rename their households" on public.households
  for update to authenticated
  using (private.household_role(id) = 'owner')
  with check (private.household_role(id) = 'owner');

create policy "owners can delete their households" on public.households
  for delete to authenticated
  using (private.household_role(id) = 'owner');

create policy "members can read fellow members" on public.members
  for select to authenticated
  using (private.household_role(household_id) is not null);

create policy "owners can read invites" on public.invites
  for select to authenticated
  using (private.household_role(household_id) = 'owner');

-- Raises unless the caller owns the household. Locks the household row so that concurrent
-- ownership changes run one at a time.
create function private.require_owner(target_household uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.households where id = target_household for update;
  if private.household_role(target_household) is distinct from 'owner' then
    raise exception 'not_owner';
  end if;
end;
$$;

revoke all on function private.require_owner(uuid) from public, anon;
grant execute on function private.require_owner(uuid) to authenticated;

create function public.create_household(household_name text, member_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  insert into public.households (name) values (btrim(household_name)) returning id into new_id;
  insert into public.members (household_id, user_id, display_name, role)
  values (new_id, auth.uid(), btrim(member_display_name), 'owner');
  return new_id;
end;
$$;

create function public.create_invite(target_household uuid, invite_role public.member_role)
returns public.invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- 32 characters, leaving out ones that are easy to confuse (0/O, 1/I).
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  random_bytes bytea;
  new_code text;
  new_invite public.invites;
begin
  perform private.require_owner(target_household);
  if invite_role = 'owner' then
    raise exception 'invalid_role';
  end if;
  loop
    random_bytes := extensions.gen_random_bytes(8);
    new_code := '';
    for i in 0..7 loop
      new_code := new_code || substr(alphabet, get_byte(random_bytes, i) % 32 + 1, 1);
    end loop;
    begin
      insert into public.invites (household_id, code, role, created_by)
      values (target_household, new_code, invite_role, auth.uid())
      returning * into new_invite;
      return new_invite;
    exception when unique_violation then
      -- Astronomically unlikely, so just try another code.
    end;
  end loop;
end;
$$;

create function public.revoke_invite(target_invite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_household uuid;
begin
  select household_id into target_household from public.invites where id = target_invite;
  if target_household is null then
    raise exception 'not_owner';
  end if;
  perform private.require_owner(target_household);
  update public.invites set revoked_at = now()
  where id = target_invite and revoked_at is null and used_at is null;
end;
$$;

create function public.join_household(invite_code text, member_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.invites;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  -- The row lock makes two people racing for one code run in turn, so only one succeeds.
  select * into invite from public.invites
  where code = upper(btrim(invite_code))
    and revoked_at is null
    and used_at is null
    and expires_at > now()
  for update;
  -- A single error for unknown, expired, used and revoked codes reveals nothing to someone guessing.
  if not found then
    raise exception 'invalid_invite';
  end if;
  -- Raised before the invite is marked used, so the code isn't wasted.
  if exists (
    select 1 from public.members
    where household_id = invite.household_id and user_id = auth.uid()
  ) then
    raise exception 'already_member';
  end if;
  insert into public.members (household_id, user_id, display_name, role)
  values (invite.household_id, auth.uid(), btrim(member_display_name), invite.role);
  update public.invites set used_at = now(), used_by = auth.uid() where id = invite.id;
  return invite.household_id;
end;
$$;

create function public.leave_household(target_household uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.household_role(target_household) = 'owner' then
    raise exception 'owner_cannot_leave';
  end if;
  delete from public.members where household_id = target_household and user_id = auth.uid();
end;
$$;

create function public.update_display_name(target_household uuid, new_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.members set display_name = btrim(new_name)
  where household_id = target_household and user_id = auth.uid();
end;
$$;

create function public.remove_member(target_member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.members;
begin
  select * into target from public.members where id = target_member;
  if not found then
    raise exception 'not_owner';
  end if;
  perform private.require_owner(target.household_id);
  if target.role = 'owner' then
    raise exception 'cannot_change_owner';
  end if;
  delete from public.members where id = target_member;
end;
$$;

create function public.set_member_role(target_member uuid, new_role public.member_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.members;
begin
  select * into target from public.members where id = target_member;
  if not found then
    raise exception 'not_owner';
  end if;
  perform private.require_owner(target.household_id);
  if new_role = 'owner' then
    raise exception 'invalid_role';
  end if;
  if target.role = 'owner' then
    raise exception 'cannot_change_owner';
  end if;
  update public.members set role = new_role where id = target_member;
end;
$$;

create function public.transfer_ownership(target_member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.members;
begin
  select * into target from public.members where id = target_member;
  if not found then
    raise exception 'not_owner';
  end if;
  perform private.require_owner(target.household_id);
  if target.role = 'owner' then
    raise exception 'cannot_change_owner';
  end if;
  -- Demote first: the unique index allows only one owner at any moment.
  update public.members set role = 'editor'
  where household_id = target.household_id and role = 'owner';
  update public.members set role = 'owner' where id = target_member;
end;
$$;

revoke all on function
  public.create_household(text, text),
  public.create_invite(uuid, public.member_role),
  public.revoke_invite(uuid),
  public.join_household(text, text),
  public.leave_household(uuid),
  public.update_display_name(uuid, text),
  public.remove_member(uuid),
  public.set_member_role(uuid, public.member_role),
  public.transfer_ownership(uuid)
from public, anon;

grant execute on function
  public.create_household(text, text),
  public.create_invite(uuid, public.member_role),
  public.revoke_invite(uuid),
  public.join_household(text, text),
  public.leave_household(uuid),
  public.update_display_name(uuid, text),
  public.remove_member(uuid),
  public.set_member_role(uuid, public.member_role),
  public.transfer_ownership(uuid)
to authenticated;
