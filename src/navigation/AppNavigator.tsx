import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, Platform, StyleSheet, TouchableOpacity } from 'react-native';
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
import NotificationScreen from '../modules/notifications/screens/NotificationScreen';
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

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          paddingTop: moderateScale(10),
          paddingBottom: insets.bottom > 0 ? insets.bottom : moderateScale(12),
          paddingHorizontal: moderateScale(12),
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate({ name: route.name, merge: true });
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        let iconName = 'grid-outline';
        let customLabel = 'DASH';

        if (route.name === 'Attendance') {
          iconName = isFocused ? 'grid' : 'grid-outline';
          customLabel = 'DASH';
        } else if (route.name === 'Leave') {
          iconName = isFocused ? 'calendar' : 'calendar-outline';
          customLabel = 'LEAVE';
        } else if (route.name === 'Loans') {
          iconName = isFocused ? 'cash' : 'cash-outline';
          customLabel = 'LOAN';
        } else if (route.name === 'Profile') {
          iconName = isFocused ? 'person' : 'person-outline';
          customLabel = 'PROFILE';
        }

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[styles.tabItem, isFocused && styles.activeTabItem]}
            activeOpacity={0.8}
          >
            <Ionicons
              name={iconName as any}
              size={moderateScale(20)}
              color={isFocused ? Colors.primary : Colors.textMuted}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? Colors.primary : Colors.textMuted },
              ]}
            >
              {customLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const MainTabs = () => {
  return (
    <LiveLocationProvider>
      <Tab.Navigator
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen 
          name="Attendance" 
          component={AttendanceScreen} 
          options={{ 
            headerShown: true,
            title: 'Attendance',
            headerStyle: {
              backgroundColor: Colors.white,
            },
            headerTintColor: Colors.text,
            headerTitleStyle: {
              fontSize: moderateScale(18),
              fontWeight: '600' as const,
            },
          }} 
        />
        <Tab.Screen 
          name="Leave" 
          component={LeaveScreen} 
          options={{ 
            headerShown: true,
            title: 'Leave Balance',
            headerStyle: {
              backgroundColor: Colors.white,
            },
            headerTintColor: Colors.text,
            headerTitleStyle: {
              fontSize: moderateScale(18),
              fontWeight: '600' as const,
            },
          }} 
        />
        <Tab.Screen 
          name="Loans" 
          component={MyLoansScreen} 
          options={{ 
            headerShown: true,
            title: 'My Loans',
            headerStyle: {
              backgroundColor: Colors.white,
            },
            headerTintColor: Colors.text,
            headerTitleStyle: {
              fontSize: moderateScale(18),
              fontWeight: '600' as const,
            },
          }} 
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={{ 
            headerShown: true,
            title: 'Profile',
            headerStyle: {
              backgroundColor: Colors.white,
            },
            headerTintColor: Colors.text,
            headerTitleStyle: {
              fontSize: moderateScale(18),
              fontWeight: '600' as const,
            },
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
      <Stack.Navigator 
        initialRouteName="Splash" 
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.white,
          },
          headerTintColor: Colors.text,
          headerTitleStyle: {
            fontSize: moderateScale(18),
            fontWeight: '600' as const,
          },
        }}
      >
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="ForgotPassword" 
          component={ForgotPasswordScreen} 
          options={{ title: 'Forgot Password' }} 
        />
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabs} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="PersonalDetails" 
          component={PersonalDetailsScreen} 
          options={{ title: 'Personal Details' }} 
        />
        <Stack.Screen 
          name="MyAttendance" 
          component={MyAttendanceScreen} 
          options={{ title: 'My Attendance' }} 
        />
        <Stack.Screen 
          name="MyLeave" 
          component={MyLeaveScreen} 
          options={{ title: 'My Leave' }} 
        />
        <Stack.Screen 
          name="ApplyLeave" 
          component={ApplyLeaveScreen} 
          options={{ title: 'Apply for Leave' }} 
        />
        <Stack.Screen 
          name="AccountSettings" 
          component={AccountSettingsScreen} 
          options={{ title: 'Account Settings' }} 
        />
        <Stack.Screen 
          name="LeaveDetails" 
          component={LeaveDetailsScreen} 
          options={{ title: 'Leave Details' }} 
        />
        <Stack.Screen 
          name="MyPersonalWork" 
          component={MyPersonalWorkScreen} 
          options={{ title: 'Personal Work' }} 
        />
        <Stack.Screen 
          name="ApplyPersonalWork" 
          component={ApplyPersonalWorkScreen} 
          options={{ title: 'Apply Personal Work' }} 
        />
        <Stack.Screen 
          name="PersonalWorkDetails" 
          component={PersonalWorkDetailsScreen} 
          options={{ title: 'Request Details' }} 
        />
        <Stack.Screen 
          name="MyLoans" 
          component={MyLoansScreen} 
          options={{ title: 'My Loans' }} 
        />
        <Stack.Screen 
          name="ApplyLoan" 
          component={ApplyLoanScreen} 
          options={{ title: 'Apply for Loan' }} 
        />
        <Stack.Screen 
          name="LoanDetails" 
          component={LoanDetailsScreen} 
          options={{ title: 'Loan Details' }} 
        />
        <Stack.Screen 
          name="Notifications" 
          component={NotificationScreen} 
          options={{ title: 'Notifications' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(6),
    marginHorizontal: moderateScale(6),
    marginVertical: moderateScale(2),
    borderRadius: moderateScale(16),
  },
  activeTabItem: {
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
  },
  tabLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9),
    fontWeight: '700',
    marginTop: moderateScale(4),
    letterSpacing: 0.5,
  },
});

export default AppNavigator;
