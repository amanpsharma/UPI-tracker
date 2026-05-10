import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Richer empty-state than a single icon: layered concentric circles behind the
// icon give it visual weight, and an optional CTA button lets the screen prompt
// the user toward the next action.

type Props = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  body?: string;
  /** Tint colour for the icon and outer halo. Default = neutral grey. */
  tint?: string;
  cta?: { label: string; onPress: () => void };
};

export default function EmptyState({
  icon,
  title,
  body,
  tint = '#9ca3af',
  cta,
}: Props) {
  return (
    <View style={styles.root}>
      {/* Concentric halos */}
      <View style={[styles.halo3, { borderColor: `${tint}15` }]}>
        <View style={[styles.halo2, { borderColor: `${tint}25` }]}>
          <View style={[styles.halo1, { backgroundColor: `${tint}1f` }]}>
            <MaterialCommunityIcons name={icon} size={32} color={tint} />
          </View>
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}

      {cta ? (
        <TouchableOpacity style={styles.cta} onPress={cta.onPress} activeOpacity={0.85}>
          <Text style={styles.ctaText}>{cta.label}</Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 8 },
  halo3: {
    width: 132, height: 132, borderRadius: 66, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  halo2: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  halo1: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 16, fontWeight: '700', color: '#111827',
    fontFamily: 'Inter_700Bold', textAlign: 'center', marginTop: 12,
  },
  body: {
    fontSize: 13, color: '#9ca3af', textAlign: 'center',
    fontFamily: 'Inter_400Regular', maxWidth: 260, lineHeight: 19,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#111827',
    paddingHorizontal: 18, paddingVertical: 11,
    borderRadius: 12, marginTop: 16,
  },
  ctaText: {
    color: '#fff', fontSize: 14, fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
