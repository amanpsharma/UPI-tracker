import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts } from '@/constants/theme';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
};

const SIZES = {
  sm: { icon: 18, box: 30, text: 16, gap: 8 },
  md: { icon: 24, box: 40, text: 22, gap: 10 },
  lg: { icon: 32, box: 54, text: 28, gap: 12 },
};

export default function Logo({ size = 'md', showText = true }: Props) {
  const s = SIZES[size];
  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { width: s.box, height: s.box, borderRadius: s.box * 0.28 }]}>
        <MaterialCommunityIcons name="lightning-bolt" size={s.icon} color="#fff" />
      </View>
      {showText && (
        <Text style={[styles.text, { fontSize: s.text, marginLeft: s.gap }]}>
          Pay<Text style={styles.textAccent}>Flow</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.extrabold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  textAccent: {
    color: colors.primary,
  },
});
