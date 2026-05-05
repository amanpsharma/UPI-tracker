import { useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import { syncSmsToMongo } from '@/services/smsSyncAndroid';

interface Props {
  onDone?: () => void;
}

export default function SmsSyncButton({ onDone }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  if (Platform.OS !== 'android') return null;

  const handleSync = async () => {
    setLoading(true);
    setIsError(false);
    try {
      const { scanned, found, imported } = await syncSmsToMongo();

      if (scanned === 0) {
        setMessage('No SMS found in inbox. Check SMS permission in device settings.');
      } else if (found === 0) {
        setMessage(`Scanned ${scanned} messages — no UPI payment SMS detected.`);
      } else if (imported === 0) {
        setMessage(`${found} payment(s) already saved — nothing new.`);
      } else {
        setMessage(`Imported ${imported} new payment(s) from ${scanned} messages.`);
        onDone?.();
      }
    } catch (err: any) {
      setIsError(true);
      setMessage(err.message ?? 'SMS sync failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        mode="outlined"
        icon="message-text-outline"
        onPress={handleSync}
        loading={loading}
        disabled={loading}
        style={styles.btn}
      >
        {loading ? 'Scanning SMS...' : 'Sync from SMS'}
      </Button>
      <Snackbar
        visible={!!message}
        onDismiss={() => setMessage('')}
        duration={isError ? 6000 : 4000}
        style={isError ? styles.errorSnack : undefined}
      >
        {message}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 8, marginTop: 4 },
  errorSnack: { backgroundColor: '#b00020' },
});
