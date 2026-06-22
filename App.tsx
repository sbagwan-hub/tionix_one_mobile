import Toast from 'react-native-toast-message';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import AppNavigator from './src/navigation/AppNavigator';
import ioniconsFont from './assets/fonts/ionicons.ttf';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from '@expo-google-fonts/outfit';
import { setSessionExpiredHandler } from './src/services/sessionManager';
import { clearAuthSession } from './src/modules/auth/services/auth';
import {
  registerBackgroundMessageHandler,
  requestUserPermission,
  getFCMToken,
  initFCMListeners,
} from './src/services/fcm.service';

// Register background message handler early at file level
registerBackgroundMessageHandler();

function App() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
  });

  useEffect(() => {
    if (Platform.OS === 'ios') {
      Font.loadAsync({ Ionicons: ioniconsFont }).catch(console.warn);
    }

    // Initialize FCM
    const setupFCM = async () => {
      const hasPermission = await requestUserPermission();
      if (hasPermission) {
        await getFCMToken();
      }
    };
    setupFCM();

    const unsubscribeFCM = initFCMListeners();

    // Register session expired handler
    setSessionExpiredHandler(async () => {
      await clearAuthSession();
      Toast.show({
        type: 'error',
        text1: 'Session Expired',
        text2: 'Please log in again to continue.',
        position: 'top',
        topOffset: 60,
      });
    });

    return () => {
      unsubscribeFCM();
    };
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
      <Toast />
    </SafeAreaProvider>
  );
}

export default App;

