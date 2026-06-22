import messaging from '@react-native-firebase/messaging';
import { Platform, Alert } from 'react-native';
import { apiRequest } from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FCM_TOKEN_KEY = '@attendance/fcm-token';

/**
 * Requests user permission for push notifications (required on iOS and Android 13+)
 */
export const requestUserPermission = async (): Promise<boolean> => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log('[FCMService] Permission status:', authStatus);
    return enabled;
  } catch (error) {
    console.error('[FCMService] Permission request failed:', error);
    return false;
  }
};

/**
 * Retrieves the device's FCM token and registers it with the backend if it has changed
 */
export const getFCMToken = async (): Promise<string | null> => {
  try {
    // Check if token exists in Firebase
    const token = await messaging().getToken();
    if (!token) {
      console.log('[FCMService] No token returned from FCM.');
      return null;
    }

    console.log('[FCMService] Retrieved FCM Token:', token);

    // Save token locally and send to backend
    const savedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    if (savedToken !== token) {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      await registerTokenWithBackend(token);
    }

    return token;
  } catch (error) {
    console.error('[FCMService] Failed to get FCM token:', error);
    return null;
  }
};

/**
 * Sends the FCM token to the backend database
 */
export const registerTokenWithBackend = async (token: string) => {
  try {
    // Only upload token if we are logged in (i.e. access-token exists)
    const accessToken = await AsyncStorage.getItem('@attendance/access-token');
    if (!accessToken) {
      console.log('[FCMService] User is not logged in. Skipping token upload.');
      return;
    }

    await apiRequest('/api/users/device-token', {
      method: 'POST',
      body: {
        device_token: token,
        device_type: Platform.OS,
      },
      quiet: true, // Suppress alert popups on background syncs
    });
    console.log('[FCMService] FCM Token registered with backend successfully.');
  } catch (error) {
    console.error('[FCMService] Failed to register token with backend:', error);
  }
};

/**
 * Sets up listeners for incoming notifications in various app states
 */
export const initFCMListeners = () => {
  // 1. Foreground message handler
  const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
    console.log('[FCMService] Message received in foreground:', remoteMessage);
    Alert.alert(
      remoteMessage.notification?.title || 'Notification',
      remoteMessage.notification?.body || ''
    );
  });

  // 2. Token refresh handler
  const unsubscribeOnTokenRefresh = messaging().onTokenRefresh(async token => {
    console.log('[FCMService] FCM Token refreshed:', token);
    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    await registerTokenWithBackend(token);
  });

  // 3. Notification opened app from background state
  messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('[FCMService] Notification caused app to open from background state:', remoteMessage);
  });

  // 4. Notification opened app from completely closed (quit) state
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('[FCMService] Notification caused app to open from quit state:', remoteMessage);
      }
    });

  return () => {
    unsubscribeOnMessage();
    unsubscribeOnTokenRefresh();
  };
};

/**
 * Registers background handler for when the app is in background or quit state
 */
export const registerBackgroundMessageHandler = () => {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('[FCMService] Message handled in the background:', remoteMessage);
  });
};
