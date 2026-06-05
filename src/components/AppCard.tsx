import React, { ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, Theme } from '../theme/colors';

type AppCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  muted?: boolean;
};

const AppCard = ({ children, style, muted = false }: AppCardProps) => {
  return (
    <View
      style={[
        styles.card,
        muted && styles.muted,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Theme.spacing.md,
    ...Theme.shadow.card,
  },
  muted: {
    backgroundColor: Colors.surfaceMuted,
  },
});

export default AppCard;
