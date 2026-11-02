-- Categories and items. Owners and editors can write them directly; row-level security and
-- the constraints below keep those writes valid.

create type public.tracking_type as enum ('counter', 'yes_no');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 50),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, id)
);

create unique index categories_unique_name_idx on public.categories (household_id, lower(btrim(name)));

create table public.items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  category_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  tracking_type public.tracking_type not null,
  quantity integer,
  in_stock boolean,
  low_threshold integer check (low_threshold >= 1),
  marked_low boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null,
  -- Composite so an item can never point at another household's category.
  foreign key (household_id, category_id) references public.categories (household_id, id) on delete cascade,
  check (
    (tracking_type = 'counter' and quantity is not null and quantity >= 0 and in_stock is null)
    or (tracking_type = 'yes_no' and in_stock is not null and quantity is null and low_threshold is null)
  )
);

create unique index items_unique_name_idx on public.items (category_id, lower(btrim(name)));
create index items_household_id_idx on public.items (household_id);

create function private.stamp_item_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger stamp_item_update
  before insert or update on public.items
  for each row execute function private.stamp_item_update();

alter table public.categories enable row level security;
alter table public.items enable row level security;

revoke all on public.categories, public.items from anon, authenticated;
grant select, delete on public.categories, public.items to authenticated;
grant insert (household_id, name, sort_order) on public.categories to authenticated;
grant update (name, sort_order) on public.categories to authenticated;
grant insert (household_id, category_id, name, tracking_type, quantity, in_stock, low_threshold, marked_low)
  on public.items to authenticated;
grant update (category_id, name, quantity, in_stock, low_threshold, marked_low)
  on public.items to authenticated;

create policy "members can read categories" on public.categories
  for select to authenticated
  using (private.household_role(household_id) is not null);

create policy "editors can add categories" on public.categories
  for insert to authenticated
  with check (private.household_role(household_id) in ('owner', 'editor'));

create policy "editors can change categories" on public.categories
  for update to authenticated
  using (private.household_role(household_id) in ('owner', 'editor'))
  with check (private.household_role(household_id) in ('owner', 'editor'));

create policy "editors can delete categories" on public.categories
  for delete to authenticated
  using (private.household_role(household_id) in ('owner', 'editor'));

create policy "members can read items" on public.items
  for select to authenticated
  using (private.household_role(household_id) is not null);

create policy "editors can add items" on public.items
  for insert to authenticated
  with check (private.household_role(household_id) in ('owner', 'editor'));

create policy "editors can change items" on public.items
  for update to authenticated
  using (private.household_role(household_id) in ('owner', 'editor'))
  with check (private.household_role(household_id) in ('owner', 'editor'));

create policy "editors can delete items" on public.items
  for delete to authenticated
  using (private.household_role(household_id) in ('owner', 'editor'));
