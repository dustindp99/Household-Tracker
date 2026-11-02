import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

import { errorMessage } from '@/lib/households';
import {
  type Category,
  createCategory,
  deleteCategory,
  type Item,
  listCategories,
  listItems,
  renameCategory,
} from '@/lib/items';

function CategoryForm(props: { householdId: string; category?: Category; itemCount: number }) {
  const { householdId, category, itemCount } = props;
  const queryClient = useQueryClient();
  const [name, setName] = useState(category?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setIsBusy(true);
    setError(null);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ['households', householdId] });
      router.back();
    } catch (actionError) {
      setError(errorMessage(actionError));
      setIsBusy(false);
    }
  }

  function save() {
    return run(() =>
      category ? renameCategory(category.id, name) : createCategory(householdId, name),
    );
  }

  function confirmDelete(target: Category) {
    const consequence =
      itemCount === 0
        ? 'This category has no items.'
        : `This also permanently deletes its ${itemCount === 1 ? '1 item' : `${itemCount} items`}.`;
    Alert.alert(`Delete ${target.name}?`, consequence, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => run(() => deleteCategory(target.id)) },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Category name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Kitchen"
        accessibilityLabel="Category name"
        autoCapitalize="words"
        maxLength={50}
      />
      <Button title="Save" onPress={save} disabled={isBusy || !name.trim()} />
      {category && (
        <Button
          title="Delete category"
          color="#b00020"
          onPress={() => confirmDelete(category)}
          disabled={isBusy}
        />
      )}
      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

export default function CategoryScreen() {
  const { id, categoryId } = useLocalSearchParams<{ id: string; categoryId?: string }>();
  const categories = useQuery({
    queryKey: ['households', id, 'categories'],
    queryFn: () => listCategories(id),
  });
  const items = useQuery({ queryKey: ['households', id, 'items'], queryFn: () => listItems(id) });

  if (categoryId && (categories.isPending || items.isPending)) {
    return <View style={styles.container} />;
  }

  const category = categories.data?.find((candidate) => candidate.id === categoryId);
  if (categoryId && !category) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>This category no longer exists.</Text>
      </View>
    );
  }

  const itemCount = (items.data ?? []).filter((item: Item) => item.category_id === categoryId).length;
  return <CategoryForm householdId={id} category={category} itemCount={itemCount} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    gap: 12,
    padding: 24,
  },
  label: {
    fontSize: 14,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    fontSize: 16,
    padding: 12,
  },
  error: {
    color: '#b00020',
    fontSize: 14,
  },
});
