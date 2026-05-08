import { useState } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform,
  TouchableOpacity, ScrollView, TextInput as RNTextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignUp, useSSO } from '@clerk/clerk-expo';
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

function makeUsername(email: string) {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 15);
  return base + Math.random().toString(36).slice(2, 6);
}

export default function SignUp() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [tab, setTab] = useState<'email' | 'phone'>('email');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<OAuthStrategy | null>(null);
  const [error, setError] = useState('');

  // (auth)/_layout.tsx redirects to /(tabs)/ once isSignedIn=true.
  // We don't need to navigate manually here.

  const handleSignUp = async () => {
    if (!isLoaded || !signUp) return;
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    setError('');
    const [firstName, ...rest] = fullName.trim().split(' ');
    const lastName = rest.join(' ') || undefined;

    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
        username: makeUsername(email.trim()),
        firstName: firstName || undefined,
        lastName,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      if (err?.errors?.[0]?.meta?.paramName === 'username') {
        try {
          await signUp.create({ emailAddress: email.trim(), password, firstName: firstName || undefined, lastName });
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          setPendingVerification(true);
          return;
        } catch (retryErr: any) {
          setError(retryErr?.errors?.[0]?.longMessage ?? retryErr?.message ?? 'Sign-up failed.');
          return;
        }
      }
      setError(err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? 'Sign-up failed.');
    } finally {
      setLoading(false);
    }
  };

  const completeSignUp = async (resource: any): Promise<void> => {
    if (resource.status === 'complete') {
      if (setActive) await setActive({ session: resource.createdSessionId });
      return;
    }
    if (resource.status === 'missing_requirements') {
      const missing: string[] = resource.missingFields ?? [];
      const patch: Record<string, string> = {};
      if (missing.includes('username')) patch.username = makeUsername(email);
      if (missing.includes('first_name')) patch.firstName = 'User';
      if (missing.includes('last_name')) patch.lastName = 'Account';
      if (Object.keys(patch).length > 0) return completeSignUp(await signUp!.update(patch as any));
      Alert.alert('Additional info required', `Missing: ${missing.join(', ')}.`);
      return;
    }
    Alert.alert('Unexpected status', `Status: ${resource.status}. Please try again.`);
  };

  const handleVerify = async () => {
    if (!isLoaded || !signUp) { Alert.alert('Session expired', 'Please start sign-up again.'); return; }
    const trimmed = code.replace(/\s/g, '');
    if (trimmed.length < 6) { setError('Enter the full 6-digit code from your email.'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: trimmed });
      await completeSignUp(result);
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage ?? err?.message ?? 'Verification failed. Check the code.');
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

  // ── Verification screen ──
  if (pendingVerification) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.logoRow}>
              <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800' }}>₹</Text>
                <View style={{ position: 'absolute', bottom: 4, right: 3, backgroundColor: '#22c55e', borderRadius: 4, width: 14, height: 14, justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="trending-up" size={9} color="#fff" />
                </View>
              </View>
              <Text style={styles.appName}>upi.tracker</Text>
            </View>

            <View style={styles.verifyIconWrap}>
              <MaterialCommunityIcons name="email-check-outline" size={48} color="#111827" />
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{'\n'}
              <Text style={{ fontWeight: '700', color: '#111827' }}>{email}</Text>
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>VERIFICATION CODE</Text>
              <RNTextInput
                style={[styles.input, { letterSpacing: 6, textAlign: 'center', fontSize: 22 }]}
                value={code}
                onChangeText={setCode}
                placeholder="000000"
                placeholderTextColor="#c4c4c4"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnMuted]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#6b7280" size="small" />
                : <Text style={styles.submitBtnText}>Verify email</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.footer} onPress={handleSignUp}>
              <Text style={styles.footerText}>Didn't receive a code? </Text>
              <Text style={styles.footerLink}>Resend</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Main sign-up screen ──
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
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Sign up in seconds. Your data stays on-device.</Text>

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

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <RNTextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Aarav Kapoor"
              placeholderTextColor="#c4c4c4"
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>

          {/* Email */}
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

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View style={styles.inputRow}>
              <RNTextInput
                style={styles.inputFlex}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor="#c4c4c4"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.showBtn}>
                <Text style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
            <View style={styles.inputRow}>
              <RNTextInput
                style={styles.inputFlex}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat password"
                placeholderTextColor="#c4c4c4"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.showBtn}>
                <Text style={styles.showBtnText}>{showConfirm ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Create account button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnMuted]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#6b7280" size="small" />
              : <Text style={styles.submitBtnText}>Create account</Text>
            }
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.footerLink}>Sign in</Text>
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

  verifyIconWrap: { alignItems: 'center', marginBottom: 20, marginTop: 20 },
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
