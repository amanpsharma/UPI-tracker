import { StyleSheet, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import PressableScale from './PressableScale';
import { colors, radius } from '@/constants/theme';

export default function FloatingAddButton() {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/add');
  };

  return (
    <View style={styles.container}>
      <PressableScale style={styles.button} onPress={handlePress} scaleDown={0.88}>
        <MaterialCommunityIcons name="plus" size={26} color="#fff" />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 70,
    right: 20,
    zIndex: 100,
  },
  button: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
});
