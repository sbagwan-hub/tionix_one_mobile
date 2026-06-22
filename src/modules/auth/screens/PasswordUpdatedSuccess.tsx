import React, { useEffect } from 'react';
import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../../../theme/colors';
import { moderateScale } from '../../../utils/responsive';
import { Typography } from '../../../theme/typography';

interface PasswordUpdatedSuccessProps {
  navigation: any;
}

const PasswordUpdatedSuccess = ({ navigation }: PasswordUpdatedSuccessProps) => {
  useEffect(() => {
    // Auto-navigate to login screen after 5 milliseconds
    const timer = setTimeout(() => {
      navigation.navigate('Login');
    }, 5);

    return () => clearTimeout(timer);
  }, [navigation]);

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Xone</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconRings}>
              <View style={[styles.ring, styles.ring1]} />
              <View style={[styles.ring, styles.ring2]} />
            </View>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark" size={moderateScale(36)} color={Colors.white} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Password Updated</Text>

          {/* Description */}
          <Text style={styles.description}>
            Your credentials have been successfully reset. You can now access your{' '}
            <Text style={styles.highlight}>Xone</Text> account securely.
          </Text>

          {/* Back to Login Button */}
          <TouchableOpacity
            onPress={handleBackToLogin}
            activeOpacity={0.9}
            style={styles.loginButtonWrapper}
          >
            <LinearGradient
              colors={Colors.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.loginButton}
            >
              <Text style={styles.loginButtonText}>Back to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Security Badge */}
        <View style={styles.footer}>
          <View style={styles.securityBadge}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
            <View style={styles.badgeTextContainer}>
              <Text style={styles.badgeTitle}>VERIFIED SECURE</Text>
              <Text style={styles.badgeSubtitle}>End-to-end encrypted protocol</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.lg,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: moderateScale(24),
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xxl,
    position: 'relative',
  },
  iconRings: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: moderateScale(100),
    borderWidth: 2,
  },
  ring1: {
    width: moderateScale(140),
    height: moderateScale(140),
    borderColor: 'rgba(255, 77, 28, 0.15)',
  },
  ring2: {
    width: moderateScale(180),
    height: moderateScale(180),
    borderColor: 'rgba(255, 77, 28, 0.08)',
  },
  iconCircle: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(20),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadow.floating,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
  },
  title: {
    ...Typography.heading,
    fontSize: moderateScale(32),
    fontWeight: '900',
    color: Colors.text,
    marginBottom: Theme.spacing.lg,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    ...Typography.body,
    fontSize: moderateScale(16),
    color: Colors.textSecondary,
    marginBottom: Theme.spacing.xxl,
    textAlign: 'center',
    lineHeight: moderateScale(26),
  },
  highlight: {
    color: Colors.primary,
    fontWeight: '700',
  },
  loginButtonWrapper: {
    width: '100%',
  },
  loginButton: {
    borderRadius: Theme.borderRadius.xl,
    paddingVertical: moderateScale(16),
    paddingHorizontal: Theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.card,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xxl,
    alignItems: 'center',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  badgeTextContainer: {
    flex: 1,
  },
  badgeTitle: {
    ...Typography.label,
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: moderateScale(2),
  },
  badgeSubtitle: {
    ...Typography.body,
    fontSize: moderateScale(10),
    color: Colors.textSecondary,
  },
});

export default PasswordUpdatedSuccess;
