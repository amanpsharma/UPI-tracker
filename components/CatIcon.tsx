import { View } from 'react-native';
import { CATEGORY_COLORS } from '@/constants';
import { CAT_SHAPE } from '@/constants/ui';
import { Category } from '@/types';

// Small colored shape for a transaction category. Shape varies (circle/square/diamond)
// for visual variety in long category lists.
export default function CatIcon({ cat }: { cat: string }) {
  const color = CATEGORY_COLORS[cat as Category] ?? '#9ca3af';
  const shape = CAT_SHAPE[cat] ?? 'circle';

  if (shape === 'diamond') {
    return (
      <View
        style={{
          width: 18, height: 18,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 12, height: 12, borderRadius: 2,
            backgroundColor: color,
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width: 14, height: 14,
        borderRadius: shape === 'circle' ? 7 : 3,
        backgroundColor: color,
      }}
    />
  );
}
