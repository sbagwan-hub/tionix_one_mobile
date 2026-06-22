import { createNavigationContainerRef } from '@react-navigation/native';
import { LeaveRequest } from '../modules/leave-request/services/leave';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
  PersonalDetails: undefined;
  MyAttendance: undefined;
  MyLeave: undefined;
  ApplyLeave: undefined;
  AccountSettings: undefined;
  LeaveDetails: { leaveItem: LeaveRequest };
  MyLoans: undefined;
  ApplyLoan: undefined;
  LoanDetails: { loanId: string };
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const resetToLogin = () => {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }
};
