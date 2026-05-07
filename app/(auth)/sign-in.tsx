import { useState } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform,
  TouchableOpacity, ScrollView, TextInput as RNTextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn, useSSO, useAuth } from '@clerk/clerk-expo';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { OAuthStrategy } from '@clerk/types';

WebBrowser.maybeCompleteAuthSession();

const BG = '#f5f4f0';

const SOCIAL = [
  { strategy: 'oauth_google' as OAuthStrategy, label: 'Continue with Google', icon: 'google', iconColor: '#4285F4' },
  { strategy: 'oauth_facebook' as OAuthStrategy, label: 'Continue with Facebook', icon: 'facebook', iconColor: '#1877F2' },
  { strategy: 'oauth_x' as OAuthStrategy, label: 'Continue with X', icon: 'twitter', iconColor: '#000' },
];

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const { isSignedIn } = useAuth();

  const [tab, setTab] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<OAuthStrategy | null>(null);
  const [error, setError] = useState('');

  if (isSignedIn) { router.replace('/(tabs)/'); return null; }

  const handleSignIn = async () => {
    if (!isLoaded) return;
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    if (!agreed) { setError('Please agree to the Terms to continue.'); return; }
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
      setError(err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSSO = async (strategy: OAuthStrategy) => {
    if (ssoLoading) return;
    setSsoLoading(strategy);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ path: 'sso-callback' });
      const { createdSessionId, setActive: sa } = await startSSOFlow({ strategy, redirectUrl });
      if (createdSessionId && sa) await sa({ session: createdSessionId });
    } catch (err: any) {
      Alert.alert('Login failed', err?.errors?.[0]?.longMessage ?? err?.message ?? 'Social login failed.');
    } finally {
      setSsoLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800' }}>₹</Text>
              <View style={{ position: 'absolute', bottom: 4, right: 3, backgroundColor: '#22c55e', borderRadius: 4, width: 14, height: 14, justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name="trending-up" size={9} color="#fff" />
              </View>
            </View>
            <Text style={styles.appName}>upi.tracker</Text>
          </View>

          {/* Heading */}
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue tracking your UPI transactions.</Text>

          {/* Social buttons */}
          <View style={styles.socialGroup}>
            {SOCIAL.map(({ strategy, label, icon, iconColor }) => (
              <TouchableOpacity
                key={strategy}
                style={styles.socialBtn}
                onPress={() => handleSSO(strategy)}
                disabled={ssoLoading !== null}
                activeOpacity={0.7}
              >
                {ssoLoading === strategy
                  ? <ActivityIndicator size={16} color="#6b7280" />
                  : <MaterialCommunityIcons name={icon as any} size={18} color={iconColor} />
                }
                <Text style={styles.socialBtnText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* OR divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email / Phone toggle */}
          <View style={styles.tabToggle}>
            {(['email', 'phone'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                  {t === 'email' ? 'Email' : 'Phone'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Email field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <RNTextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#c4c4c4"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          {/* Password field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View style={styles.inputRow}>
              <RNTextInput
                style={styles.inputFlex}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#c4c4c4"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.showBtn}>
                <Text style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotRow}
            onPress={() => Alert.alert('Forgot password?', 'Please visit clerk dashboard to reset your password.')}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Terms checkbox */}
          <TouchableOpacity style={styles.agreeRow} onPress={() => setAgreed(v => !v)} activeOpacity={0.8}>
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <MaterialCommunityIcons name="check" size={12} color="#fff" />}
            </View>
            <Text style={styles.agreeText}>
              I agree to the <Text style={styles.agreeLink}>Terms</Text> and acknowledge the{' '}
              <Text style={styles.agreeLink}>on-device Privacy</Text> policy.
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Sign in button */}
          <TouchableOpacity
            style={[styles.submitBtn, (loading || !agreed) && styles.submitBtnMuted]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#6b7280" size="small" />
              : <Text style={styles.submitBtnText}>Sign in</Text>
            }
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  logoBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#111827',
    justifyContent: 'center', alignItems: 'center',
  },
  logoIcon: { color: '#fff', fontSize: 20, fontWeight: '800' },
  appName: { fontSize: 17, fontWeight: '700', color: '#111827' },

  title: { fontSize: 30, fontWeight: '800', color: '#111827', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#9ca3af', lineHeight: 20, marginBottom: 28 },

  socialGroup: { gap: 10, marginBottom: 24 },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    backgroundColor: '#fff', paddingVertical: 13,
  },
  socialBtnText: { fontSize: 14, fontWeight: '600', color: '#111827' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { fontSize: 12, color: '#9ca3af', fontWeight: '600', letterSpacing: 0.5 },

  tabToggle: {
    flexDirection: 'row', backgroundColor: '#e9e8e4', borderRadius: 10,
    padding: 3, marginBottom: 22,
  },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 2, elevation: 2,
  },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  tabBtnTextActive: { color: '#111827' },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: '#111827',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 12, paddingLeft: 14,
  },
  inputFlex: { flex: 1, paddingVertical: 13, fontSize: 15, color: '#111827' },
  showBtn: { paddingHorizontal: 14, paddingVertical: 13 },
  showBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },

  forgotRow: { alignItems: 'flex-end', marginBottom: 18 },
  forgotText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#d1d5db',
    justifyContent: 'center', alignItems: 'center', marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  agreeText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 19 },
  agreeLink: { fontWeight: '700', color: '#111827' },

  errorText: { color: '#dc2626', fontSize: 13, marginBottom: 12 },

  submitBtn: {
    borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', backgroundColor: '#fff', marginBottom: 20,
  },
  submitBtnMuted: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#111827' },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, color: '#9ca3af' },
  footerLink: { fontSize: 14, fontWeight: '700', color: '#111827' },
});
