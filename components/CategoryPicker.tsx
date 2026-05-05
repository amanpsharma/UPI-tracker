import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants';
import { Category } from '@/types';

interface Props {
  selected: Category;
  onSelect: (c: Category) => void;
}

export default function CategoryPicker({ selected, onSelect }: Props) {
  return (
    <View style={styles.grid}>
      {CATEGORIES.map((c) => {
        const active = c === selected;
        return (
          <TouchableOpacity
            key={c}
            style={[styles.item, active && { backgroundColor: CATEGORY_COLORS[c] }]}
            onPress={() => onSelect(c)}
          >
            <MaterialCommunityIcons
              name={CATEGORY_ICONS[c] as any}
              size={20}
              color={active ? '#fff' : CATEGORY_COLORS[c]}
            />
            <Text
              variant="labelSmall"
              style={[styles.label, active && { color: '#fff' }]}
            >
              {c}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
  },
  label: { color: '#444' },
});
