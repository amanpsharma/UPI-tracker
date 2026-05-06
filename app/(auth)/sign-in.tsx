import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import SocialAuthButtons from '@/components/SocialAuthButtons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    if (!isLoaded) return;
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }

    setLoading(true);
    setError('');
    try {
      const result = await signIn!.create({ identifier: email.trim(), password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)/');
      } else {
        setError('Sign-in incomplete. Check your credentials.');
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        'Sign-in failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Logo / heading */}
        <View style={styles.heroSection}>
          <View style={styles.logoBox}>
            <MaterialCommunityIcons name="bank-transfer" size={40} color="#fff" />
          </View>
          <Text variant="headlineMedium" style={styles.appName}>UPI Tracker</Text>
          <Text variant="bodyMedium" style={styles.tagline}>Track every payment, effortlessly.</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text variant="titleLarge" style={styles.formTitle}>Welcome back</Text>
          <Text variant="bodySmall" style={styles.formSub}>Sign in to your account</Text>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="email-outline" />}
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword((v) => !v)}
              />
            }
          />

          <Button
            mode="contained"
            onPress={handleSignIn}
            loading={loading}
            disabled={loading}
            style={styles.btn}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          <View style={styles.footer}>
            <Text variant="bodyMedium" style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
              <Text style={styles.link}>Sign up</Text>
            </TouchableOpacity>
          </View>

          <SocialAuthButtons mode="sign-in" />
        </View>
      </KeyboardAvoidingView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={8000}
        style={styles.errorSnack}
        action={{ label: 'OK', onPress: () => setError('') }}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6200ee' },
  inner: { flex: 1, justifyContent: 'flex-end' },

  heroSection: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  appName: { color: '#fff', fontWeight: 'bold' },
  tagline: { color: 'rgba(255,255,255,0.75)' },

  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 16,
    gap: 12,
  },
  formTitle: { fontWeight: 'bold', color: '#1a1a1a' },
  formSub: { color: '#888', marginTop: -6 },

  input: { backgroundColor: '#fff' },

  btn: { borderRadius: 10, marginTop: 4 },
  btnContent: { paddingVertical: 6 },
  btnLabel: { fontSize: 15, fontWeight: '600' },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 4 },
  footerText: { color: '#666' },
  link: { color: '#6200ee', fontWeight: '600', fontSize: 14 },

  errorSnack: { backgroundColor: '#b00020' },
});
