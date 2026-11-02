import * as Linking from 'expo-linking';

import type { Database } from './database.types';
import { supabase } from './supabase';

export type MemberRole = Database['public']['Enums']['member_role'];
export type Member = Database['public']['Tables']['members']['Row'];
export type Invite = Database['public']['Tables']['invites']['Row'];
export type InviteRole = Exclude<MemberRole, 'owner'>;

const ERROR_MESSAGES: Record<string, string> = {
  invalid_invite: "That invite isn't valid. It may have expired or already been used.",
  already_member: "You're already a member of this household.",
  not_owner: 'Only the household owner can do that.',
  owner_cannot_leave: 'Transfer ownership to another member before leaving.',
  cannot_change_owner: "The owner's role can't be changed this way.",
  not_allowed: "You don't have permission to do that, or it no longer exists.",
};

const ERROR_CODE_MESSAGES: Record<string, string> = {
  '23505': 'That name is already in use here. Try a different one.',
  '42501': "You don't have permission to do that.",
};

export function errorMessage(error: unknown): string {
  const { message = '', code = '' } = isErrorLike(error) ? error : {};
  return (
    ERROR_MESSAGES[message] ??
    ERROR_CODE_MESSAGES[code] ??
    'Something went wrong. Check your connection and try again.'
  );
}

function isErrorLike(value: unknown): value is { message?: string; code?: string } {
  return typeof value === 'object' && value !== null;
}

export function inviteLink(code: string, baseUrl = process.env.EXPO_PUBLIC_INVITE_BASE_URL): string {
  return baseUrl ? `${baseUrl.replace(/\/$/, '')}/join/${code}` : Linking.createURL(`join/${code}`);
}

export function inviteMessage(householdName: string, code: string, link: string): string {
  return `Join "${householdName}" on Household Tracker: ${link}\n\nOr enter this code in the app: ${code}`;
}

export async function listMyHouseholds(userId: string) {
  const { data, error } = await supabase
    .from('members')
    .select('role, household:households(id, name)')
    .eq('user_id', userId)
    .order('joined_at');
  if (error) throw error;
  return data;
}

export async function getHousehold(id: string) {
  const { data, error } = await supabase.from('households').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listMembers(householdId: string) {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('household_id', householdId)
    .order('joined_at');
  if (error) throw error;
  return data;
}

export async function listPendingInvites(householdId: string) {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('household_id', householdId)
    .is('revoked_at', null)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function createHousehold(name: string, displayName: string) {
  const { data, error } = await supabase.rpc('create_household', {
    household_name: name,
    member_display_name: displayName,
  });
  if (error) throw error;
  return data;
}

export async function joinHousehold(code: string, displayName: string) {
  const { data, error } = await supabase.rpc('join_household', {
    invite_code: code,
    member_display_name: displayName,
  });
  if (error) throw error;
  return data;
}

export async function createInvite(householdId: string, role: InviteRole) {
  const { data, error } = await supabase.rpc('create_invite', {
    target_household: householdId,
    invite_role: role,
  });
  if (error) throw error;
  return data;
}

export async function revokeInvite(inviteId: string) {
  const { error } = await supabase.rpc('revoke_invite', { target_invite: inviteId });
  if (error) throw error;
}

export async function renameHousehold(id: string, name: string) {
  const { error } = await supabase.from('households').update({ name: name.trim() }).eq('id', id);
  if (error) throw error;
}

export async function deleteHousehold(id: string) {
  const { error } = await supabase.from('households').delete().eq('id', id);
  if (error) throw error;
}

export async function leaveHousehold(id: string) {
  const { error } = await supabase.rpc('leave_household', { target_household: id });
  if (error) throw error;
}

export async function updateDisplayName(householdId: string, name: string) {
  const { error } = await supabase.rpc('update_display_name', {
    target_household: householdId,
    new_name: name,
  });
  if (error) throw error;
}

export async function setMemberRole(memberId: string, role: InviteRole) {
  const { error } = await supabase.rpc('set_member_role', {
    target_member: memberId,
    new_role: role,
  });
  if (error) throw error;
}

export async function removeMember(memberId: string) {
  const { error } = await supabase.rpc('remove_member', { target_member: memberId });
  if (error) throw error;
}

export async function transferOwnership(memberId: string) {
  const { error } = await supabase.rpc('transfer_ownership', { target_member: memberId });
  if (error) throw error;
}
