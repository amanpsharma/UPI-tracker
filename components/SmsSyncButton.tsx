import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, Snackbar, Text } from 'react-native-paper';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { syncSmsToMongo } from '@/services/smsSyncAndroid';
import { checkBudgetAlerts, requestNotificationPermission } from '@/services/budgetAlert';

interface Props {
  onDone?: () => void;
}

export default function SmsSyncButton({ onDone }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [lastImported, setLastImported] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  if (Platform.OS !== 'android') return null;

  const handleSync = async () => {
    setLoading(true);
    setIsError(false);
    setLastImported(null);
    try {
      const { scanned, found, imported } = await syncSmsToMongo();

      if (scanned === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setMessage('No SMS in inbox. Check SMS permission in device settings.');
      } else if (found === 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMessage(`Scanned ${scanned} messages — no UPI payments detected.`);
      } else if (imported === 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMessage(`${found} payment${found !== 1 ? 's' : ''} already saved — nothing new.`);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLastImported(imported);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2200);
        setMessage(`Imported ${imported} new payment${imported !== 1 ? 's' : ''} from SMS.`);
        onDone?.();
        await requestNotificationPermission();
        checkBudgetAlerts();
      }
    } catch (err: any) {
      setIsError(true);
      setMessage(err.message ?? 'SMS sync failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Button
        mode={loading ? 'outlined' : 'contained-tonal'}
        icon={loading ? undefined : 'message-text-outline'}
        onPress={handleSync}
        loading={loading}
        disabled={loading}
        style={styles.btn}
        contentStyle={styles.btnContent}
        labelStyle={styles.btnLabel}
      >
        {loading ? 'Scanning SMS...' : 'Sync from SMS'}
      </Button>

      {showSuccess && (
        <LottieView
          source={require('@/assets/animations/success.json')}
          autoPlay
          loop={false}
          style={styles.successAnim}
        />
      )}

      {lastImported !== null && !loading && !showSuccess && (
        <Text style={styles.importedBadge}>
          +{lastImported} new
        </Text>
      )}

      <Snackbar
        visible={!!message}
        onDismiss={() => setMessage('')}
        duration={isError ? 6000 : 3500}
        style={isError ? styles.errorSnack : styles.successSnack}
        action={isError ? { label: 'OK', onPress: () => setMessage('') } : undefined}
      >
        {message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 10 },
  btnContent: { paddingVertical: 4 },
  btnLabel: { fontSize: 14, letterSpacing: 0.2 },
  importedBadge: {
    textAlign: 'center',
    color: '#2e7d32',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  successAnim: { width: 80, height: 80, alignSelf: 'center' },
  errorSnack: { backgroundColor: '#b00020' },
  successSnack: { backgroundColor: '#1b5e20' },
});
