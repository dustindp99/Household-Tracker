begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(37);

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
create function pg_temp.code(k text) returns text language sql as $$
  select value from ctx where key = k;
$$;
grant execute on all functions in schema pg_temp to authenticated;

set local role authenticated;

-- Creating a household
select pg_temp.login('a');
insert into ctx select 'h', create_household('  Home  ', 'Olive')::text;
select is((select name from households where id = pg_temp.val('h')), 'Home', 'name is trimmed');
select is((select role::text from members where household_id = pg_temp.val('h')), 'owner', 'creator becomes owner');

-- Inviting
insert into ctx select 'code_e', (create_invite(pg_temp.val('h'), 'editor')).code;
insert into ctx select 'code_v', (create_invite(pg_temp.val('h'), 'viewer')).code;
select matches(pg_temp.code('code_e'), '^[A-HJ-NP-Z2-9]{8}$', 'code has 8 unambiguous characters');
select throws_ok(format($$select create_invite(%L, 'owner')$$, pg_temp.val('h')), 'invalid_role', 'cannot invite an owner');

-- Isolation before joining
select pg_temp.login('d');
select is((select count(*) from households), 0::bigint, 'outsider sees no households');
select is((select count(*) from members), 0::bigint, 'outsider sees no members');
select is((select count(*) from invites), 0::bigint, 'outsider sees no invites');
select throws_ok(format($$select create_invite(%L, 'editor')$$, pg_temp.val('h')), 'not_owner', 'outsider cannot invite');
update households set name = 'Hacked' where id = pg_temp.val('h');
delete from households where id = pg_temp.val('h');

-- Joining
select pg_temp.login('b');
select lives_ok(format($$select join_household(%L, 'Ben')$$, lower(pg_temp.code('code_e'))), 'code works in any case');
select is((select role::text from members where user_id = auth.uid()), 'editor', 'joiner gets the invite role');
select is((select count(*) from households), 1::bigint, 'joiner now sees the household');
select throws_ok(format($$select join_household(%L, 'Ben')$$, pg_temp.code('code_v')), 'already_member', 'cannot join twice');

select pg_temp.login('c');
select throws_ok(format($$select join_household(%L, 'Cat')$$, pg_temp.code('code_e')), 'invalid_invite', 'a used code does not work');
select throws_ok($$select join_household('NOPE2345', 'Cat')$$, 'invalid_invite', 'an unknown code does not work');
select lives_ok(format($$select join_household(%L, 'Cat')$$, pg_temp.code('code_v')), 'already_member did not use up the code');
select is((select role::text from members where user_id = auth.uid()), 'viewer', 'viewer invite gives viewer role');

-- Outsider's writes earlier had no effect
select is((select name from households where id = pg_temp.val('h')), 'Home', 'outsider could not rename or delete');

-- Expired and revoked invites
select pg_temp.login('a');
insert into ctx select 'code_r', (create_invite(pg_temp.val('h'), 'editor')).code;
select lives_ok(format($$select revoke_invite(id) from invites where code = %L$$, pg_temp.code('code_r')), 'owner can revoke');
select pg_temp.login('d');
select throws_ok(format($$select join_household(%L, 'Dan')$$, pg_temp.code('code_r')), 'invalid_invite', 'a revoked code does not work');
reset role;
insert into invites (household_id, code, role, expires_at) values (pg_temp.val('h'), 'EXPIRED2', 'editor', now() - interval '1 second');
set local role authenticated;
select throws_ok($$select join_household('EXPIRED2', 'Dan')$$, 'invalid_invite', 'an expired code does not work');

-- Direct writes are refused
select throws_ok($$insert into members (household_id, user_id, display_name, role) select id, auth.uid(), 'x', 'owner' from households$$, '42501', null, 'cannot insert members directly');
select pg_temp.login('b');
select throws_ok($$update members set role = 'owner' where user_id = auth.uid()$$, '42501', null, 'cannot promote self directly');
select throws_ok($$insert into invites (household_id, code, role) select id, 'FORGED22', 'editor' from households$$, '42501', null, 'cannot forge an invite');

-- Role limits
select is((select count(*) from invites), 0::bigint, 'editor cannot read invite codes');
select throws_ok(format($$select create_invite(%L, 'editor')$$, pg_temp.val('h')), 'not_owner', 'editor cannot invite');
select throws_ok(format($$select remove_member(id) from members where user_id = '00000000-0000-0000-0000-00000000000c'$$), 'not_owner', 'editor cannot remove members');
select throws_ok(format($$select set_member_role(id, 'editor') from members where user_id = '00000000-0000-0000-0000-00000000000c'$$), 'not_owner', 'editor cannot change roles');
select throws_ok(format($$select transfer_ownership(id) from members where user_id = auth.uid()$$), 'not_owner', 'editor cannot take ownership');

-- Multiple households
select lives_ok($$select create_household('Dorm', 'Ben')$$, 'a member can create a second household');
select is((select count(*) from households), 2::bigint, 'and sees both');

-- Owner rules
select pg_temp.login('a');
select is((select count(*) from households), 1::bigint, 'owner does not see the other household');
select throws_ok(format($$select leave_household(%L)$$, pg_temp.val('h')), 'owner_cannot_leave', 'owner cannot leave');
select lives_ok($$select set_member_role(id, 'editor') from members where user_id = '00000000-0000-0000-0000-00000000000c'$$, 'owner can change a role');
select lives_ok($$select transfer_ownership(id) from members where user_id = '00000000-0000-0000-0000-00000000000b' and household_id = (select value::uuid from ctx where key = 'h')$$, 'owner can transfer');
select is((select count(*) from members where household_id = pg_temp.val('h') and role = 'owner'), 1::bigint, 'exactly one owner after transfer');
select lives_ok(format($$select leave_household(%L)$$, pg_temp.val('h')), 'former owner can now leave');
select is((select count(*) from households where id = pg_temp.val('h')), 0::bigint, 'and immediately loses access');

select * from finish();
rollback;
