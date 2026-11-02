begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select * from no_plan();

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'owner@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'editor@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'viewer@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'outsider@example.com');

create temp table ctx (key text primary key, value text);
grant all on ctx to authenticated;

create function pg_temp.login(letter text) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-0000-0000-00000000000' || letter, 'role', 'authenticated')::text,
    true);
$$;
create function pg_temp.val(k text) returns uuid language sql as $$
  select value::uuid from ctx where key = k;
$$;
grant execute on all functions in schema pg_temp to authenticated;

set local role authenticated;

-- Household with an editor and a viewer, and a second household owned by the outsider.
select pg_temp.login('a');
insert into ctx select 'h', create_household('Home', 'Olive')::text;
insert into ctx select 'code_e', (create_invite(pg_temp.val('h'), 'editor')).code;
insert into ctx select 'code_v', (create_invite(pg_temp.val('h'), 'viewer')).code;
select pg_temp.login('b');
select join_household((select value from ctx where key = 'code_e'), 'Ben');
select pg_temp.login('c');
select join_household((select value from ctx where key = 'code_v'), 'Cat');
select pg_temp.login('d');
insert into ctx select 'other', create_household('Other', 'Dan')::text;
insert into categories (household_id, name) values (pg_temp.val('other'), 'Other shelf');
insert into ctx select 'other_cat', id::text from categories where name = 'Other shelf';

-- Editors can write
select pg_temp.login('b');
insert into categories (household_id, name) values (pg_temp.val('h'), 'Kitchen');
insert into ctx select 'cat', id::text from categories where name = 'Kitchen';
select lives_ok(format($$insert into items (household_id, category_id, name, tracking_type, quantity, low_threshold) values (%L, %L, 'Eggs', 'counter', 6, 2)$$, pg_temp.val('h'), pg_temp.val('cat')), 'editor can add a counter item');
select lives_ok(format($$insert into items (household_id, category_id, name, tracking_type, in_stock) values (%L, %L, 'Dish soap', 'yes_no', false)$$, pg_temp.val('h'), pg_temp.val('cat')), 'editor can add an empty yes/no item');
select is((select updated_by from items where name = 'Eggs'), auth.uid(), 'updated_by is recorded');

-- Spoofing and bad values
select throws_ok(format($$insert into items (household_id, category_id, name, tracking_type, quantity, updated_by) values (%L, %L, 'Fake', 'counter', 1, %L)$$, pg_temp.val('h'), pg_temp.val('cat'), '00000000-0000-0000-0000-00000000000a'), '42501', null, 'cannot set updated_by');
select throws_ok(format($$insert into items (household_id, category_id, name, tracking_type, quantity) values (%L, %L, 'Neg', 'counter', -1)$$, pg_temp.val('h'), pg_temp.val('cat')), '23514', null, 'quantity cannot be negative');
select throws_ok(format($$insert into items (household_id, category_id, name, tracking_type) values (%L, %L, 'Blank', 'counter')$$, pg_temp.val('h'), pg_temp.val('cat')), '23514', null, 'counter needs a quantity');
select throws_ok(format($$insert into items (household_id, category_id, name, tracking_type, in_stock, quantity) values (%L, %L, 'Both', 'yes_no', true, 1)$$, pg_temp.val('h'), pg_temp.val('cat')), '23514', null, 'yes/no item cannot have a quantity');
select throws_ok(format($$insert into items (household_id, category_id, name, tracking_type, quantity, low_threshold) values (%L, %L, 'Zero', 'counter', 1, 0)$$, pg_temp.val('h'), pg_temp.val('cat')), '23514', null, 'threshold must be at least 1');
select throws_ok(format($$insert into items (household_id, category_id, name, tracking_type, quantity) values (%L, %L, ' eggs ', 'counter', 1)$$, pg_temp.val('h'), pg_temp.val('cat')), '23505', null, 'names are unique within a category');
select throws_ok(format($$insert into categories (household_id, name) values (%L, 'KITCHEN')$$, pg_temp.val('h')), '23505', null, 'category names are unique within a household');
select throws_ok($$update items set tracking_type = 'yes_no' where name = 'Eggs'$$, '42501', null, 'tracking type is fixed');
select throws_ok(format($$update items set household_id = %L where name = 'Eggs'$$, pg_temp.val('other')), '42501', null, 'items cannot move households');

-- Viewers are read-only
select pg_temp.login('c');
select is((select count(*) from items), 2::bigint, 'viewer can read items');
select is((select count(*) from categories), 1::bigint, 'viewer can read categories');
select throws_ok(format($$insert into categories (household_id, name) values (%L, 'Nope')$$, pg_temp.val('h')), '42501', null, 'viewer cannot add a category');
select throws_ok(format($$insert into items (household_id, category_id, name, tracking_type, quantity) values (%L, %L, 'Nope', 'counter', 1)$$, pg_temp.val('h'), pg_temp.val('cat')), '42501', null, 'viewer cannot add an item');
update items set quantity = 99 where name = 'Eggs';
delete from items where name = 'Eggs';
delete from categories where name = 'Kitchen';
select is((select quantity from items where name = 'Eggs'), 6, 'viewer cannot change or delete');

-- Outsiders see and touch nothing
select pg_temp.login('d');
select is((select count(*) from items where household_id = pg_temp.val('h')), 0::bigint, 'outsider sees no items');
select is((select count(*) from categories where household_id = pg_temp.val('h')), 0::bigint, 'outsider sees no categories');
select throws_ok(format($$insert into items (household_id, category_id, name, tracking_type, quantity) values (%L, %L, 'Nope', 'counter', 1)$$, pg_temp.val('h'), pg_temp.val('cat')), '42501', null, 'outsider cannot add an item');
update items set quantity = 99 where name = 'Eggs';
select pg_temp.login('b');
select is((select quantity from items where name = 'Eggs'), 6, 'outsider could not change an item');

-- Items cannot point across households
select throws_ok(format($$update items set category_id = %L where name = 'Eggs'$$, pg_temp.val('other_cat')), '23503', null, 'cannot use another household''s category');

-- Deleting
select pg_temp.login('a');
select lives_ok($$delete from categories where name = 'Kitchen'$$, 'owner can delete a category');
select is((select count(*) from items), 0::bigint, 'its items go with it');

select * from finish();
rollback;
