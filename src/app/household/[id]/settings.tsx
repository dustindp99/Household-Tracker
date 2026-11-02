import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Button, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import {
  createInvite,
  deleteHousehold,
  errorMessage,
  getHousehold,
  inviteLink,
  inviteMessage,
  type InviteRole,
  leaveHousehold,
  listMembers,
  listPendingInvites,
  removeMember,
  renameHousehold,
  revokeInvite,
  setMemberRole,
  transferOwnership,
  updateDisplayName,
} from '@/lib/households';

function confirm(title: string, message: string, action: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

function NameEditor(props: {
  label: string;
  value: string;
  maxLength: number;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(props.value);
  const isChanged = name.trim() !== props.value;

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        accessibilityLabel={props.label}
        autoCapitalize="words"
        maxLength={props.maxLength}
      />
      {isChanged && !!name.trim() && <Button title="Save" onPress={() => props.onSave(name)} />}
    </View>
  );
}

export default function HouseholdScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const household = useQuery({ queryKey: ['households', id], queryFn: () => getHousehold(id) });
  const members = useQuery({ queryKey: ['households', id, 'members'], queryFn: () => listMembers(id) });
  const me = members.data?.find((member) => member.user_id === session?.user.id);
  const isOwner = me?.role === 'owner';
  const invites = useQuery({
    queryKey: ['households', id, 'invites'],
    queryFn: () => listPendingInvites(id),
    enabled: isOwner,
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['households', id] });
    }, [queryClient, id]),
  );

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (error) {
      Alert.alert("That didn't work", errorMessage(error));
    }
    await queryClient.invalidateQueries({ queryKey: ['households'] });
  }

  function goHomeAfter(action: () => Promise<unknown>) {
    return run(async () => {
      await action();
      router.replace('/');
    });
  }

  async function shareInvite(code: string) {
    await Share.share({ message: inviteMessage(household.data?.name ?? '', code, inviteLink(code)) });
  }

  function invite(role: InviteRole) {
    return run(async () => {
      const created = await createInvite(id, role);
      await shareInvite(created.code);
    });
  }

  if (household.isPending || members.isPending) {
    return <View style={styles.container} />;
  }

  if (household.isError || members.isError) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>{errorMessage(household.error ?? members.error)}</Text>
      </View>
    );
  }

  if (!household.data || !me) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>You no longer have access to this household.</Text>
      </View>
    );
  }

  const householdName = household.data.name;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {isOwner && (
        <NameEditor
          key={`household-${householdName}`}
          label="Household name"
          value={householdName}
          maxLength={80}
          onSave={(name) => run(() => renameHousehold(id, name))}
        />
      )}
      <NameEditor
        key={`me-${me.display_name}`}
        label="Your name in this household"
        value={me.display_name}
        maxLength={50}
        onSave={(name) => run(() => updateDisplayName(id, name))}
      />

      <View style={styles.section}>
        <Text style={styles.heading}>Members</Text>
        {members.data.map((member) => (
          <View key={member.id} style={styles.row}>
            <Text style={styles.body}>
              {member.display_name}
              {member.id === me.id ? ' (you)' : ''} · {member.role}
            </Text>
            {isOwner && member.role !== 'owner' && (
              <View style={styles.actions}>
                <Button
                  title={member.role === 'editor' ? 'Make viewer' : 'Make editor'}
                  onPress={() =>
                    run(() => setMemberRole(member.id, member.role === 'editor' ? 'viewer' : 'editor'))
                  }
                />
                <Button
                  title="Make owner"
                  onPress={() =>
                    confirm(
                      `Make ${member.display_name} the owner?`,
                      'You will become an editor, and only they will be able to manage this household.',
                      'Transfer',
                      () => run(() => transferOwnership(member.id)),
                    )
                  }
                />
                <Button
                  title="Remove"
                  color="#b00020"
                  onPress={() =>
                    confirm(
                      `Remove ${member.display_name}?`,
                      'They will lose access to this household right away.',
                      'Remove',
                      () => run(() => removeMember(member.id)),
                    )
                  }
                />
              </View>
            )}
          </View>
        ))}
      </View>

      {isOwner && (
        <View style={styles.section}>
          <Text style={styles.heading}>Invites</Text>
          <Text style={styles.body}>Each invite works once and expires after 7 days.</Text>
          <View style={styles.actions}>
            <Button title="Invite an editor" onPress={() => invite('editor')} />
            <Button title="Invite a viewer" onPress={() => invite('viewer')} />
          </View>
          {invites.data?.map((pending) => (
            <View key={pending.id} style={styles.row}>
              <Text style={styles.body}>
                {pending.code} · {pending.role}
              </Text>
              <View style={styles.actions}>
                <Button title="Share" onPress={() => run(() => shareInvite(pending.code))} />
                <Button
                  title="Cancel invite"
                  color="#b00020"
                  onPress={() => run(() => revokeInvite(pending.id))}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        {isOwner ? (
          <>
            <Text style={styles.body}>
              To leave this household, first make another member the owner.
            </Text>
            <Button
              title="Delete household"
              color="#b00020"
              onPress={() =>
                confirm(
                  `Delete ${householdName}?`,
                  'This permanently deletes the household and its data for every member.',
                  'Delete',
                  () => goHomeAfter(() => deleteHousehold(id)),
                )
              }
            />
          </>
        ) : (
          <Button
            title="Leave household"
            color="#b00020"
            onPress={() =>
              confirm(
                `Leave ${householdName}?`,
                'You will need a new invite to rejoin.',
                'Leave',
                () => goHomeAfter(() => leaveHousehold(id)),
              )
            }
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    gap: 24,
    padding: 24,
  },
  section: {
    gap: 8,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    color: '#555',
  },
  body: {
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    fontSize: 16,
    padding: 12,
  },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
    gap: 4,
    paddingVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
