import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '../../../icons/Ionicons';
import Toast from 'react-native-toast-message';
import { Colors, Theme } from '../../../theme/colors';
import { moderateScale } from '../../../utils/responsive';
import { Typography } from '../../../theme/typography';
import PrimaryButton from '../../../components/PrimaryButton';
import { loginWithCredentials } from '../services/auth';
import { ApiError } from '../../../services/apiClient';
import { COMPANY } from '../../../config/company';

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Focus states
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const handleLogin = async () => {
    Keyboard.dismiss();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await loginWithCredentials({
        Email: email,
        Password: password,
      });

      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        text2: `Welcome back to ${COMPANY.displayName}!`,
        position: 'top',
        topOffset: 60,
      });

      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Unable to sign in right now. Please try again.';

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.logoFrame}>
            <Image
              source={require('../../../assets/app_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brand}>{COMPANY.displayName}</Text>
          <Text style={styles.headerSubtitle}>Sign in to mark attendance and view your records.</Text>
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
              <Text style={styles.formTitle}>Welcome Back</Text>
              <Text style={styles.formSubtitle}>Use your account credentials to continue.</Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, isEmailFocused && styles.fieldLabelFocused]}>
                  Email / Username / Mobile
                </Text>
                <View
                  style={[
                    styles.inputRow,
                    isEmailFocused && styles.inputRowFocused,
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={isEmailFocused ? Colors.primary : Colors.textMuted}
                  />
                  <TextInput
                    placeholder="Email, username, or mobile"
                    placeholderTextColor={Colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="default"
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, isPasswordFocused && styles.fieldLabelFocused]}>Password</Text>
                <View
                  style={[
                    styles.inputRow,
                    isPasswordFocused && styles.inputRowFocused,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={isPasswordFocused ? Colors.primary : Colors.textMuted}
                  />
                  <TextInput
                    placeholder="Enter your password"
                    placeholderTextColor={Colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    style={styles.input}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(current => !current)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.forgotLink} 
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <PrimaryButton
                label="Sign in"
                onPress={handleLogin}
                loading={isSubmitting}
                disabled={isSubmitting}
                style={styles.signInButton}
              />
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
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.lg,
    backgroundColor: Colors.background,
  },
  logoFrame: {
    width: moderateScale(88),
    height: moderateScale(88),
    borderRadius: Theme.borderRadius.xxl,
    backgroundColor: Colors.white,
    padding: moderateScale(14),
    marginBottom: Theme.spacing.md,
    ...Theme.shadow.floating,
    shadowColor: 'rgba(0,0,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: Theme.borderRadius.md,
  },
  brand: {
    ...Typography.title,
    color: Colors.text,
    fontSize: moderateScale(26),
    fontWeight: '900',
    marginBottom: Theme.spacing.xs,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: moderateScale(14),
    maxWidth: moderateScale(300),
    lineHeight: moderateScale(20),
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
  formTitle: {
    ...Typography.heading,
    fontSize: moderateScale(24),
    fontWeight: '900',
    color: Colors.text,
    marginBottom: Theme.spacing.xs,
    letterSpacing: -0.5,
  },
  formSubtitle: {
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    marginBottom: Theme.spacing.lg,
  },
  fieldGroup: {
    marginBottom: Theme.spacing.md,
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
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: Theme.spacing.xl,
    marginTop: -Theme.spacing.xs,
  },
  forgotText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: moderateScale(13),
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Theme.spacing.sm,
    backgroundColor: Colors.errorSoft,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.18)',
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    flex: 1,
    lineHeight: moderateScale(18),
  },
  signInButton: {
    marginTop: Theme.spacing.sm,
  },
});

export default LoginScreen;
