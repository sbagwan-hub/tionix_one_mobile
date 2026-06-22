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
import LeaveScreen from '../modules/leave-request/screens/LeaveScreen';
import SplashScreen from '../modules/auth/screens/SplashScreen';
import OnboardingScreen from '../modules/auth/screens/OnboardingScreen';
import PersonalDetailsScreen from '../modules/profile/screens/PersonalDetailsScreen';
import MyAttendanceScreen from '../modules/attendance/screens/MyAttendanceScreen';
import MyLeaveScreen from '../modules/leave-request/screens/MyLeaveScreen';
import LeaveDetailsScreen from '../modules/leave-request/screens/LeaveDetailsScreen';
import AccountSettingsScreen from '../modules/profile/screens/AccountSettingsScreen';
import ApplyLeaveScreen from '../modules/leave-request/screens/ApplyLeaveScreen';
import MyPersonalWorkScreen from '../modules/personal-work/screens/MyPersonalWorkScreen';
import ApplyPersonalWorkScreen from '../modules/personal-work/screens/ApplyPersonalWorkScreen';
import PersonalWorkDetailsScreen from '../modules/personal-work/screens/PersonalWorkDetailsScreen';
import ForgotPasswordScreen from '../modules/auth/screens/ForgotPasswordScreen';
import ForgotPasswordStep1 from '../modules/auth/screens/ForgotPasswordStep1';
import VerificationStep2 from '../modules/auth/screens/VerificationStep2';
import NewPasswordStep3 from '../modules/auth/screens/NewPasswordStep3';
import PasswordUpdatedSuccess from '../modules/auth/screens/PasswordUpdatedSuccess';
import MyLoansScreen from '../modules/loan-request/screens/MyLoansScreen';
import ApplyLoanScreen from '../modules/loan-request/screens/ApplyLoanScreen';
import LoanDetailsScreen from '../modules/loan-request/screens/LoanDetailsScreen';
import NotificationScreen from '../modules/notifications/screens/NotificationScreen';
import DailyTaskScreen from '../modules/daily-task/screens/DailyTaskScreen';
import AddDailyTaskScreen from '../modules/daily-task/screens/AddDailyTaskScreen';
import EditDailyTaskScreen from '../modules/daily-task/screens/EditDailyTaskScreen';
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
        } else if (route.name === 'DailyTask') {
          iconName = isFocused ? 'list' : 'list-outline';
          customLabel = 'TASK';
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
        <Tab.Screen name="Attendance" component={AttendanceScreen} />
        <Tab.Screen
          name="Leave"
          component={LeaveScreen}
          options={{
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="DailyTask"
          component={DailyTaskScreen}
          options={{
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            headerShown: false,
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
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="ForgotPasswordStep1" 
          component={ForgotPasswordStep1} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="VerificationStep2" 
          component={VerificationStep2} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="NewPasswordStep3" 
          component={NewPasswordStep3} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="PasswordUpdatedSuccess" 
          component={PasswordUpdatedSuccess} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabs} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="PersonalDetails" 
          component={PersonalDetailsScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="MyAttendance" 
          component={MyAttendanceScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen
          name="MyLeave"
          component={MyLeaveScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ApplyLeave"
          component={ApplyLeaveScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="AccountSettings" 
          component={AccountSettingsScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="LeaveDetails" 
          component={LeaveDetailsScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="MyPersonalWork" 
          component={MyPersonalWorkScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="ApplyPersonalWork" 
          component={ApplyPersonalWorkScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="PersonalWorkDetails" 
          component={PersonalWorkDetailsScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="MyLoans" 
          component={MyLoansScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen
          name="ApplyLoan"
          component={ApplyLoanScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="LoanDetails" 
          component={LoanDetailsScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="DailyTask"
          component={DailyTaskScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AddDailyTask"
          component={AddDailyTaskScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="EditDailyTask"
          component={EditDailyTaskScreen}
          options={{
            headerShown: false,
          }}
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
