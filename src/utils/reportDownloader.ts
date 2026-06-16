import { documentDirectory, downloadAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { API_BASE_URL } from '../config/api';
import Toast from 'react-native-toast-message';

export async function downloadReport(
  endpointPath: string,
  fileName: string,
  fkEmpId?: string | number
): Promise<void> {
  try {
    // 1. Prepare URL & Parameters
    const baseUrl = API_BASE_URL.replace(/\/$/, '');
    const queryParams = new URLSearchParams();
    if (fkEmpId !== undefined && fkEmpId !== null) {
      queryParams.append('fk_emp_id', String(fkEmpId));
    }
    const url = `${baseUrl}${endpointPath}?${queryParams.toString()}`;

    // 2. Retrieve Auth Token
    const token = await AsyncStorage.getItem('@attendance/access-token');
    const headers: Record<string, string> = {
      Accept: 'application/pdf',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // 3. Setup File Destination
    const destPath = `${documentDirectory}${fileName}`;

    Toast.show({
      type: 'info',
      text1: 'Downloading Report',
      text2: 'Preparing your PDF file...',
      position: 'top',
    });

    // 4. Execute Download
    const downloadRes = await downloadAsync(url, destPath, {
      headers,
    });

    if (downloadRes.status !== 200) {
      throw new Error(`Server responded with status ${downloadRes.status}`);
    }

    const localUri = downloadRes.uri;

    Toast.show({
      type: 'success',
      text1: 'Download Complete',
      text2: 'PDF prepared successfully.',
      position: 'top',
    });

    // 5. Open/Share File
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(localUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Open or Share ${fileName}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert(
        'Preview Failed',
        'Sharing is not available on this device.'
      );
    }
  } catch (error: any) {
    console.error('Download report error:', error);
    Toast.show({
      type: 'error',
      text1: 'Download Failed',
      text2: error.message || 'Unable to download report.',
      position: 'top',
    });
  }
}
