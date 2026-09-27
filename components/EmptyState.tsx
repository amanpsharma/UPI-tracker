import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius } from '@/constants/theme';

type Props = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  body?: string;
  tint?: string;
  cta?: { label: string; onPress: () => void };
};

export default function EmptyState({
  icon,
  title,
  body,
  tint = colors.textMuted,
  cta,
}: Props) {
  return (
    <View style={styles.root}>
      <View style={[styles.halo3, { borderColor: `${tint}15` }]}>
        <View style={[styles.halo2, { borderColor: `${tint}25` }]}>
          <View style={[styles.halo1, { backgroundColor: `${tint}12` }]}>
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
    fontSize: 16, fontWeight: '700', color: colors.text,
    fontFamily: fonts.bold, textAlign: 'center', marginTop: 12,
  },
  body: {
    fontSize: 13, color: colors.textSecondary, textAlign: 'center',
    fontFamily: fonts.regular, maxWidth: 260, lineHeight: 19,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 18, paddingVertical: 11,
    borderRadius: radius.md, marginTop: 16,
  },
  ctaText: {
    color: '#fff', fontSize: 14, fontWeight: '600',
    fontFamily: fonts.semibold,
  },
});
