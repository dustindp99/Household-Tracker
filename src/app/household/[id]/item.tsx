import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ChoiceChips } from '@/components/ChoiceChips';
import { errorMessage } from '@/lib/households';
import {
  type Category,
  createItem,
  deleteItem,
  type Item,
  type ItemChanges,
  listCategories,
  listItems,
  parseCount,
  type TrackingType,
  updateItem,
} from '@/lib/items';

const TRACKING_OPTIONS: { value: TrackingType; label: string }[] = [
  { value: 'counter', label: 'Counter' },
  { value: 'yes_no', label: 'Yes/No' },
];

const STOCK_OPTIONS: { value: 'yes' | 'no'; label: string }[] = [
  { value: 'yes', label: 'Yes, we have it' },
  { value: 'no', label: "No, we're out" },
];

function ItemForm(props: {
  householdId: string;
  categories: Category[];
  initialCategoryId: string;
  item?: Item;
}) {
  const { householdId, categories, item } = props;
  const queryClient = useQueryClient();
  const [name, setName] = useState(item?.name ?? '');
  const [categoryId, setCategoryId] = useState(item?.category_id ?? props.initialCategoryId);
  const [trackingType, setTrackingType] = useState<TrackingType>(item?.tracking_type ?? 'counter');
  const [quantity, setQuantity] = useState(item?.quantity?.toString() ?? '0');
  const [inStock, setInStock] = useState<'yes' | 'no'>(item?.in_stock === false ? 'no' : 'yes');
  const [threshold, setThreshold] = useState(item?.low_threshold?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const isCounter = trackingType === 'counter';
  const parsedQuantity = parseCount(quantity);
  const parsedThreshold = parseCount(threshold);
  const isThresholdValid = !threshold.trim() || (parsedThreshold !== null && parsedThreshold >= 1);
  const isValid = !!name.trim() && (!isCounter || (parsedQuantity !== null && isThresholdValid));

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
    const lowThreshold = isCounter && threshold.trim() ? parsedThreshold : null;
    const stock = isCounter
      ? { quantity: parsedQuantity, in_stock: null }
      : { quantity: null, in_stock: inStock === 'yes' };

    if (!item) {
      return run(() =>
        createItem({
          household_id: householdId,
          category_id: categoryId,
          name,
          tracking_type: trackingType,
          low_threshold: lowThreshold,
          ...stock,
        }),
      );
    }

    const changes: ItemChanges = { name, category_id: categoryId, low_threshold: lowThreshold };
    // Stock is left out unless edited here, so saving a rename can't overwrite another member's update.
    if (isCounter && parsedQuantity !== item.quantity) {
      changes.quantity = parsedQuantity;
    }
    if (!isCounter && stock.in_stock !== item.in_stock) {
      changes.in_stock = stock.in_stock;
    }
    return run(() => updateItem(item.id, changes));
  }

  function confirmDelete(target: Item) {
    Alert.alert(`Delete ${target.name}?`, 'This permanently removes it from the household.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => run(() => deleteItem(target.id)) },
    ]);
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.label}>Item name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Eggs"
        accessibilityLabel="Item name"
        autoCapitalize="sentences"
        maxLength={80}
      />

      <Text style={styles.label}>Category</Text>
      <ChoiceChips
        options={categories.map((category) => ({ value: category.id, label: category.name }))}
        selected={categoryId}
        onSelect={setCategoryId}
      />

      {!item && (
        <>
          <Text style={styles.label}>How do you want to track it?</Text>
          <ChoiceChips options={TRACKING_OPTIONS} selected={trackingType} onSelect={setTrackingType} />
        </>
      )}

      {isCounter ? (
        <>
          <Text style={styles.label}>How many do you have?</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            accessibilityLabel="Quantity"
            keyboardType="number-pad"
            maxLength={6}
          />
          <Text style={styles.label}>Low when at or below (optional)</Text>
          <TextInput
            style={styles.input}
            value={threshold}
            onChangeText={setThreshold}
            placeholder="2"
            accessibilityLabel="Low threshold"
            keyboardType="number-pad"
            maxLength={6}
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>Do you have it?</Text>
          <ChoiceChips options={STOCK_OPTIONS} selected={inStock} onSelect={setInStock} />
        </>
      )}

      <Button title="Save" onPress={save} disabled={isBusy || !isValid} />
      {item && (
        <Button
          title="Delete item"
          color="#b00020"
          onPress={() => confirmDelete(item)}
          disabled={isBusy}
        />
      )}
      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </ScrollView>
  );
}

export default function ItemScreen() {
  const { id, itemId, categoryId } = useLocalSearchParams<{
    id: string;
    itemId?: string;
    categoryId?: string;
  }>();
  const categories = useQuery({
    queryKey: ['households', id, 'categories'],
    queryFn: () => listCategories(id),
  });
  const items = useQuery({ queryKey: ['households', id, 'items'], queryFn: () => listItems(id) });

  if (categories.isPending || items.isPending) {
    return <View style={styles.empty} />;
  }

  const item = items.data?.find((candidate) => candidate.id === itemId);
  const initialCategoryId = item?.category_id ?? categoryId;
  if (categories.isError || items.isError || !initialCategoryId || (itemId && !item)) {
    return (
      <View style={styles.empty}>
        <Text style={styles.label}>This item couldn't be loaded. It may have been deleted.</Text>
      </View>
    );
  }

  return (
    <ItemForm
      householdId={id}
      categories={categories.data}
      initialCategoryId={initialCategoryId}
      item={item}
    />
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flexGrow: 1,
    gap: 12,
    padding: 24,
  },
  empty: {
    flex: 1,
    backgroundColor: '#fff',
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
