import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
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

const BG = '#f5f4f0';

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

  // Force-refresh user profile every time this tab is opened
  useFocusEffect(useCallback(() => {
    user?.reload();
  }, [user]));

  const emailAddress =
    user?.emailAddresses?.[0]?.emailAddress
    ?? user?.primaryEmailAddress?.emailAddress
    ?? '';

  const displayName =
    (user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName ?? '')
    || user?.fullName
    || user?.username
    || emailAddress.split('@')[0]
    || 'User';

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const av = avatarStyle(displayName || 'U');

  const memberSince = user?.createdAt
    ? format(new Date(user.createdAt), 'MMM yyyy')
    : null;

  const isEmailVerified =
    user?.emailAddresses?.[0]?.verification?.status === 'verified';

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            // (tabs)/_layout.tsx redirects to /(auth)/sign-in once isSignedIn=false
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
      // Re-check budget thresholds after new transactions come in
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
      label: syncing ? 'Syncing SMS…' : 'Sync SMS now',
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
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.title}>Settings</Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          {/* Avatar */}
          <View style={styles.profileTop}>
            <View style={[styles.avatar, { backgroundColor: av.bg }]}>
              <Text style={[styles.avatarText, { color: av.text }]}>
                {isLoaded ? initials : '?'}
              </Text>
            </View>
            {isEmailVerified && (
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#16a34a" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          {/* Name + email */}
          {isLoaded ? (
            <>
              <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
              {emailAddress ? (
                <Text style={styles.profileEmail} numberOfLines={1}>{emailAddress}</Text>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.skeletonName} />
              <View style={styles.skeletonEmail} />
            </>
          )}

          {/* Member since */}
          {memberSince && (
            <View style={styles.memberRow}>
              <MaterialCommunityIcons name="calendar-outline" size={13} color="#9ca3af" />
              <Text style={styles.memberText}>Member since {memberSince}</Text>
            </View>
          )}
        </View>

        {/* Settings list */}
        <View style={styles.settingsCard}>
          {settingItems.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.settingRow, idx < settingItems.length - 1 && styles.settingRowBorder]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={20}
                color={item.comingSoon ? '#c4c4c4' : '#6b7280'}
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
                <MaterialCommunityIcons name="chevron-right" size={18} color="#d1d5db" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
          <MaterialCommunityIcons name="logout" size={18} color="#dc2626" />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>UPI Tracker · v1.0 · On-device</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  title: { fontSize: 34, fontWeight: '800', color: '#111827', letterSpacing: -0.5, marginBottom: 24 },

  // Profile card
  profileCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    marginBottom: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  profileTop: { alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: { fontSize: 28, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0fdf4', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  verifiedText: { fontSize: 12, color: '#16a34a', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  profileName: {
    fontSize: 20, fontWeight: '800', color: '#111827',
    fontFamily: 'Inter_800ExtraBold', textAlign: 'center', marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13, color: '#9ca3af', fontWeight: '500',
    fontFamily: 'Inter_500Medium', textAlign: 'center', marginBottom: 10,
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  memberText: { fontSize: 12, color: '#9ca3af', fontFamily: 'Inter_400Regular' },
  skeletonName: { height: 20, width: 140, backgroundColor: '#f3f4f6', borderRadius: 8, marginBottom: 8 },
  skeletonEmail: { height: 13, width: 180, backgroundColor: '#f3f4f6', borderRadius: 6, marginBottom: 10 },

  // Settings card
  settingsCard: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  settingIcon: { marginRight: 14 },
  settingLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#111827' },
  settingLabelMuted: { color: '#9ca3af' },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: '#f3f4f6', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  badgeSoft: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  badgeTextSoft: { color: '#a16207' },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    marginBottom: 32,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#dc2626' },

  footer: { textAlign: 'center', fontSize: 12, color: '#c4c4c4', fontWeight: '500', fontFamily: 'GeistMono_400Regular' },
});
