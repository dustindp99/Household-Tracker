import { Pressable, StyleSheet, Text, View } from 'react-native';

export function ChoiceChips<T extends string>(props: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.row}>
      {props.options.map((option) => {
        const isSelected = option.value === props.selected;
        return (
          <Pressable
            key={option.value}
            style={[styles.chip, isSelected && styles.selected]}
            onPress={() => props.onSelect(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={isSelected ? styles.selectedText : styles.text}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selected: {
    backgroundColor: '#1a5fb4',
    borderColor: '#1a5fb4',
  },
  text: {
    color: '#222',
    fontSize: 14,
  },
  selectedText: {
    color: '#fff',
    fontSize: 14,
  },
});
