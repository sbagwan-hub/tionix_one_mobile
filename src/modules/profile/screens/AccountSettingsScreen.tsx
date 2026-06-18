import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import AppCard from '../../../components/AppCard';

const settingsRows = [
  {
    id: 'password',
    title: 'Change password',
    subtitle: 'Update your account password',
    icon: 'key-outline',
  },
  {
    id: 'device',
    title: 'Device information',
    subtitle: 'View registered device details',
    icon: 'phone-portrait-outline',
  },
  {
    id: 'privacy',
    title: 'Privacy policy',
    subtitle: 'Read attendance and location policy',
    icon: 'shield-checkmark-outline',
  },
];

const AccountSettingsScreen = ({ navigation }: any) => {
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [locationAlertsEnabled, setLocationAlertsEnabled] = useState(true);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Stunning Background Banner */}
      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(254, 0, 0, 0.15)', 'rgba(254, 0, 0, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AppCard style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="finger-print-outline" size={moderateScale(20)} color={Colors.primary} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>Biometric verification</Text>
              <Text style={styles.settingSubtitle}>Require fingerprint or Face ID for punch</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{ false: 'rgba(0,0,0,0.1)', true: 'rgba(254, 0, 0, 0.2)' }}
              thumbColor={biometricEnabled ? Colors.primary : Colors.white}
            />
          </View>

          <View style={[styles.settingRow, styles.settingRowLast]}>
            <View style={styles.settingIcon}>
              <Ionicons name="location-outline" size={moderateScale(20)} color={Colors.primary} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>Location alerts</Text>
              <Text style={styles.settingSubtitle}>Show reminders when GPS is unavailable</Text>
            </View>
            <Switch
              value={locationAlertsEnabled}
              onValueChange={setLocationAlertsEnabled}
              trackColor={{ false: 'rgba(0,0,0,0.1)', true: 'rgba(254, 0, 0, 0.2)' }}
              thumbColor={locationAlertsEnabled ? Colors.primary : Colors.white}
            />
          </View>
        </AppCard>

        <AppCard style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Account</Text>
          {settingsRows.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.settingRow, index === settingsRows.length - 1 && styles.settingRowLast]}
            >
              <View style={styles.settingIcon}>
                <Ionicons name={item.icon as any} size={moderateScale(20)} color={Colors.primary} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={moderateScale(18)} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </AppCard>

        <AppCard style={styles.versionCard}>
          <Ionicons name="information-circle-outline" size={moderateScale(20)} color={Colors.textMuted} />
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>Attendance v1.0.2</Text>
            <Text style={styles.settingSubtitle}>Your app is up to date.</Text>
          </View>
        </AppCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: moderateScale(280),
    overflow: 'hidden',
  },
  bannerGradient: {
    flex: 1,
  },
  bannerBlurOrb1: {
    position: 'absolute',
    top: -moderateScale(50),
    left: -moderateScale(50),
    width: moderateScale(200),
    height: moderateScale(200),
    borderRadius: moderateScale(100),
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    filter: 'blur(40px)',
  },
  bannerBlurOrb2: {
    position: 'absolute',
    top: moderateScale(40),
    right: -moderateScale(60),
    width: moderateScale(250),
    height: moderateScale(250),
    borderRadius: moderateScale(125),
    backgroundColor: 'rgba(254, 0, 0, 0.1)',
    filter: 'blur(50px)',
  },
  header: {
    backgroundColor: 'transparent',
    paddingBottom: Theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(10),
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  headerSpacer: {
    width: moderateScale(40),
  },
  headerContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.sm,
  },
  heroIcon: {
    width: moderateScale(64),
    height: moderateScale(64),
    borderRadius: Theme.borderRadius.xl,
    backgroundColor: 'rgba(254, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },
  heroTitle: {
    ...Typography.heading,
    color: Colors.text,
    fontSize: moderateScale(28),
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: moderateScale(6),
    lineHeight: moderateScale(22),
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: moderateScale(120),
    gap: Theme.spacing.lg,
  },
  settingsCard: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.md,
  },
  sectionTitle: {
    ...Typography.label,
    marginLeft: moderateScale(4),
    marginBottom: Theme.spacing.sm,
    color: Colors.textMuted,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(14),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingIcon: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: moderateScale(10),
    backgroundColor: 'rgba(254, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
  },
  settingCopy: {
    flex: 1,
  },
  settingTitle: {
    ...Typography.heading,
    fontSize: moderateScale(15),
    color: Colors.text,
  },
  settingSubtitle: {
    ...Typography.body,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginTop: moderateScale(2),
  },
  versionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
});

export default AccountSettingsScreen;
