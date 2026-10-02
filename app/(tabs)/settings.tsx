import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { syncSmsToMongo } from '@/services/smsSyncAndroid';
import { showToast } from '@/services/toast';
import { avatarStyle } from '@/constants/ui';
import { checkBudgetAlerts, requestNotificationPermission } from '@/services/budgetAlert';
import { colors, fonts, radius } from '@/constants/theme';
import PressableScale from '@/components/PressableScale';

type SettingItem = {
  icon: string;
  label: string;
  badge?: string;
  comingSoon?: boolean;
  onPress: () => void;
};

export default function SettingsScreen() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  useFocusEffect(
    useCallback(() => {
      user?.reload();
    }, [user]),
  );

  const emailAddress =
    user?.emailAddresses?.[0]?.emailAddress ?? user?.primaryEmailAddress?.emailAddress ?? '';

  const displayName =
    (user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : (user?.firstName ?? '')) ||
    user?.fullName ||
    user?.username ||
    emailAddress.split('@')[0] ||
    'User';

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const av = avatarStyle(displayName || 'U');

  const memberSince = user?.createdAt ? format(new Date(user.createdAt), 'MMM yyyy') : null;

  const isEmailVerified = user?.emailAddresses?.[0]?.verification?.status === 'verified';

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (e) {
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
    ]);
  };

  const [syncing, setSyncing] = useState(false);

  const handleSyncSms = async () => {
    if (Platform.OS !== 'android') {
      showToast('SMS sync is only available on Android', 'info');
      return;
    }
    if (syncing) return;
    setSyncing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { imported, found } = await syncSmsToMongo();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (imported > 0) {
        showToast(`Imported ${imported} new transaction${imported === 1 ? '' : 's'}`, 'success');
      } else if (found > 0) {
        showToast('All UPI messages already imported', 'info');
      } else {
        showToast('No UPI messages found in inbox', 'info');
      }
      checkBudgetAlerts().catch(() => {});
    } catch (err: any) {
      showToast(err?.message ?? 'SMS sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleBudgetAlerts = async () => {
    const granted = await requestNotificationPermission();
    if (!granted) {
      showToast('Enable notifications in device settings to receive budget alerts', 'info');
      return;
    }
    await checkBudgetAlerts();
    showToast('Budget alerts checked', 'success');
  };

  const settingItems: SettingItem[] = [
    {
      icon: 'message-text-outline',
      label: syncing ? 'Syncing SMS...' : 'Sync SMS now',
      badge: Platform.OS === 'android' ? undefined : 'iOS unsupported',
      onPress: handleSyncSms,
    },
    {
      icon: 'bell-outline',
      label: 'Budget alerts',
      onPress: handleBudgetAlerts,
    },
    {
      icon: 'filter-outline',
      label: 'Auto-categorize rules',
      onPress: () => router.push('/category-rules'),
    },
    {
      icon: 'file-export-outline',
      label: 'Export & sync',
      onPress: () => router.push('/export'),
    },
    {
      icon: 'shield-outline',
      label: 'Privacy & permissions',
      badge: 'On-device',
      onPress: () =>
        Alert.alert(
          'Privacy & permissions',
          'SMS data is read on-device, parsed locally, and only the extracted transaction details are sent to your private server. Raw SMS messages never leave your phone.',
        ),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={[styles.avatar, { backgroundColor: av.bg }]}>
              <Text style={[styles.avatarText, { color: av.text }]}>
                {isLoaded ? initials : '?'}
              </Text>
            </View>
            {isEmailVerified && (
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-circle" size={14} color={colors.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          {isLoaded ? (
            <>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName}
              </Text>
              {emailAddress ? (
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {emailAddress}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.skeletonName} />
              <View style={styles.skeletonEmail} />
            </>
          )}

          {memberSince && (
            <View style={styles.memberRow}>
              <MaterialCommunityIcons name="calendar-outline" size={13} color={colors.textMuted} />
              <Text style={styles.memberText}>Member since {memberSince}</Text>
            </View>
          )}
        </View>

        {/* Settings list */}
        <View style={styles.settingsCard}>
          {settingItems.map((item, idx) => (
            <PressableScale
              key={item.label}
              style={[styles.settingRow, idx < settingItems.length - 1 && styles.settingRowBorder]}
              onPress={item.onPress}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={20}
                color={item.comingSoon ? colors.textDisabled : colors.textSecondary}
                style={styles.settingIcon}
              />
              <Text style={[styles.settingLabel, item.comingSoon && styles.settingLabelMuted]}>
                {item.label}
              </Text>
              <View style={styles.settingRight}>
                {item.badge ? (
                  <View style={[styles.badge, item.comingSoon && styles.badgeSoft]}>
                    <Text style={[styles.badgeText, item.comingSoon && styles.badgeTextSoft]}>
                      {item.badge}
                    </Text>
                  </View>
                ) : null}
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
              </View>
            </PressableScale>
          ))}
        </View>

        {/* Sign out */}
        <PressableScale style={styles.signOutBtn} onPress={handleSignOut}>
          <MaterialCommunityIcons name="logout" size={18} color={colors.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </PressableScale>

        {/* Footer */}
        <Text style={styles.footer}>PayFlow · v2.0 · On-device</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 24,
    fontFamily: fonts.extrabold,
  },

  // Profile card
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileTop: { alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: { fontSize: 28, fontWeight: '800', fontFamily: fonts.extrabold },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successSoft,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    fontFamily: fonts.semibold,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    fontFamily: fonts.extrabold,
    textAlign: 'center',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginBottom: 10,
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  memberText: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.regular },
  skeletonName: {
    height: 20,
    width: 140,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonEmail: {
    height: 13,
    width: 180,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 6,
    marginBottom: 10,
  },

  // Settings card
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  settingIcon: { marginRight: 14 },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    fontFamily: fonts.medium,
  },
  settingLabelMuted: { color: colors.textMuted },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeSoft: { backgroundColor: colors.warningSoft },
  badgeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: fonts.medium,
  },
  badgeTextSoft: { color: colors.warning },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    paddingVertical: 15,
    marginBottom: 32,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
    fontFamily: fonts.semibold,
  },

  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    fontFamily: fonts.monoRegular,
  },
});
