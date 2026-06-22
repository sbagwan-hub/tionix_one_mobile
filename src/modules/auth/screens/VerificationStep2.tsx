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
import { validateForgotPasswordCredentials } from '../services/auth';

interface VerificationStep2Props {
  navigation: any;
  route: any;
}

const VerificationStep2 = ({ navigation, route }: VerificationStep2Props) => {
  const { username, securityQuestion } = route.params;
  const [answer, setAnswer] = useState('');
  const [isAnswerFocused, setIsAnswerFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const handleVerify = async () => {
    if (!answer.trim()) {
      setError('Please enter your answer');
      return;
    }
    
    Keyboard.dismiss();
    setIsSubmitting(true);
    setError('');

    try {
      await validateForgotPasswordCredentials({
        username: username,
        answer: answer.trim(),
      });
      navigation.navigate('NewPasswordStep3', {
        username: username,
        answer: answer.trim(),
      });
    } catch (error: any) {
      const newAttempts = wrongAttempts + 1;
      setWrongAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        setIsLocked(true);
        setError('Maximum attempts reached. Please contact your HR or Admin for assistance.');
      } else {
        const remainingAttempts = 3 - newAttempts;
        setError(`Invalid answer. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
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
              <Text style={styles.stepText}>STEP 02/03</Text>
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
                  <Ionicons name="shield-checkmark" size={moderateScale(36)} color={Colors.primary} />
                </View>
              </View>
              
              {/* Title */}
              <Text style={styles.title}>Verification</Text>
              <Text style={styles.subtitle}>
                Answer your security question to verify your identity.
              </Text>

              {/* Error */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={20} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Security Question */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>SECURITY QUESTION</Text>
                <View style={styles.questionContainer}>
                  <Ionicons name="help-circle-outline" size={20} color={Colors.primary} />
                  <Text style={styles.questionText}>{securityQuestion}</Text>
                </View>
              </View>

              {/* Answer Input */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, isAnswerFocused && styles.fieldLabelFocused]}>YOUR ANSWER</Text>
                <View
                  style={[
                    styles.inputRow,
                    isAnswerFocused && styles.inputRowFocused,
                    error && styles.inputRowError,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={isAnswerFocused ? Colors.primary : error ? Colors.error : Colors.textMuted}
                  />
                  <TextInput
                    placeholder="Type answer..."
                    placeholderTextColor={Colors.textMuted}
                    value={answer}
                    onChangeText={(text) => {
                      setAnswer(text);
                      if (error) setError('');
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setIsAnswerFocused(true)}
                    onBlur={() => setIsAnswerFocused(false)}
                    style={styles.input}
                    editable={!isLocked}
                  />
                </View>
              </View>

              {/* Buttons */}
              <TouchableOpacity
                onPress={handleVerify}
                disabled={isSubmitting || !answer.trim() || isLocked}
                activeOpacity={0.9}
                style={styles.verifyButtonWrapper}
              >
                <LinearGradient
                  colors={Colors.primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.verifyButton,
                    (isSubmitting || !answer.trim() || isLocked) && styles.verifyButtonDisabled,
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Text style={styles.verifyButtonText}>Verify Identity</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.backButtonStyle} 
                onPress={handleGoBack}
                disabled={isSubmitting}
              >
                <Text style={[styles.backButtonText, isSubmitting && styles.backButtonTextDisabled]}>
                  Go Back
                </Text>
              </TouchableOpacity>

              
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
  questionContainer: {
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
  },
  questionText: {
    flex: 1,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: Colors.text,
    fontFamily: 'Outfit_600SemiBold',
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
  verifyButtonWrapper: {
    marginTop: Theme.spacing.sm,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.xl,
    paddingVertical: moderateScale(16),
    paddingHorizontal: Theme.spacing.lg,
    ...Theme.shadow.card,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  backButtonStyle: {
    marginTop: Theme.spacing.md,
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
  },
  backButtonText: {
    ...Typography.label,
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  backButtonTextDisabled: {
    opacity: 0.5,
  },
  helpSection: {
    marginTop: Theme.spacing.xxl,
    alignItems: 'center',
  },
  helpText: {
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  helpLink: {
    ...Typography.label,
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: Colors.primary,
  },
});

export default VerificationStep2;
