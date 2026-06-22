import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../../../theme/colors';
import { moderateScale } from '../../../utils/responsive';
import { Typography } from '../../../theme/typography';
import { resetPassword } from '../services/auth';

interface NewPasswordStep3Props {
  navigation: any;
  route: any;
}

const NewPasswordStep3 = ({ navigation, route }: NewPasswordStep3Props) => {
  const { username, answer } = route.params;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Password requirements
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const hasUppercase = /[A-Z]/.test(newPassword);

  // Calculate strength
  const getStrength = () => {
    const requirements = [hasMinLength, hasNumber, hasSpecialChar, hasUppercase];
    const met = requirements.filter(Boolean).length;
    if (met <= 1) return { label: 'WEAK', color: Colors.error, progress: 0.25 };
    if (met === 2) return { label: 'FAIR', color: Colors.warning, progress: 0.5 };
    if (met === 3) return { label: 'GOOD', color: Colors.primaryLight, progress: 0.75 };
    return { label: 'STRONG', color: Colors.success, progress: 1 };
  };

  const strength = getStrength();

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      setError('Please enter a new password');
      return;
    }
    if (!confirmPassword.trim()) {
      setError('Please confirm your password');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length > 10) {
      setError('Password must be at most 10 characters');
      return;
    }
    
    Keyboard.dismiss();
    setIsSubmitting(true);
    setError('');

    try {
      await resetPassword({
        username: username,
        answer: answer,
        new_password: newPassword.trim(),
      });
      navigation.navigate('PasswordUpdatedSuccess');
    } catch (error: any) {
      setError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Forgot Password</Text>
            <View style={styles.stepIndicator}>
              <Ionicons name="footsteps" size={14} color={Colors.primary} />
              <Text style={styles.stepText}>STEP 03/03</Text>
            </View>
          </View>
        </SafeAreaView>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.body}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.formContainer}>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                  <Ionicons name="refresh" size={moderateScale(28)} color={Colors.primary} style={styles.refreshIcon} />
                  <Ionicons name="lock-closed" size={moderateScale(24)} color={Colors.primary} />
                </View>
              </View>
              
              {/* Title */}
              <Text style={styles.title}>New Password</Text>
              <Text style={styles.subtitle}>
                Create a robust password to secure your Workforce Pro workspace.
              </Text>

              {/* Error */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={20} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* New Password Input */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, isNewPasswordFocused && styles.fieldLabelFocused]}>NEW PASSWORD</Text>
                <View
                  style={[
                    styles.inputRow,
                    isNewPasswordFocused && styles.inputRowFocused,
                    error && styles.inputRowError,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={isNewPasswordFocused ? Colors.primary : error ? Colors.error : Colors.textMuted}
                  />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor={Colors.textMuted}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      if (error) setError('');
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!showPassword}
                    onFocus={() => setIsNewPasswordFocused(true)}
                    onBlur={() => setIsNewPasswordFocused(false)}
                    style={styles.input}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                {/* Strength Indicator */}
                {newPassword.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBarBackground}>
                      <View
                        style={[
                          styles.strengthBarFill,
                          { width: `${strength.progress * 100}%`, backgroundColor: strength.color },
                        ]}
                      />
                    </View>
                    <Text style={[styles.strengthText, { color: strength.color }]}>
                      {strength.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, isConfirmPasswordFocused && styles.fieldLabelFocused]}>CONFIRM NEW PASSWORD</Text>
                <View
                  style={[
                    styles.inputRow,
                    isConfirmPasswordFocused && styles.inputRowFocused,
                    error && styles.inputRowError,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={isConfirmPasswordFocused ? Colors.primary : error ? Colors.error : Colors.textMuted}
                  />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor={Colors.textMuted}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (error) setError('');
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!showConfirmPassword}
                    onFocus={() => setIsConfirmPasswordFocused(true)}
                    onBlur={() => setIsConfirmPasswordFocused(false)}
                    style={styles.input}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Requirements */}
              <View style={styles.requirementsContainer}>
                <View style={styles.requirementItem}>
                  <Ionicons
                    name={hasMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={hasMinLength ? Colors.success : Colors.textMuted}
                  />
                  <Text style={[styles.requirementText, hasMinLength && styles.requirementTextMet]}>
                    8+ CHARACTERS
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons
                    name={hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={hasNumber ? Colors.success : Colors.textMuted}
                  />
                  <Text style={[styles.requirementText, hasNumber && styles.requirementTextMet]}>
                    ONE NUMBER
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons
                    name={hasSpecialChar ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={hasSpecialChar ? Colors.success : Colors.textMuted}
                  />
                  <Text style={[styles.requirementText, hasSpecialChar && styles.requirementTextMet]}>
                    SPECIAL CHAR
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons
                    name={hasUppercase ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={hasUppercase ? Colors.success : Colors.textMuted}
                  />
                  <Text style={[styles.requirementText, hasUppercase && styles.requirementTextMet]}>
                    UPPERCASE
                  </Text>
                </View>
              </View>

              {/* Reset Password Button */}
              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={isSubmitting || !newPassword.trim() || !confirmPassword.trim()}
                activeOpacity={0.9}
                style={styles.resetButtonWrapper}
              >
                <LinearGradient
                  colors={Colors.primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.resetButton,
                    (isSubmitting || !newPassword.trim() || !confirmPassword.trim()) && styles.resetButtonDisabled,
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Text style={styles.resetButtonText}>Reset Password</Text>
                      <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Footer */}
              <View style={styles.footer}>
                <View style={styles.footerContent}>
                  <Ionicons name="shield-checkmark" size={16} color={Colors.primary} />
                  <Text style={styles.footerText}>End-to-End Encrypted Handshake</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadow.sm,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: Colors.text,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.md,
  },
  stepText: {
    ...Typography.label,
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  formContainer: {
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  iconCircle: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    backgroundColor: 'rgba(255, 77, 28, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  refreshIcon: {
    position: 'absolute',
    top: moderateScale(10),
  },
  title: {
    ...Typography.heading,
    fontSize: moderateScale(28),
    fontWeight: '900',
    color: Colors.text,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    marginBottom: Theme.spacing.xl,
    textAlign: 'center',
    lineHeight: moderateScale(22),
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    marginBottom: Theme.spacing.lg,
  },
  errorText: {
    ...Typography.body,
    fontSize: moderateScale(12),
    color: Colors.error,
    flex: 1,
  },
  fieldGroup: {
    marginBottom: Theme.spacing.xl,
  },
  fieldLabel: {
    ...Typography.label,
    fontSize: moderateScale(12),
    marginBottom: Theme.spacing.sm,
    marginLeft: moderateScale(4),
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  fieldLabelFocused: {
    color: Colors.primary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: moderateScale(16),
    ...Theme.shadow.sm,
    shadowColor: 'rgba(0,0,0,0.02)',
  },
  inputRowFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    ...Theme.shadow.md,
    shadowColor: Colors.primary,
    shadowOpacity: 0.1,
  },
  inputRowError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.text,
    padding: 0,
    fontFamily: 'Outfit_600SemiBold',
  },
  strengthContainer: {
    marginTop: Theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  strengthBarBackground: {
    flex: 1,
    height: moderateScale(6),
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Theme.borderRadius.pill,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: Theme.borderRadius.pill,
  },
  strengthText: {
    ...Typography.label,
    fontSize: moderateScale(10),
    fontWeight: '700',
    minWidth: moderateScale(40),
  },
  requirementsContainer: {
    marginBottom: Theme.spacing.xl,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  requirementText: {
    ...Typography.body,
    fontSize: moderateScale(12),
    color: Colors.textMuted,
    fontWeight: '600',
  },
  requirementTextMet: {
    color: Colors.success,
  },
  resetButtonWrapper: {
    marginTop: Theme.spacing.sm,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.xl,
    paddingVertical: moderateScale(16),
    paddingHorizontal: Theme.spacing.lg,
    ...Theme.shadow.card,
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: Theme.spacing.xl,
    alignItems: 'center',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
  },
  footerText: {
    ...Typography.label,
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: Colors.textSecondary,
  },
});

export default NewPasswordStep3;
