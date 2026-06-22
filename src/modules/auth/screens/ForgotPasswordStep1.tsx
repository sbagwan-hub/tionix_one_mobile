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
import { getEmployeeSecurityQuestion } from '../services/auth';

interface ForgotPasswordStep1Props {
  navigation: any;
  route: any;
}

const ForgotPasswordStep1 = ({ navigation, route }: ForgotPasswordStep1Props) => {
  const [username, setUsername] = useState('');
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);

  const handleContinue = async () => {
    if (!username.trim()) {
      setError('Please enter your username or employee ID');
      return;
    }
    
    Keyboard.dismiss();
    setIsLoadingQuestion(true);
    setError('');

    try {
      const question = await getEmployeeSecurityQuestion(username.trim());
      navigation.navigate('VerificationStep2', {
        username: username.trim(),
        securityQuestion: question.question,
      });
    } catch (error: any) {
      setError(error.message || 'Employee not found. Please check your username.');
    } finally {
      setIsLoadingQuestion(false);
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
              <Text style={styles.stepText}>STEP 01/03</Text>
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
                <View style={styles.iconRingOuter} />
                <View style={styles.iconRingMiddle} />
                <View style={styles.iconCircle}>
                  <Ionicons 
                    name="lock-closed" 
                    size={moderateScale(36)} 
                    color={Colors.primary} 
                  />
                </View>
              </View>
              
              {/* Title */}
              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.subtitle}>
                Enter your username or employee ID to begin the password recovery process.
              </Text>

              {/* Error */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={20} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Input Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Username / Mobile</Text>
                <View
                  style={[
                    styles.inputRow,
                    isUsernameFocused && styles.inputRowFocused,
                    error && styles.inputRowError,
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={isUsernameFocused ? Colors.primary : error ? Colors.error : Colors.textMuted}
                  />
                  <TextInput
                    placeholder="Username or mobile"
                    placeholderTextColor={Colors.textMuted}
                    value={username}
                    onChangeText={(text) => {
                      setUsername(text);
                      if (error) setError('');
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="default"
                    onFocus={() => setIsUsernameFocused(true)}
                    onBlur={() => setIsUsernameFocused(false)}
                    style={styles.input}
                  />
                </View>
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                onPress={handleContinue}
                disabled={isLoadingQuestion || !username.trim()}
                activeOpacity={0.9}
                style={styles.continueButtonWrapper}
              >
                <LinearGradient
                  colors={Colors.primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.continueButton,
                    (isLoadingQuestion || !username.trim()) && styles.continueButtonDisabled,
                  ]}
                >
                  {isLoadingQuestion ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Text style={styles.continueButtonText}>Continue</Text>
                      <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                    </>
                  )}
                </LinearGradient>
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
    position: 'relative',
  },
  iconRingOuter: {
    position: 'absolute',
    width: moderateScale(110),
    height: moderateScale(110),
    borderRadius: moderateScale(55),
    borderWidth: 1.5,
    borderColor: 'rgba(255, 77, 28, 0.15)',
  },
  iconRingMiddle: {
    position: 'absolute',
    width: moderateScale(95),
    height: moderateScale(95),
    borderRadius: moderateScale(47.5),
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 28, 0.12)',
  },
  iconCircle: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    backgroundColor: 'rgba(255, 77, 28, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 77, 28, 0.2)',
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
  continueButtonWrapper: {
    marginTop: Theme.spacing.sm,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.xl,
    paddingVertical: moderateScale(16),
    paddingHorizontal: Theme.spacing.lg,
    ...Theme.shadow.card,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: Colors.white,
    fontSize: moderateScale(16),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default ForgotPasswordStep1;
