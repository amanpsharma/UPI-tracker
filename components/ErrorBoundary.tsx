import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radius } from '@/constants/theme';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log so the dev console / Sentry / Crashlytics can pick it up
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="alert-circle-outline" size={56} color={colors.danger} />
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            The app hit an unexpected error. Tap below to recover.
          </Text>

          {__DEV__ && (
            <View style={styles.errorBox}>
              <Text style={styles.errorLabel}>Error</Text>
              <Text style={styles.errorMessage}>{error.message}</Text>
              {error.stack ? (
                <>
                  <Text style={[styles.errorLabel, { marginTop: 12 }]}>Stack</Text>
                  <Text style={styles.errorStack} numberOfLines={20}>
                    {error.stack}
                  </Text>
                </>
              ) : null}
            </View>
          )}

          <TouchableOpacity style={styles.retryBtn} onPress={this.reset} activeOpacity={0.85}>
            <MaterialCommunityIcons name="refresh" size={18} color={colors.text} />
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  iconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.dangerSoft,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22, fontWeight: '800', color: colors.text,
    marginBottom: 8, textAlign: 'center',
    fontFamily: fonts.extrabold,
  },
  subtitle: {
    fontSize: 14, color: colors.textSecondary, textAlign: 'center',
    marginBottom: 24, lineHeight: 20,
    fontFamily: fonts.regular,
  },
  errorBox: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.dangerSoft,
    borderRadius: radius.md, padding: 14,
    marginBottom: 24, width: '100%',
  },
  errorLabel: {
    fontSize: 11, fontWeight: '700',
    color: colors.textMuted, letterSpacing: 0.6,
    marginBottom: 4, fontFamily: fonts.bold,
  },
  errorMessage: {
    fontSize: 13, color: colors.danger,
    fontFamily: 'GeistMono_400Regular',
  },
  errorStack: {
    fontSize: 11, color: colors.textSecondary,
    fontFamily: 'GeistMono_400Regular',
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 22, paddingVertical: 13,
    borderRadius: radius.md,
  },
  retryText: {
    color: colors.text, fontSize: 15, fontWeight: '700',
    fontFamily: fonts.bold,
  },
});
