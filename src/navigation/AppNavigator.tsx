import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from '../modules/auth/screens/LoginScreen';
import AttendanceScreen from '../modules/attendance/screens/AttendanceScreen';
import ProfileScreen from '../modules/profile/screens/ProfileScreen';
import LeaveScreen from '../modules/leave/screens/LeaveScreen';
import SplashScreen from '../modules/auth/screens/SplashScreen';
import OnboardingScreen from '../modules/auth/screens/OnboardingScreen';
import PersonalDetailsScreen from '../modules/profile/screens/PersonalDetailsScreen';
import MyAttendanceScreen from '../modules/attendance/screens/MyAttendanceScreen';
import MyLeaveScreen from '../modules/leave/screens/MyLeaveScreen';
import LeaveDetailsScreen from '../modules/leave/screens/LeaveDetailsScreen';
import AccountSettingsScreen from '../modules/profile/screens/AccountSettingsScreen';
import ApplyLeaveScreen from '../modules/leave/screens/ApplyLeaveScreen';
import MyPersonalWorkScreen from '../modules/personalWork/screens/MyPersonalWorkScreen';
import ApplyPersonalWorkScreen from '../modules/personalWork/screens/ApplyPersonalWorkScreen';
import PersonalWorkDetailsScreen from '../modules/personalWork/screens/PersonalWorkDetailsScreen';
import ForgotPasswordScreen from '../modules/auth/screens/ForgotPasswordScreen';
import MyLoansScreen from '../modules/loan/screens/MyLoansScreen';
import ApplyLoanScreen from '../modules/loan/screens/ApplyLoanScreen';
import LoanDetailsScreen from '../modules/loan/screens/LoanDetailsScreen';
import { LiveLocationProvider } from '../modules/attendance/context/LiveLocationContext';
import { clearAuthSession, getAuthSession } from '../modules/auth/services/auth';
import { setSessionExpiredHandler } from '../services/sessionManager';
import { navigationRef } from './navigationRef';
import Toast from 'react-native-toast-message';
import { Colors, Theme } from '../theme/colors';
import { Typography } from '../theme/typography';
import { moderateScale } from '../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <LiveLocationProvider>
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={moderateScale(22)}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Leave"
        component={LeaveScreen}
        options={{
          tabBarLabel: 'Leave',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={moderateScale(22)}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Loans"
        component={MyLoansScreen}
        options={{
          tabBarLabel: 'Loans',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'cash' : 'cash-outline'}
              size={moderateScale(22)}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={moderateScale(22)}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
    </LiveLocationProvider>
  );
};

const AppNavigator = () => {
  useEffect(() => {
    setSessionExpiredHandler(async () => {
      await clearAuthSession();
      Toast.show({
        type: 'info',
        text1: 'Session expired',
        text2: 'Please sign in again.',
        position: 'top',
        topOffset: 60,
      });
    });

    const checkSessionOnForeground = async (state: AppStateStatus) => {
      if (state !== 'active') {
        return;
      }

      await getAuthSession();
    };

    const subscription = AppState.addEventListener('change', checkSessionOnForeground);

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
        <Stack.Screen name="MyAttendance" component={MyAttendanceScreen} />
        <Stack.Screen name="MyLeave" component={MyLeaveScreen} />
        <Stack.Screen name="ApplyLeave" component={ApplyLeaveScreen} />
        <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
        <Stack.Screen name="LeaveDetails" component={LeaveDetailsScreen} />
        <Stack.Screen name="MyPersonalWork" component={MyPersonalWorkScreen} />
        <Stack.Screen name="ApplyPersonalWork" component={ApplyPersonalWorkScreen} />
        <Stack.Screen name="PersonalWorkDetails" component={PersonalWorkDetailsScreen} />
        <Stack.Screen name="MyLoans" component={MyLoansScreen} />
        <Stack.Screen name="ApplyLoan" component={ApplyLoanScreen} />
        <Stack.Screen name="LoanDetails" component={LoanDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    paddingTop: 8,
  },
  tabItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    ...Typography.label,
    fontSize: moderateScale(10),
    fontWeight: '700',
    marginTop: 4,
  },
});

export default AppNavigator;
