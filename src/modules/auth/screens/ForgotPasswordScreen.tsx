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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../../../theme/colors';
import { moderateScale } from '../../../utils/responsive';
import { Typography } from '../../../theme/typography';
import PrimaryButton from '../../../components/PrimaryButton';

const ForgotPasswordScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReset = async () => {
    if (!email) return;
    
    Keyboard.dismiss();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
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
              <View style={styles.iconFrame}>
                <Ionicons name="key-outline" size={moderateScale(32)} color={Colors.primary} />
              </View>
              
              <Text style={styles.formTitle}>Forgot Password?</Text>
              <Text style={styles.formSubtitle}>
                No worries! Enter the email address associated with your account and we'll send you a reset link.
              </Text>

              {!isSuccess ? (
                <>
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, isEmailFocused && styles.fieldLabelFocused]}>Email Address</Text>
                    <View
                      style={[
                        styles.inputRow,
                        isEmailFocused && styles.inputRowFocused,
                      ]}
                    >
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color={isEmailFocused ? Colors.primary : Colors.textMuted}
                      />
                      <TextInput
                        placeholder="Enter your email"
                        placeholderTextColor={Colors.textMuted}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        onFocus={() => setIsEmailFocused(true)}
                        onBlur={() => setIsEmailFocused(false)}
                        style={styles.input}
                      />
                    </View>
                  </View>

                  <PrimaryButton
                    label="Send Reset Link"
                    onPress={handleReset}
                    loading={isSubmitting}
                    disabled={isSubmitting || !email}
                    style={styles.submitButton}
                  />
                </>
              ) : (
                <View style={styles.successContainer}>
                  <View style={styles.successIconBadge}>
                    <Ionicons name="checkmark-circle" size={moderateScale(48)} color={Colors.success} />
                  </View>
                  <Text style={styles.successTitle}>Check your inbox</Text>
                  <Text style={styles.successMessage}>
                    We've sent password reset instructions to your email address.
                  </Text>
                  <PrimaryButton
                    label="Back to Login"
                    onPress={() => navigation.goBack()}
                    style={styles.submitButton}
                  />
                </View>
              )}
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
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadow.sm,
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
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xl,
  },
  iconFrame: {
    width: moderateScale(64),
    height: moderateScale(64),
    borderRadius: Theme.borderRadius.xl,
    backgroundColor: Colors.inputBgFocused,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(254, 0, 0, 0.1)',
  },
  formTitle: {
    ...Typography.heading,
    fontSize: moderateScale(26),
    fontWeight: '900',
    color: Colors.text,
    marginBottom: Theme.spacing.xs,
    letterSpacing: -0.5,
  },
  formSubtitle: {
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    marginBottom: Theme.spacing.xl,
    lineHeight: moderateScale(22),
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
  input: {
    flex: 1,
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: Colors.text,
    padding: 0,
    fontFamily: 'Outfit_600SemiBold',
  },
  submitButton: {
    marginTop: Theme.spacing.sm,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
  },
  successIconBadge: {
    marginBottom: Theme.spacing.md,
  },
  successTitle: {
    ...Typography.heading,
    fontSize: moderateScale(22),
    color: Colors.text,
    marginBottom: Theme.spacing.sm,
  },
  successMessage: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Theme.spacing.xxl,
  },
});

export default ForgotPasswordScreen;
