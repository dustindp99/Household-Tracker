import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Button, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { errorMessage, getHousehold, listMembers } from '@/lib/households';
import { canEditItems, formatStock, listCategories, listItems } from '@/lib/items';

export default function InventoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const household = useQuery({ queryKey: ['households', id], queryFn: () => getHousehold(id) });
  const members = useQuery({ queryKey: ['households', id, 'members'], queryFn: () => listMembers(id) });
  const categories = useQuery({
    queryKey: ['households', id, 'categories'],
    queryFn: () => listCategories(id),
  });
  const items = useQuery({ queryKey: ['households', id, 'items'], queryFn: () => listItems(id) });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['households', id] });
    }, [queryClient, id]),
  );

  const me = members.data?.find((member) => member.user_id === session?.user.id);
  const canEdit = canEditItems(me?.role);
  const failure = household.error ?? members.error ?? categories.error ?? items.error;

  const header = (
    <Stack.Screen
      options={{
        title: household.data?.name ?? '',
        headerRight: () => (
          <Button title="Settings" onPress={() => router.push(`/household/${id}/settings`)} />
        ),
      }}
    />
  );

  // A failed refresh leaves the last good data in place, so only show an error if there's nothing to show.
  if (household.data === undefined || !members.data || !categories.data || !items.data) {
    return (
      <View style={styles.container}>
        {header}
        {failure && <Text style={styles.body}>{errorMessage(failure)}</Text>}
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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {header}

      {categories.data.length === 0 && (
        <Text style={styles.body}>
          {canEdit
            ? 'Add a category, such as Kitchen or Bathroom, to start tracking items.'
            : 'Nothing has been added to this household yet.'}
        </Text>
      )}

      {categories.data.map((category) => {
        const categoryItems = items.data.filter((item) => item.category_id === category.id);
        return (
          <View key={category.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.heading}>{category.name}</Text>
              {canEdit && (
                <Button
                  title={`Edit ${category.name}`}
                  onPress={() =>
                    router.push({
                      pathname: '/household/[id]/category',
                      params: { id, categoryId: category.id },
                    })
                  }
                />
              )}
            </View>

            {categoryItems.length === 0 && <Text style={styles.hint}>No items yet.</Text>}

            {categoryItems.map((item) => {
              const row = (
                <>
                  <Text style={styles.body}>{item.name}</Text>
                  <Text style={styles.stock}>{formatStock(item)}</Text>
                </>
              );
              return canEdit ? (
                <Link
                  key={item.id}
                  href={{ pathname: '/household/[id]/item', params: { id, itemId: item.id } }}
                  asChild
                >
                  <Pressable style={styles.row} accessibilityRole="button">
                    {row}
                  </Pressable>
                </Link>
              ) : (
                <View key={item.id} style={styles.row}>
                  {row}
                </View>
              );
            })}

            {canEdit && (
              <Button
                title={`Add item to ${category.name}`}
                onPress={() =>
                  router.push({
                    pathname: '/household/[id]/item',
                    params: { id, categoryId: category.id },
                  })
                }
              />
            )}
          </View>
        );
      })}

      {canEdit && (
        <Button
          title="Add category"
          onPress={() => router.push({ pathname: '/household/[id]/category', params: { id } })}
        />
      )}
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
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heading: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  body: {
    flexShrink: 1,
    fontSize: 16,
  },
  hint: {
    fontSize: 14,
    color: '#555',
  },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  stock: {
    fontSize: 16,
    fontWeight: '600',
  },
});
