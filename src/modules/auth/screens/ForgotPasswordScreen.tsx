import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../../../theme/colors';

const ForgotPasswordScreen = ({ navigation }: any) => {
  useEffect(() => {
    // Navigate to the new step-by-step flow
    navigation.replace('ForgotPasswordStep1');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ForgotPasswordScreen;
