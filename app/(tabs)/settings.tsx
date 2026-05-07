import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

const BG = '#f5f4f0';

type SettingItem = {
  icon: string;
  label: string;
  badge?: string;
  onPress: () => void;
};

function getAvatarColor(name: string) {
  const colors = [
    { bg: '#bbf7d0', text: '#16a34a' },
    { bg: '#bfdbfe', text: '#2563eb' },
    { bg: '#ddd6fe', text: '#7c3aed' },
    { bg: '#fecaca', text: '#dc2626' },
    { bg: '#fed7aa', text: '#ea580c' },
    { bg: '#fbcfe8', text: '#db2777' },
  ];
  return colors[(name || 'A').charCodeAt(0) % colors.length];
}

export default function SettingsScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ')
    || user?.username
    || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0]
    || 'User';

  const emailAddress = user?.emailAddresses?.[0]?.emailAddress ?? '';
  const initials = displayName[0]?.toUpperCase() ?? 'U';
  const av = getAvatarColor(displayName);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const settingItems: SettingItem[] = [
    {
      icon: 'message-text-outline',
      label: 'Banks & SMS',
      badge: 'connected',
      onPress: () => Alert.alert('Banks & SMS', 'Manage your connected bank SMS sources.'),
    },
    {
      icon: 'bell-outline',
      label: 'Notifications',
      onPress: () => Alert.alert('Notifications', 'Manage budget alerts and reminders.'),
    },
    {
      icon: 'filter-outline',
      label: 'Category rules',
      onPress: () => Alert.alert('Category rules', 'Auto-categorisation rules for your transactions.'),
    },
    {
      icon: 'file-export-outline',
      label: 'Export & sync',
      onPress: () => Alert.alert('Export & sync', 'Export transactions as CSV or sync to cloud.'),
    },
    {
      icon: 'shield-outline',
      label: 'Privacy & permissions',
      badge: 'On-device',
      onPress: () => Alert.alert('Privacy', 'All your data is stored on-device and never shared.'),
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
        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.7}
          onPress={() => Alert.alert('Profile', `Signed in as ${emailAddress}`)}
        >
          <View style={[styles.avatar, { backgroundColor: av.bg }]}>
            <Text style={[styles.avatarText, { color: av.text }]}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{emailAddress}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#d1d5db" />
        </TouchableOpacity>

        {/* Settings list */}
        <View style={styles.settingsCard}>
          {settingItems.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.settingRow, idx < settingItems.length - 1 && styles.settingRowBorder]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name={item.icon as any} size={20} color="#6b7280" style={styles.settingIcon} />
              <Text style={styles.settingLabel}>{item.label}</Text>
              <View style={styles.settingRight}>
                {item.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
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
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  profileEmail: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },

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
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: '#f3f4f6', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  badgeText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    marginBottom: 32,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#dc2626' },

  footer: { textAlign: 'center', fontSize: 12, color: '#c4c4c4', fontWeight: '500' },
});
